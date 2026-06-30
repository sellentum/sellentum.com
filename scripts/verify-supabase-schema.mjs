import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const { Client } = pg;
const schemaCheckPath = "supabase/verification/production_schema_check.sql";

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
        return [key, value];
      }),
  );
}

const envFile = parseEnvFile(".env.local");
const connectionString = process.env.SUPABASE_DB_URL || envFile.SUPABASE_DB_URL || process.env.DATABASE_URL || envFile.DATABASE_URL;

if (!connectionString) {
  console.error("Missing SUPABASE_DB_URL or DATABASE_URL. Add it to .env.local before running this check.");
  process.exit(1);
}

const sql = readFileSync(resolve(schemaCheckPath), "utf8");
const client = new Client({
  connectionString,
  ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? undefined : { rejectUnauthorized: false },
});

try {
  await client.connect();
  const result = await client.query(sql);
  const rows = result.rows;
  const failing = rows.filter((row) => row.status !== "pass");
  const groups = rows.reduce((summary, row) => {
    summary[row.check_group] = (summary[row.check_group] || 0) + 1;
    return summary;
  }, {});

  console.log("Sellentum Supabase schema/RLS verification");
  console.log(`Checks: ${rows.length}`);
  console.log(`Groups: ${Object.entries(groups).map(([group, count]) => `${group}=${count}`).join(", ")}`);

  if (failing.length) {
    console.error(`Failures: ${failing.length}`);
    for (const row of failing.slice(0, 20)) {
      console.error(`- [${row.check_group}] ${row.check_name}: ${row.evidence}`);
      console.error(`  Fix: ${row.fix_hint}`);
    }
    process.exitCode = 1;
  } else {
    console.log("All schema/RLS checks passed.");
  }
} catch (error) {
  console.error(`Supabase schema verification failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
