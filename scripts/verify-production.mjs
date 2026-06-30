import { existsSync, readFileSync } from "node:fs";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split("=");
    return [key, rest.length ? rest.join("=") : "true"];
  }),
);

const flags = new Set(process.argv.slice(2).filter((arg) => !arg.includes("=")));

function loadEnvFile(pathname) {
  if (!existsSync(pathname)) return {};
  return Object.fromEntries(
    readFileSync(pathname, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const [key, ...rest] = line.split("=");
        const rawValue = rest.join("=").trim();
        return [key.trim(), rawValue.replace(/^['"]|['"]$/g, "")];
      }),
  );
}

const envFile = loadEnvFile(".env.local");
const env = { ...envFile, ...process.env };

const baseUrl = String(args.get("--base-url") || env.NEXT_PUBLIC_APP_URL || "https://sellentum.com").replace(/\/$/, "");
const skipPublicRoutes = flags.has("--skip-public-routes");
const skipSupabase = flags.has("--skip-supabase");
const probeRateLimit = flags.has("--probe-rate-limit");

const results = [];

function record(group, name, status, evidence, nextStep = "") {
  results.push({ group, name, status, evidence, nextStep });
}

function hasEnv(name) {
  return Boolean(String(env[name] || "").trim());
}

function redacted(value) {
  if (!value) return "missing";
  return "set";
}

function safeUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

async function fetchText(pathname, expectedText) {
  const url = `${baseUrl}${pathname}`;
  try {
    const response = await fetch(url, { redirect: "follow" });
    const text = await response.text();
    const ok = response.status >= 200 && response.status < 300;
    const includes = expectedText ? text.includes(expectedText) : true;
    record(
      "public_route",
      pathname,
      ok && includes ? "pass" : "fail",
      ok ? `HTTP ${response.status}${expectedText ? `, expected text ${includes ? "found" : "missing"}` : ""}` : `HTTP ${response.status}`,
      includes ? "" : `Open ${url} and confirm it renders the expected production page.`,
    );
  } catch (error) {
    record("public_route", pathname, "fail", error.message, `Check whether ${baseUrl} is deployed and reachable.`);
  }
}

function verifyEnvironment() {
  const appUrl = safeUrl(baseUrl);
  record("env", "NEXT_PUBLIC_APP_URL/base URL", appUrl ? "pass" : "fail", appUrl ? baseUrl : "invalid URL", "Set NEXT_PUBLIC_APP_URL to https://sellentum.com in production.");

  for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
    record("env", name, hasEnv(name) ? "pass" : "fail", redacted(env[name]), `Add ${name} to Vercel and .env.local.`);
  }

  record("env", "OPENAI_API_KEY", hasEnv("OPENAI_API_KEY") ? "pass" : "warn", hasEnv("OPENAI_API_KEY") ? redacted(env.OPENAI_API_KEY) : "missing", "Add OPENAI_API_KEY before testing production AI explanations.");
  record("env", "OPENAI_MODEL", hasEnv("OPENAI_MODEL") ? "pass" : "warn", env.OPENAI_MODEL || "missing; app defaults are available", "Set OPENAI_MODEL only if you want to override the app default.");

  if (env.NEXT_PUBLIC_SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_ROLE_KEY && env.NEXT_PUBLIC_SUPABASE_ANON_KEY === env.SUPABASE_SERVICE_ROLE_KEY) {
    record("env", "Supabase key separation", "fail", "anon key and service-role key match", "Replace SUPABASE_SERVICE_ROLE_KEY with the real service_role key. Never expose it with NEXT_PUBLIC_.");
  } else {
    record("env", "Supabase key separation", "pass", "public anon and server service-role keys are separate");
  }
}

const requiredSupabaseTables = {
  profiles: ["id", "full_name", "company_name", "created_at", "updated_at"],
  products: ["id", "user_id", "name", "price", "image_url", "category", "description", "features", "tags", "product_url", "active", "buyer_needs", "search_text", "enrichment_status", "embedding"],
  quizzes: ["id", "user_id", "name", "slug", "welcome_title", "welcome_message", "published", "recommendation_overrides"],
  questions: ["id", "quiz_id", "user_id", "title", "helper_text", "position"],
  answer_options: ["id", "question_id", "user_id", "label", "match_type", "match_value", "weight", "next_question_id", "position"],
  recommendation_rules: ["id", "user_id", "quiz_id", "answer_option_id", "rule_type", "operator", "value", "weight"],
  configurators: ["id", "user_id", "name", "slug", "title", "subtitle", "base_price", "published"],
  configurator_steps: ["id", "configurator_id", "user_id", "title", "selection_type", "required", "position"],
  configurator_options: ["id", "step_id", "user_id", "label", "price_delta", "product_id", "tags", "incompatible_option_ids", "position"],
  analytics_events: ["id", "user_id", "quiz_id", "product_id", "event_type", "metadata", "created_at"],
  widget_settings: ["user_id", "brand_name", "primary_color", "button_text", "widget_title", "welcome_message", "launcher_position", "allowed_domains"],
  rate_limit_buckets: ["key_hash", "request_count", "reset_at", "updated_at"],
};

async function supabaseRequest(pathname, { key, method = "GET", body } = {}) {
  const supabaseUrl = String(env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const response = await fetch(`${supabaseUrl}${pathname}`, {
    method,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  return { response, text };
}

async function verifySupabaseRest() {
  if (skipSupabase) {
    record("supabase", "REST table probe", "warn", "skipped by --skip-supabase");
    return;
  }

  if (!hasEnv("NEXT_PUBLIC_SUPABASE_URL") || !hasEnv("SUPABASE_SERVICE_ROLE_KEY")) {
    record("supabase", "REST table probe", "fail", "missing Supabase URL or service-role key", "Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this check.");
    return;
  }

  for (const [table, columns] of Object.entries(requiredSupabaseTables)) {
    const select = encodeURIComponent(columns.join(","));
    try {
      const { response, text } = await supabaseRequest(`/rest/v1/${table}?select=${select}&limit=0`, { key: env.SUPABASE_SERVICE_ROLE_KEY });
      record(
        "supabase_table",
        table,
        response.ok ? "pass" : "fail",
        response.ok ? `${columns.length} required columns reachable via service role` : `HTTP ${response.status}: ${text.slice(0, 220)}`,
        response.ok ? "" : `Apply the missing migration or rerun supabase/schema.sql for ${table}.`,
      );
    } catch (error) {
      record("supabase_table", table, "fail", error.message, "Check the Supabase project URL and service-role key.");
    }
  }

  if (probeRateLimit) {
    try {
      const { response, text } = await supabaseRequest("/rest/v1/rpc/check_rate_limit", {
        key: env.SUPABASE_SERVICE_ROLE_KEY,
        method: "POST",
        body: {
          bucket_key: "sellentum-production-verification-cli-probe",
          max_requests: 3,
          window_seconds: 60,
        },
      });
      record(
        "supabase_rpc",
        "check_rate_limit",
        response.ok && text.includes("allowed") ? "pass" : "fail",
        response.ok ? "RPC responded to service-role probe" : `HTTP ${response.status}: ${text.slice(0, 220)}`,
        response.ok ? "" : "Apply supabase/migrations/009_shared_rate_limits.sql.",
      );
    } catch (error) {
      record("supabase_rpc", "check_rate_limit", "fail", error.message, "Check the check_rate_limit RPC migration.");
    }
  } else {
    record("supabase_rpc", "check_rate_limit runtime probe", "warn", "not run; pass --probe-rate-limit to perform one harmless bucket write", "Run supabase/verification/rate_limit_runtime_probe.sql or rerun this command with --probe-rate-limit.");
  }

  record("supabase_sql", "RLS/function grants", "warn", "REST cannot prove RLS policies, extension state, or exact function grants", "Run supabase/verification/production_schema_check.sql in the Supabase SQL editor and confirm every row is pass.");
}

async function verifyPublicRoutes() {
  if (skipPublicRoutes) {
    record("public_route", "live route checks", "warn", "skipped by --skip-public-routes");
    return;
  }

  const checks = [
    ["/", "Turn product choice"],
    ["/login", "Good to see you again"],
    ["/signup", "Make choosing feel easy"],
    ["/contact", "Talk to Sellentum"],
    ["/support", "Get from catalog to launch"],
    ["/security", "Rules, data and AI boundaries"],
    ["/privacy", "How Sellentum handles product"],
    ["/terms", "A practical usage boundary"],
    ["/api/widget.js", "data-experience"],
  ];

  for (const [pathname, expectedText] of checks) {
    await fetchText(pathname, expectedText);
  }
}

function printResults() {
  const icon = { pass: "✓", warn: "!", fail: "✕" };
  const order = { fail: 0, warn: 1, pass: 2 };
  const sorted = [...results].sort((a, b) => order[a.status] - order[b.status] || a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
  console.log(`Sellentum production verification`);
  console.log(`Base URL: ${baseUrl}`);
  console.log("");
  for (const result of sorted) {
    console.log(`${icon[result.status]} [${result.status.toUpperCase()}] ${result.group} / ${result.name}`);
    console.log(`  Evidence: ${result.evidence}`);
    if (result.nextStep) console.log(`  Next: ${result.nextStep}`);
  }
  console.log("");
  const summary = results.reduce((acc, result) => ({ ...acc, [result.status]: (acc[result.status] || 0) + 1 }), {});
  console.log(`Summary: ${summary.pass || 0} pass, ${summary.warn || 0} warn, ${summary.fail || 0} fail`);
  if (summary.fail) process.exitCode = 1;
}

async function main() {
  verifyEnvironment();
  await verifyPublicRoutes();
  await verifySupabaseRest();
  printResults();
}

main().catch((error) => {
  console.error(`Sellentum production verification failed unexpectedly: ${error.message}`);
  process.exit(1);
});
