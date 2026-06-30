import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const { Client } = pg;
const repairPaths = [
  "supabase/verification/production_repair_widget_rate_limits.sql",
  "supabase/migrations/007_transactional_experience_saves.sql",
];
const grantHardeningSql = `
revoke all on function public.check_rate_limit(text, integer, integer) from public;
revoke all on function public.check_rate_limit(text, integer, integer) from anon;
revoke all on function public.check_rate_limit(text, integer, integer) from authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
notify pgrst, 'reload schema';
`;
const envPath = ".env.local";
const confirmed = process.argv.includes("--yes");

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

function redactedHost(connectionString) {
  try {
    const url = new URL(connectionString);
    return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}/${url.pathname.replace(/^\/+/, "")}`;
  } catch {
    return "configured database";
  }
}

if (!confirmed) {
  console.error("Refusing to apply production SQL without --yes.");
  console.error("Run: npm run repair:supabase -- --yes");
  process.exit(1);
}

const envFile = parseEnvFile(envPath);
const connectionString = process.env.SUPABASE_DB_URL || envFile.SUPABASE_DB_URL || process.env.DATABASE_URL || envFile.DATABASE_URL;

if (!connectionString) {
  console.error("Missing SUPABASE_DB_URL or DATABASE_URL. Add it to .env.local before running this repair.");
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? undefined : { rejectUnauthorized: false },
});

try {
  console.log(`Applying Sellentum Supabase repair to ${redactedHost(connectionString)}.`);
  await client.connect();
  for (const path of repairPaths) {
    console.log(`Applying ${path}.`);
    await client.query(readFileSync(resolve(path), "utf8"));
  }
  console.log("Hardening function grants.");
  await client.query(grantHardeningSql);
  console.log("Supabase repair applied. Rerun production verification after PostgREST refreshes its schema cache.");
} catch (error) {
  console.error(`Supabase repair failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
