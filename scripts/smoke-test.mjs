import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const compileDir = "/tmp/findly-smoke-compiled";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function get(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, { redirect: "manual" });
  const text = await response.text();
  return { response, text };
}

async function assertPage(pathname, expectedText, status = 200) {
  const { response, text } = await get(pathname);
  assert(response.status === status, `${pathname} returned ${response.status}, expected ${status}`);
  if (expectedText) assert(text.includes(expectedText), `${pathname} did not include "${expectedText}"`);
  return text;
}

async function assertWidgetScript() {
  const { response, text } = await get("/api/widget.js");
  assert(response.status === 200, `/api/widget.js returned ${response.status}`);
  for (const token of ["data-experience", "data-mode", "data-id", "assistant", "configurator", "finder", "inline", "ensureFrame"]) {
    assert(text.includes(token), `/api/widget.js missing ${token}`);
  }
  assert(text.indexOf("function open(){ensureFrame()") > text.indexOf("function ensureFrame()"), "Modal widget should lazy-load the iframe only when opened");
}

function assertPublishedAdvisorRuntime() {
  const route = readFileSync("app/api/public/assistant/[id]/route.ts", "utf8");
  const engine = readFileSync("lib/assistant-engine.ts", "utf8");
  const candidates = readFileSync("lib/semantic-candidates.ts", "utf8");
  const page = readFileSync("app/assistant/[id]/page.tsx", "utf8");
  assert(route.includes("runAdvisorSearch"), "Published advisor route should use the shared advisor engine");
  assert(route.includes("getSemanticProductCandidates"), "Published advisor route should try pgvector semantic candidates");
  assert(route.includes("catalog_scan"), "Published advisor route should fall back to catalog scanning");
  assert(engine.includes("semanticScoresByProductId"), "Advisor engine should accept externally retrieved semantic scores");
  assert(candidates.includes("match_products"), "Semantic candidate helper should call the Supabase match_products RPC");
  assert(route.includes("eq(\"published\", true)"), "Published advisor route should validate published experiences");
  assert(page.includes("/api/public/assistant/"), "Assistant page should call the published advisor runtime outside demo mode");
  assert(engine.includes("status: \"clarifying\""), "Advisor engine should be able to ask clarifying questions before recommending");
  assert(engine.includes("buildAdvisorIntentText"), "Advisor engine should combine prior shopper messages with the latest clarification");
  assert(page.includes("clarifyingOptions"), "Assistant page should render clarifying quick replies");
  assert(page.includes("advisor_status"), "Assistant analytics should distinguish completed recommendation searches from clarification turns");
}

function assertPublishedFinderRuntime() {
  const route = readFileSync("app/api/public/finder/[id]/route.ts", "utf8");
  const page = readFileSync("app/finder/[id]/page.tsx", "utf8");
  assert(route.includes("runFinderRecommendations"), "Published finder route should use the server-side finder engine");
  assert(route.includes("selectedAnswersFromQuiz"), "Published finder route should reconstruct answers from stored option rules");
  assert(route.includes("products: []"), "Published finder GET should avoid exposing the full product catalog");
  assert(route.includes("recommendation_overrides: []"), "Published finder GET should strip merchant override details from the shopper payload");
  assert(route.includes("overrides: quiz.recommendation_overrides"), "Published finder POST should apply stored merchandising overrides server-side");
  assert(route.includes("getSemanticProductCandidates"), "Published finder POST should try pgvector buyer-profile retrieval when available");
  assert(route.includes("buildFinderBuyerProfile"), "Published finder POST should build a semantic buyer profile from selected answers");
  assert(route.includes("semanticScoresByProductId"), "Published finder recommendations should receive semantic scores as deterministic ranking signals");
  assert(page.includes("/api/public/finder/"), "Finder page should call the published finder runtime outside demo mode");
  assert(page.includes("compareFinderRecommendations"), "Finder page should generate deterministic comparison rows for recommended products");
  assert(page.includes("Compare your matches"), "Finder page should show a side-by-side recommendation comparison");
}

function assertPublishedConfiguratorRuntime() {
  const route = readFileSync("app/api/public/configurator/[id]/route.ts", "utf8");
  const page = readFileSync("app/configurator/[id]/page.tsx", "utf8");
  assert(route.includes("validateConfiguratorSelection"), "Published configurator route should validate bundles server-side");
  assert(route.includes("selectedIds"), "Published configurator route should accept selected option IDs");
  assert(page.includes("/api/public/configurator/"), "Configurator page should call the published configurator runtime outside demo mode");
  assert(page.includes("server_validated"), "Configurator analytics should mark server-validated bundles");
}

function assertSessionAnalytics() {
  const session = readFileSync("lib/session.ts", "utf8");
  const analytics = readFileSync("app/dashboard/analytics/page.tsx", "utf8");
  const analyticsHelpers = readFileSync("lib/analytics.ts", "utf8");
  for (const file of ["app/finder/[id]/page.tsx", "app/assistant/[id]/page.tsx", "app/configurator/[id]/page.tsx"]) {
    assert(readFileSync(file, "utf8").includes("getSessionMetadata"), `${file} should attach anonymous session metadata to analytics events`);
  }
  assert(session.includes("findly_anonymous_session"), "Session helper should persist anonymous shopper sessions");
  assert(analytics.includes("buildAnalyticsSnapshot"), "Analytics dashboard should group events into session-aware snapshots");
  assert(analyticsHelpers.includes("buildAnalyticsTrends"), "Analytics helpers should calculate real period-over-period trends");
  assert(analytics.includes("funnelDiagnosis"), "Analytics dashboard should surface a deterministic funnel diagnosis");
  assert(!analytics.includes("percentChangePlaceholder"), "Analytics dashboard should not display placeholder trend percentages");
}

function assertLaunchStudioWorkflow() {
  const page = readFileSync("app/dashboard/launch/page.tsx", "utf8");
  const settings = readFileSync("app/dashboard/settings/page.tsx", "utf8");
  const shell = readFileSync("components/dashboard-shell.tsx", "utf8");
  const overview = readFileSync("app/dashboard/page.tsx", "utf8");
  assert(page.includes("/api/catalog/enrich"), "Launch Studio should call catalog enrichment");
  assert(page.includes("/api/quizzes/generate"), "Launch Studio should call AI quiz generation");
  assert(page.includes("quiz.published = true"), "Launch Studio should publish the generated finder");
  assert(page.includes("data-experience=\"finder\""), "Launch Studio should produce a finder widget snippet");
  assert(page.includes("data-mode=\"modal\""), "Launch Studio should produce a lazy modal widget snippet");
  assert(settings.includes("Embed mode"), "Settings should let merchants choose modal or inline embed mode");
  assert(settings.includes("data-mode=\"${embedMode}\""), "Settings widget snippet should include the selected embed mode");
  assert(page.includes("/dashboard/preflight"), "Launch Studio should link to production preflight");
  assert(shell.includes("/dashboard/launch"), "Dashboard navigation should expose Launch Studio");
  assert(overview.includes("/dashboard/launch"), "Dashboard overview should route quick-start work through Launch Studio");
}

function assertCatalogImportWorkflow() {
  const page = readFileSync("app/dashboard/products/page.tsx", "utf8");
  const importer = readFileSync("lib/catalog-import.ts", "utf8");
  assert(page.includes("normalizeCatalogImportRows"), "Product CSV import should use the shared catalog import normalizer");
  assert(page.includes("Fix required"), "Product CSV import should expose invalid row feedback before import");
  assert(importer.includes("headerAliases"), "Catalog import normalizer should support flexible CSV header aliases");
  assert(importer.includes("Possible duplicate name/category"), "Catalog import normalizer should warn about duplicate rows");
}

async function assertDeterministicLogic() {
  if (existsSync(compileDir)) rmSync(compileDir, { recursive: true, force: true });
  execFileSync("./node_modules/.bin/tsc", ["-p", "tsconfig.json", "--outDir", compileDir, "--noEmit", "false", "--declaration", "false", "--emitDeclarationOnly", "false"], { stdio: "ignore" });

  const demo = await import(pathToFileURL(`${compileDir}/lib/demo-data.js`));
  const utils = await import(pathToFileURL(`${compileDir}/lib/utils.js`));
  const analytics = await import(pathToFileURL(`${compileDir}/lib/analytics.js`));
  const catalogImport = await import(pathToFileURL(`${compileDir}/lib/catalog-import.js`));

  const answers = [
    { questionId: "q_use", question: "Where?", optionId: "o_trail", answer: "Trails & outdoors", matchType: "tag", matchValue: "trail", weight: 5 },
    { questionId: "q_feel", question: "Feel?", optionId: "o_soft", answer: "Soft cushioning", matchType: "feature", matchValue: "High cushioning", weight: 3 },
    { questionId: "q_budget", question: "Budget?", optionId: "o_140", answer: "Up to £140", matchType: "budget_max", matchValue: "140", weight: 5 },
  ];
  const recommendations = utils.recommendProducts(demo.demoProducts, answers, 3);
  assert(recommendations[0]?.product.id === "prod_trail", `Expected Terra Trail Runner first, got ${recommendations[0]?.product.name || "nothing"}`);
  const comparison = utils.compareFinderRecommendations(recommendations);
  assert(comparison.length === recommendations.length, "Expected comparison rows for each recommendation");
  assert(comparison[0]?.productId === recommendations[0]?.product.id, "Expected comparison rows to preserve recommendation order");
  assert(comparison.every((row) => row.bestFor && row.standout && row.tradeoff && row.proofPoints.length), "Expected comparison rows to expose shopper-facing decision support");
  const audits = utils.auditProductMatches(demo.demoProducts, answers);
  assert(audits[0]?.product.id === "prod_trail" && audits[0].eligible, "Expected recommendation audit to rank Terra Trail Runner first and eligible");
  assert(audits.some((audit) => audit.product.id === "prod_speed" && !audit.eligible), "Expected audit to show over-budget products as blocked");
  const intentOnlyAnswers = [
    { questionId: "q_freeform", question: "Describe the usage", optionId: "o_intent", answer: "Waterproof hiking comfort for outdoors", matchType: "none", matchValue: "", weight: 1 },
  ];
  const intentMatches = utils.recommendProducts(demo.demoProducts, intentOnlyAnswers, 3);
  assert(intentMatches[0]?.product.id === "prod_trail", `Expected buyer-profile matching to rank Terra Trail Runner first, got ${intentMatches[0]?.product.name || "nothing"}`);
  const intentAudit = utils.auditProductMatches(demo.demoProducts, intentOnlyAnswers);
  assert(intentAudit[0]?.signals.some((signal) => signal.source === "buyer_profile" && signal.contribution > 0), "Expected audits to expose buyer-profile intent signals");
  const pinned = utils.recommendProducts(demo.demoProducts, answers, 3, [{ id: "override_pin_city", product_id: "prod_city", action: "pin", weight: 5, note: "Smoke-test pin" }]);
  assert(pinned[0]?.product.id === "prod_city", "Expected a pinned in-budget product to rank first");
  const excluded = utils.recommendProducts(demo.demoProducts, answers, 3, [{ id: "override_exclude_trail", product_id: "prod_trail", action: "exclude", weight: 0, note: "Smoke-test exclusion" }]);
  assert(excluded.every((match) => match.product.id !== "prod_trail"), "Expected an excluded product to be removed from recommendations");
  const overrideAudit = utils.auditProductMatches(demo.demoProducts, answers, [{ id: "override_boost_cloud", product_id: "prod_cloud", action: "boost", weight: 10, note: "Comfort campaign" }]);
  assert(overrideAudit.some((audit) => audit.product.id === "prod_cloud" && audit.signals.some((signal) => signal.note.includes("Comfort campaign"))), "Expected override audits to expose merchandising signals");

  let selected = [];
  selected = utils.updateConfiguratorSelection(demo.demoConfigurator, selected, "config_step_base", "config_opt_terra");
  selected = utils.updateConfiguratorSelection(demo.demoConfigurator, selected, "config_step_conditions", "config_opt_mud");
  selected = utils.updateConfiguratorSelection(demo.demoConfigurator, selected, "config_step_comfort", "config_opt_max_cushion");
  selected = utils.updateConfiguratorSelection(demo.demoConfigurator, selected, "config_step_addons", "config_opt_care");

  const cloud = demo.demoConfigurator.steps[0].options.find((option) => option.id === "config_opt_cloud");
  assert(utils.getConfiguratorTotal(demo.demoConfigurator, selected) === 166, "Expected configured trail kit total to be £166");
  assert(utils.getConfiguratorProgress(demo.demoConfigurator, selected) === 100, "Expected configured trail kit progress to be 100%");
  assert(utils.optionConflictsWithSelection(cloud, selected, demo.demoConfigurator), "Expected Cloud Rest to conflict with wet/mud trail selection");

  const eventTypes = [
    { quiz_id: "quiz_footwear", metadata: { experience_type: "assistant" } },
    { quiz_id: "config_trail_kit", metadata: {} },
    { quiz_id: "quiz_footwear", metadata: {} },
  ].map((event) => utils.getEventExperienceType(event));
  assert(eventTypes.join(",") === "assistant,configurator,finder", `Unexpected event type inference: ${eventTypes.join(",")}`);
  assert(demo.demoEvents.some((event) => Array.isArray(event.metadata?.answers) && event.metadata.answers.length), "Expected seeded finder analytics to include answer metadata");
  assert(demo.demoEvents.some((event) => event.metadata?.experience_type === "assistant" && typeof event.metadata.query === "string"), "Expected seeded advisor analytics to include shopper query metadata");
  assert(demo.demoEvents.some((event) => Array.isArray(event.metadata?.selected_option_names) && event.metadata.selected_option_names.length), "Expected seeded configurator analytics to include selected option names");
  assert(demo.demoEvents.some((event) => typeof event.metadata?.session_id === "string"), "Expected seeded analytics to include anonymous session metadata");

  const now = new Date("2026-06-25T12:00:00Z");
  const analyticsEvents = [
    { id: "a1", user_id: "demo-user", quiz_id: "quiz_footwear", event_type: "widget_view", metadata: { session_id: "s1" }, created_at: "2026-06-25T10:00:00Z" },
    { id: "a2", user_id: "demo-user", quiz_id: "quiz_footwear", event_type: "quiz_start", metadata: { session_id: "s1" }, created_at: "2026-06-25T10:01:00Z" },
    { id: "a3", user_id: "demo-user", quiz_id: "quiz_footwear", event_type: "quiz_complete", metadata: { session_id: "s1" }, created_at: "2026-06-25T10:03:00Z" },
    { id: "a4", user_id: "demo-user", quiz_id: "quiz_footwear", event_type: "widget_view", metadata: { session_id: "s2" }, created_at: "2026-06-18T10:00:00Z" },
  ];
  const periods = analytics.getAnalyticsPeriods(analyticsEvents, 7, now);
  const trends = analytics.buildAnalyticsTrends(periods.current, periods.previous);
  assert(periods.current.length === 3 && periods.previous.length === 1, "Expected analytics periods to split current and previous windows");
  assert(trends.widget_view.current === 1 && trends.widget_view.previous === 1 && trends.quiz_complete.label === "New", "Expected analytics trends to use real previous-period values");
  const diagnosis = analytics.buildFunnelDiagnosis(analytics.buildAnalyticsSnapshot(periods.current));
  assert(diagnosis.title && diagnosis.recommendation, "Expected funnel diagnosis to produce merchant guidance");

  const importPreview = catalogImport.normalizeCatalogImportRows([
    { title: "Trail Shoe", "sale price": "£1,299.50", collection: "Footwear", attributes: "Grip|Waterproof", keywords: "trail,wet", link: "store.example/trail" },
    { name: "", price: "not-a-price", category: "" },
    { title: "Trail Shoe", "sale price": "99", collection: "Footwear" },
  ]);
  assert(importPreview.summary.valid === 2 && importPreview.summary.invalid === 1, "Expected CSV import normalizer to separate valid and invalid rows");
  assert(importPreview.products[0].price === 1299.5 && importPreview.products[0].product_url === "https://store.example/trail", "Expected CSV import normalizer to clean aliased price and URL fields");
  assert(importPreview.rows.some((row) => row.warnings.some((warning) => warning.includes("duplicate"))), "Expected CSV import normalizer to warn about duplicate product rows");

}

async function main() {
  await assertPage("/", "Turn product choice");
  await assertPage("/platform", "Findly platform");
  await assertPage("/platform/configurators", "Visual configurators");
  await assertPage("/industries", "Industries");
  await assertPage("/resources", "Demo the product discovery loop");
  await assertPage("/finder/quiz_footwear", "Preparing your product guide");
  await assertPage("/assistant/quiz_footwear", "Preparing your product advisor");
  await assertPage("/configurator/config_trail_kit", "Loading configurator");
  await assertPage("/api/preflight", "Authentication required", 401);
  await assertWidgetScript();
  assertPublishedAdvisorRuntime();
  assertPublishedFinderRuntime();
  assertPublishedConfiguratorRuntime();
  assertSessionAnalytics();
  assertLaunchStudioWorkflow();
  assertCatalogImportWorkflow();
  await assertDeterministicLogic();
  console.log("Findly smoke test passed");
}

main().catch((error) => {
  console.error(`Findly smoke test failed: ${error.message}`);
  process.exit(1);
});
