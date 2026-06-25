import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
  for (const token of ["data-experience", "data-mode", "data-id", "assistant", "configurator", "finder", "search", "inline", "ensureFrame"]) {
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
  const builder = readFileSync("app/dashboard/quizzes/page.tsx", "utf8");
  const lab = readFileSync("app/dashboard/lab/page.tsx", "utf8");
  const readiness = readFileSync("lib/quiz-readiness.ts", "utf8");
  const flow = readFileSync("lib/finder-flow.ts", "utf8");
  const schema = readFileSync("supabase/schema.sql", "utf8");
  assert(route.includes("runFinderRecommendations"), "Published finder route should use the server-side finder engine");
  assert(route.includes("resolveFinderAnswerPath"), "Published finder route should reconstruct the valid branched answer path from stored option rules");
  assert(route.includes("products: []"), "Published finder GET should avoid exposing the full product catalog");
  assert(route.includes("recommendation_overrides: []"), "Published finder GET should strip merchant override details from the shopper payload");
  assert(route.includes("overrides: quiz.recommendation_overrides"), "Published finder POST should apply stored merchandising overrides server-side");
  assert(route.includes("getSemanticProductCandidates"), "Published finder POST should try pgvector buyer-profile retrieval when available");
  assert(route.includes("buildFinderBuyerProfile"), "Published finder POST should build a semantic buyer profile from selected answers");
  assert(route.includes("semanticScoresByProductId"), "Published finder recommendations should receive semantic scores as deterministic ranking signals");
  assert(route.includes("question_path"), "Published finder recommendations should report the validated branched question path");
  assert(page.includes("/api/public/finder/"), "Finder page should call the published finder runtime outside demo mode");
  assert(page.includes("getNextFinderQuestionIndex"), "Finder page should follow conditional answer routing in the customer experience");
  assert(page.includes("visitedStepIndexes"), "Finder page should keep back navigation aligned to the shopper's actual branch path");
  assert(page.includes("compareFinderRecommendations"), "Finder page should generate deterministic comparison rows for recommended products");
  assert(page.includes("Compare your matches"), "Finder page should show a side-by-side recommendation comparison");
  assert(builder.includes("Then show"), "Finder builder should expose answer-level branching controls");
  assert(builder.includes("Branching tip"), "Finder builder should explain conditional routing");
  assert(lab.includes("buildFinderQuestionPath"), "Recommendation lab should simulate the same conditional finder path as shoppers");
  assert(lab.includes("Skipped by this branch"), "Recommendation lab should expose questions skipped by the current branch");
  assert(readiness.includes("Conditional routing"), "Quiz readiness should validate conditional finder routes");
  assert(flow.includes("resolveFinderAnswerPath"), "Finder flow helper should expose deterministic answer-path resolution");
  assert(flow.includes("defaultFinderSelections"), "Finder flow helper should expose branch-aware default selections for merchant testing");
  assert(schema.includes("next_question_id"), "Database schema should persist answer-level branch targets");
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
  const insights = readFileSync("lib/insights.ts", "utf8");
  for (const file of ["app/finder/[id]/page.tsx", "app/assistant/[id]/page.tsx", "app/configurator/[id]/page.tsx", "app/search/[id]/page.tsx"]) {
    assert(readFileSync(file, "utf8").includes("getSessionMetadata"), `${file} should attach anonymous session metadata to analytics events`);
  }
  assert(session.includes("findly_anonymous_session"), "Session helper should persist anonymous shopper sessions");
  assert(analytics.includes("buildAnalyticsSnapshot"), "Analytics dashboard should group events into session-aware snapshots");
  assert(analyticsHelpers.includes("buildAnalyticsTrends"), "Analytics helpers should calculate real period-over-period trends");
  assert(analytics.includes("funnelDiagnosis"), "Analytics dashboard should surface a deterministic funnel diagnosis");
  assert(analytics.includes("buildZeroPartyInsights"), "Analytics dashboard should use shared zero-party insight intelligence");
  assert(analytics.includes("Zero-party intent hub"), "Analytics dashboard should expose a zero-party intent hub");
  assert(analytics.includes("Intent opportunities"), "Analytics dashboard should surface deterministic intent opportunities");
  assert(insights.includes("buildZeroPartyInsights"), "Insight helper should expose a reusable zero-party report builder");
  assert(insights.includes("ProductDemandInsight"), "Insight helper should calculate product demand from recommendations and clicks");
  assert(!analytics.includes("percentChangePlaceholder"), "Analytics dashboard should not display placeholder trend percentages");
}

function assertLaunchStudioWorkflow() {
  const page = readFileSync("app/dashboard/launch/page.tsx", "utf8");
  const generator = readFileSync("app/api/quizzes/generate/route.ts", "utf8");
  const quizGeneration = readFileSync("lib/quiz-generation.ts", "utf8");
  const settings = readFileSync("app/dashboard/settings/page.tsx", "utf8");
  const shell = readFileSync("components/dashboard-shell.tsx", "utf8");
  const overview = readFileSync("app/dashboard/page.tsx", "utf8");
  assert(page.includes("/api/catalog/enrich"), "Launch Studio should call catalog enrichment");
  assert(page.includes("/api/quizzes/generate"), "Launch Studio should call AI quiz generation");
  assert(page.includes("catalog ontology engine"), "Launch Studio should report ontology-guided generation source");
  assert(generator.includes("buildQuizGenerationOntologySummary"), "Quiz generation route should pass ontology context to OpenAI");
  assert(generator.includes("buildOntologyQuizSuggestion"), "Quiz generation route should use ontology-guided deterministic fallback");
  assert(quizGeneration.includes("buildCatalogOntology"), "Quiz generation helper should derive questions from the catalog ontology");
  assert(page.includes("quiz.published = true"), "Launch Studio should publish the generated finder");
  assert(page.includes("data-experience=\"finder\""), "Launch Studio should produce a finder widget snippet");
  assert(page.includes("data-mode=\"modal\""), "Launch Studio should produce a lazy modal widget snippet");
  assert(settings.includes("Embed mode"), "Settings should let merchants choose modal or inline embed mode");
  assert(settings.includes("data-mode=\"${embedMode}\""), "Settings widget snippet should include the selected embed mode");
  assert(page.includes("/dashboard/preflight"), "Launch Studio should link to production preflight");
  assert(shell.includes("/dashboard/launch"), "Dashboard navigation should expose Launch Studio");
  assert(overview.includes("/dashboard/launch"), "Dashboard overview should route quick-start work through Launch Studio");
}

function assertSemanticSearchWorkflow() {
  const route = readFileSync("app/api/search/route.ts", "utf8");
  const publicRoute = readFileSync("app/api/public/search/[id]/route.ts", "utf8");
  const page = readFileSync("app/dashboard/search/page.tsx", "utf8");
  const publicPage = readFileSync("app/search/[id]/page.tsx", "utf8");
  const explanations = readFileSync("lib/search-explanations.ts", "utf8");
  const settings = readFileSync("app/dashboard/settings/page.tsx", "utf8");
  const eventsRoute = readFileSync("app/api/events/route.ts", "utf8");
  const utils = readFileSync("lib/utils.ts", "utf8");
  const shell = readFileSync("components/dashboard-shell.tsx", "utf8");
  const overview = readFileSync("app/dashboard/page.tsx", "utf8");
  const engine = readFileSync("lib/search-engine.ts", "utf8");
  assert(route.includes("getWorkspaceIdentity"), "Search service should require an authenticated workspace");
  assert(route.includes("runSemanticProductSearch"), "Search service should use the shared semantic search engine");
  assert(publicRoute.includes("eq(\"published\", true)"), "Published search route should validate published finder context");
  assert(publicRoute.includes("runSemanticProductSearch"), "Published search route should use the shared semantic search engine");
  assert(publicRoute.includes("explainSearchReport"), "Published search route should generate grounded explanations after ranking");
  assert(publicRoute.includes("explanation_source"), "Published search route should expose explanation source metadata");
  assert(explanations.includes("already selected deterministically"), "Search explanation prompt should keep AI out of product selection");
  assert(page.includes("runSemanticProductSearch"), "Search Lab should run the shared semantic search engine");
  assert(page.includes("Catalog term coverage"), "Search Lab should expose deterministic catalog coverage for parsed terms");
  assert(page.includes("POST /api/search"), "Search Lab should document the search service endpoint");
  assert(publicPage.includes("/api/public/search/"), "Public search page should call the published search runtime outside demo mode");
  assert(publicPage.includes("experience_type: \"search\""), "Public search analytics should identify search experiences");
  assert(publicPage.includes("explanation_source"), "Public search analytics should record explanation source");
  assert(publicPage.includes("report.intent.coverage"), "Public search should render term coverage chips from the shared search report");
  assert(settings.includes("<option value=\"search\">Semantic search</option>"), "Settings should expose semantic search as an embeddable experience");
  assert(settings.includes("data-experience=\"${embedType}\""), "Settings snippet should support search through the generic experience field");
  assert(eventsRoute.includes("requestedType === \"search\""), "Analytics route should preserve search experience metadata");
  assert(utils.includes("value === \"search\""), "Experience type inference should recognise search events");
  assert(shell.includes("/dashboard/search"), "Dashboard navigation should expose Search Lab");
  assert(overview.includes("/dashboard/search"), "Dashboard overview should expose Search Lab");
  assert(engine.includes("extractSearchIntentTokens"), "Search engine should parse natural-language intent tokens");
  assert(engine.includes("extractSearchBudget"), "Search engine should parse budget constraints");
  assert(engine.includes("buildTermCoverage"), "Search engine should diagnose active-catalog coverage for each parsed term");
  assert(engine.includes("SearchTermCoverage"), "Search engine should expose term coverage in the shared search report type");
}

function assertCatalogImportWorkflow() {
  const page = readFileSync("app/dashboard/products/page.tsx", "utf8");
  const ontologyPage = readFileSync("app/dashboard/ontology/page.tsx", "utf8");
  const shell = readFileSync("components/dashboard-shell.tsx", "utf8");
  const importer = readFileSync("lib/catalog-import.ts", "utf8");
  const intelligence = readFileSync("lib/catalog-intelligence.ts", "utf8");
  const ontology = readFileSync("lib/catalog-ontology.ts", "utf8");
  const preflight = readFileSync("app/api/preflight/route.ts", "utf8");
  const preflightPage = readFileSync("app/dashboard/preflight/page.tsx", "utf8");
  assert(page.includes("normalizeCatalogImportRows"), "Product CSV import should use the shared catalog import normalizer");
  assert(page.includes("Fix required"), "Product CSV import should expose invalid row feedback before import");
  assert(importer.includes("headerAliases"), "Catalog import normalizer should support flexible CSV header aliases");
  assert(importer.includes("Possible duplicate name/category"), "Catalog import normalizer should warn about duplicate rows");
  assert(page.includes("analyzeCatalogIntelligence"), "Products dashboard should show shared catalog intelligence diagnostics");
  assert(page.includes("Catalog intelligence score"), "Products dashboard should surface the catalog intelligence score");
  assert(intelligence.includes("analyzeCatalogIntelligence"), "Catalog intelligence helper should expose a deterministic analyzer");
  assert(ontology.includes("buildCatalogOntology"), "Catalog ontology helper should expose a deterministic attribute mapper");
  assert(ontologyPage.includes("buildCatalogOntology"), "Ontology dashboard should use the shared catalog ontology mapper");
  assert(ontologyPage.includes("Suggested finder questions"), "Ontology dashboard should surface AI-ready finder question ideas");
  assert(shell.includes("/dashboard/ontology"), "Dashboard navigation should expose the ontology map");
  assert(preflight.includes("analyzeCatalogIntelligence"), "Preflight should reuse shared catalog intelligence diagnostics");
  assert(preflightPage.includes("catalog_intelligence_score"), "Preflight page should show catalog intelligence summary fields");
}

function assertQuizReadinessWorkflow() {
  const page = readFileSync("app/dashboard/quizzes/page.tsx", "utf8");
  const readiness = readFileSync("lib/quiz-readiness.ts", "utf8");
  const coverage = readFileSync("lib/rule-coverage.ts", "utf8");
  assert(page.includes("analyzeQuizReadiness"), "Quiz builder should run publish-readiness diagnostics");
  assert(page.includes("Publish readiness"), "Quiz builder should surface publish-readiness feedback");
  assert(page.includes("!readiness.canPublish"), "Quiz builder should block publishing when readiness has blockers");
  assert(page.includes("Rule coverage"), "Quiz builder should surface per-answer catalog coverage");
  assert(page.includes("getAnswerOptionCoverage"), "Quiz builder should calculate answer-rule catalog coverage");
  assert(readiness.includes("getAnswerOptionCoverage"), "Quiz readiness helper should reuse shared rule coverage diagnostics");
  assert(readiness.includes("catalog-mapping"), "Quiz readiness helper should validate answer rules against catalog signals");
  assert(coverage.includes("ruleMatchesProduct"), "Rule coverage helper should expose deterministic product matching");
}

function assertConfiguratorReadinessWorkflow() {
  const page = readFileSync("app/dashboard/configurators/page.tsx", "utf8");
  const readiness = readFileSync("lib/configurator-readiness.ts", "utf8");
  assert(page.includes("analyzeConfiguratorReadiness"), "Configurator builder should run publish-readiness diagnostics");
  assert(page.includes("Publish readiness"), "Configurator builder should surface publish-readiness feedback");
  assert(page.includes("!readiness.canPublish"), "Configurator builder should block publishing when readiness has blockers");
  assert(readiness.includes("available-linked-products"), "Configurator readiness helper should validate linked product availability");
  assert(readiness.includes("compatibility"), "Configurator readiness helper should validate compatibility references");
}

function assertPreflightReadinessWorkflow() {
  const route = readFileSync("app/api/preflight/route.ts", "utf8");
  const page = readFileSync("app/dashboard/preflight/page.tsx", "utf8");
  assert(route.includes("analyzeQuizReadiness"), "Preflight should reuse finder publish-readiness diagnostics");
  assert(route.includes("analyzeConfiguratorReadiness"), "Preflight should reuse configurator publish-readiness diagnostics");
  assert(route.includes("finder_readiness_blockers"), "Preflight summary should expose finder readiness blockers");
  assert(route.includes("configurator_readiness_blockers"), "Preflight summary should expose configurator readiness blockers");
  assert(page.includes("Readiness blockers"), "Preflight page should show readiness blocker counts");
}

async function assertDeterministicLogic() {
  if (existsSync(compileDir)) rmSync(compileDir, { recursive: true, force: true });
  execFileSync("./node_modules/.bin/tsc", ["-p", "tsconfig.json", "--outDir", compileDir, "--noEmit", "false", "--declaration", "false", "--emitDeclarationOnly", "false"], { stdio: "ignore" });
  const compiledQuizReadiness = `${compileDir}/lib/quiz-readiness.js`;
  writeFileSync(compiledQuizReadiness, readFileSync(compiledQuizReadiness, "utf8").replace('from "./rule-coverage";', 'from "./rule-coverage.js";'));
  const compiledQuizGeneration = `${compileDir}/lib/quiz-generation.js`;
  writeFileSync(compiledQuizGeneration, readFileSync(compiledQuizGeneration, "utf8").replace('from "./catalog-ontology";', 'from "./catalog-ontology.js";'));

  const demo = await import(pathToFileURL(`${compileDir}/lib/demo-data.js`));
  const utils = await import(pathToFileURL(`${compileDir}/lib/utils.js`));
  const analytics = await import(pathToFileURL(`${compileDir}/lib/analytics.js`));
  const finderFlow = await import(pathToFileURL(`${compileDir}/lib/finder-flow.js`));
  const insights = await import(pathToFileURL(`${compileDir}/lib/insights.js`));
  const catalogIntelligence = await import(pathToFileURL(`${compileDir}/lib/catalog-intelligence.js`));
  const catalogOntology = await import(pathToFileURL(`${compileDir}/lib/catalog-ontology.js`));
  const catalogImport = await import(pathToFileURL(`${compileDir}/lib/catalog-import.js`));
  const quizGeneration = await import(pathToFileURL(`${compileDir}/lib/quiz-generation.js`));
  const quizReadiness = await import(pathToFileURL(`${compileDir}/lib/quiz-readiness.js`));
  const ruleCoverage = await import(pathToFileURL(`${compileDir}/lib/rule-coverage.js`));
  const searchEngine = await import(pathToFileURL(`${compileDir}/lib/search-engine.js`));
  const configuratorReadiness = await import(pathToFileURL(`${compileDir}/lib/configurator-readiness.js`));

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
  const cityOption = demo.demoQuiz.questions[0].options.find((option) => option.id === "o_city");
  assert(cityOption?.next_question_id === "q_budget", "Expected seeded demo finder to include answer-level branching");
  const nextBranchIndex = finderFlow.getNextFinderQuestionIndex(demo.demoQuiz, 0, cityOption, [0]);
  assert(demo.demoQuiz.questions[nextBranchIndex]?.id === "q_budget", "Expected branch helper to jump from city usage to budget");
  const defaultBranchSelections = finderFlow.defaultFinderSelections(demo.demoQuiz);
  assert(defaultBranchSelections.q_use === "o_trail" && defaultBranchSelections.q_feel === "o_soft" && defaultBranchSelections.q_budget === "o_100", "Expected default finder selections to follow the first-option branch path");
  const cityBranchPath = finderFlow.buildFinderQuestionPath(demo.demoQuiz, { q_use: "o_city", q_budget: "o_100" }, true);
  assert(cityBranchPath.map((step) => step.question.id).join(",") === "q_use,q_budget", "Expected branch-aware lab path to skip irrelevant questions");
  const branchedPath = finderFlow.resolveFinderAnswerPath(demo.demoQuiz, [
    { questionId: "q_use", optionId: "o_city" },
    { questionId: "q_feel", optionId: "o_soft" },
    { questionId: "q_budget", optionId: "o_100" },
  ]);
  assert(branchedPath.completed && branchedPath.answers.length === 2 && branchedPath.visitedQuestionIds.join(",") === "q_use,q_budget", "Expected answer-path resolver to ignore skipped question answers");
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
  const searchType = utils.getEventExperienceType({ quiz_id: "quiz_footwear", metadata: { experience_type: "search" } });
  assert(eventTypes.join(",") === "assistant,configurator,finder" && searchType === "search", `Unexpected event type inference: ${eventTypes.join(",")}, ${searchType}`);
  assert(demo.demoEvents.some((event) => Array.isArray(event.metadata?.answers) && event.metadata.answers.length), "Expected seeded finder analytics to include answer metadata");
  assert(demo.demoEvents.some((event) => event.metadata?.experience_type === "assistant" && typeof event.metadata.query === "string"), "Expected seeded advisor analytics to include shopper query metadata");
  assert(demo.demoEvents.some((event) => event.metadata?.experience_type === "search" && typeof event.metadata.query === "string"), "Expected seeded search analytics to include shopper query metadata");
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
  const zeroPartyEvents = [
    { id: "z1", user_id: "demo-user", quiz_id: "quiz_footwear", event_type: "quiz_complete", metadata: { session_id: "z1", experience_type: "finder", answers: [{ question: "Where?", answer: "Trails & outdoors" }], matched_reasons: ["trail"], product_name: "Terra Trail Runner" }, created_at: "2026-06-25T10:03:00Z" },
    { id: "z2", user_id: "demo-user", quiz_id: "quiz_footwear", product_id: "prod_trail", event_type: "product_recommended", metadata: { session_id: "z1", experience_type: "finder", product_name: "Terra Trail Runner", matched_reasons: ["trail"] }, created_at: "2026-06-25T10:04:00Z" },
    { id: "z3", user_id: "demo-user", quiz_id: "quiz_footwear", product_id: "prod_trail", event_type: "product_recommended", metadata: { session_id: "z2", experience_type: "search", query: "waterproof trail shoes under 140", terms: ["trail", "waterproof"], product_name: "Terra Trail Runner" }, created_at: "2026-06-25T10:05:00Z" },
    { id: "z4", user_id: "demo-user", quiz_id: "quiz_footwear", product_id: "prod_trail", event_type: "buy_click", metadata: { session_id: "z2", experience_type: "search", query: "waterproof trail shoes under 140", terms: ["trail", "waterproof"], product_name: "Terra Trail Runner" }, created_at: "2026-06-25T10:06:00Z" },
    { id: "z5", user_id: "demo-user", quiz_id: "quiz_footwear", event_type: "quiz_start", metadata: { session_id: "z3", experience_type: "assistant", query: "trail comfort for rainy weekends", terms: ["trail", "comfort", "rainy"] }, created_at: "2026-06-25T10:07:00Z" },
  ];
  const zeroPartyReport = insights.buildZeroPartyInsights(zeroPartyEvents, demo.demoProducts);
  assert(zeroPartyReport.answers.some((item) => item.label === "Trails & outdoors"), "Expected zero-party insights to count selected finder answers");
  assert(zeroPartyReport.queryThemes.some((item) => item.label === "trail" && item.count >= 3), "Expected zero-party insights to cluster repeated query themes");
  assert(zeroPartyReport.productDemand[0]?.productName === "Terra Trail Runner" && zeroPartyReport.productDemand[0].clicks === 1, "Expected zero-party insights to connect recommendations and buy clicks to products");
  assert(zeroPartyReport.opportunities.length && zeroPartyReport.summary.uniqueSignals >= 3, "Expected zero-party insights to generate deterministic merchant opportunities");

  const importPreview = catalogImport.normalizeCatalogImportRows([
    { title: "Trail Shoe", "sale price": "£1,299.50", collection: "Footwear", attributes: "Grip|Waterproof", keywords: "trail,wet", link: "store.example/trail" },
    { name: "", price: "not-a-price", category: "" },
    { title: "Trail Shoe", "sale price": "99", collection: "Footwear" },
  ]);
  assert(importPreview.summary.valid === 2 && importPreview.summary.invalid === 1, "Expected CSV import normalizer to separate valid and invalid rows");
  assert(importPreview.products[0].price === 1299.5 && importPreview.products[0].product_url === "https://store.example/trail", "Expected CSV import normalizer to clean aliased price and URL fields");
  assert(importPreview.rows.some((row) => row.warnings.some((warning) => warning.includes("duplicate"))), "Expected CSV import normalizer to warn about duplicate product rows");

  const catalogReport = catalogIntelligence.analyzeCatalogIntelligence(demo.demoProducts);
  assert(catalogReport.score >= 80 && catalogReport.activeProducts === demo.demoProducts.length, "Expected seeded demo catalog to have a strong intelligence score");
  assert(catalogReport.warnings.some((item) => item.id === "enrichment"), "Expected non-enriched demo catalog to warn about enrichment coverage");
  const thinCatalogReport = catalogIntelligence.analyzeCatalogIntelligence([{ ...demo.demoProducts[0], id: "thin_product", description: "", features: [], tags: [], image_url: "", product_url: "", search_text: "", buyer_needs: [] }]);
  assert(!thinCatalogReport.score || thinCatalogReport.blockers.some((item) => item.id === "catalog-size" || item.id === "matching-signals"), "Expected thin catalog to expose launch blockers");
  const ontologyReport = catalogOntology.buildCatalogOntology(demo.demoProducts);
  assert(ontologyReport.categoryClusters.length >= 2, "Expected ontology map to cluster demo products by category");
  assert(ontologyReport.topSignals.some((signal) => signal.key === "trail"), "Expected ontology map to expose repeated trail signal");
  assert(ontologyReport.suggestedQuestions.some((question) => question.options.length >= 2), "Expected ontology map to generate suggested finder questions");
  const generatedSuggestion = quizGeneration.buildOntologyQuizSuggestion(demo.demoProducts, "Help shoppers choose the right footwear");
  assert(generatedSuggestion.questions.length >= 2, "Expected ontology-guided quiz generation to produce multiple questions");
  assert(generatedSuggestion.questions.some((question) => question.options.some((option) => option.match_type === "category" || option.match_type === "tag" || option.match_type === "feature")), "Expected generated quiz to use ontology-backed catalog rules");
  assert(generatedSuggestion.questions.some((question) => question.options.some((option) => option.match_type === "budget_max")), "Expected generated quiz to include a budget question");
  const generationSummary = quizGeneration.buildQuizGenerationOntologySummary(demo.demoProducts);
  assert(generationSummary.categoryClusters.length >= 2 && generationSummary.suggestedQuestions.length, "Expected quiz generation summary to expose ontology context");

  const trailSearch = searchEngine.runSemanticProductSearch({ query: "waterproof hiking shoes under £140", products: demo.demoProducts, limit: 3 });
  assert(trailSearch.intent.maxBudget === 140 && trailSearch.intent.terms.includes("trail"), "Expected semantic search to parse budget and expanded hiking/trail intent");
  assert(trailSearch.intent.coverage.some((item) => item.term === "trail" && item.status !== "missing"), "Expected semantic search coverage to identify catalog-backed terms");
  assert(trailSearch.results[0]?.product.id === "prod_trail", `Expected semantic search to rank Terra Trail Runner first, got ${trailSearch.results[0]?.product.name || "nothing"}`);
  assert(trailSearch.results[0]?.matchedSignals.some((signal) => signal.source === "budget"), "Expected semantic search to include budget eligibility signals");
  const citySearch = searchEngine.runSemanticProductSearch({ query: "lightweight city travel shoe", products: demo.demoProducts, limit: 3 });
  assert(citySearch.results[0]?.product.id === "prod_city", `Expected semantic search to rank Aero City Knit first, got ${citySearch.results[0]?.product.name || "nothing"}`);
  const budgetSearch = searchEngine.runSemanticProductSearch({ query: "running shoes under £100", products: demo.demoProducts, limit: 4 });
  assert(budgetSearch.blockedProducts >= 2 && budgetSearch.results.every((result) => result.product.price <= 100), "Expected semantic search budget constraints to block over-budget products");
  const uncoveredSearch = searchEngine.runSemanticProductSearch({ query: "orthopedic office shoe", products: demo.demoProducts, limit: 3 });
  assert(uncoveredSearch.intent.coverage.some((item) => item.status === "missing"), "Expected semantic search coverage to flag missing catalog terms");

  const readyQuiz = quizReadiness.analyzeQuizReadiness(demo.demoQuiz, demo.demoProducts);
  assert(readyQuiz.canPublish && readyQuiz.score >= 80, "Expected seeded demo finder to pass publish-readiness checks");
  const trailCoverage = ruleCoverage.getAnswerOptionCoverage(demo.demoQuiz.questions[0].options[0], demo.demoProducts);
  assert(trailCoverage.status === "matched" && trailCoverage.productNames.includes("Terra Trail Runner"), "Expected tag rule coverage to identify matching active products");
  const budgetCoverage = ruleCoverage.getAnswerOptionCoverage(demo.demoQuiz.questions[2].options[0], demo.demoProducts);
  assert(budgetCoverage.status === "matched" && budgetCoverage.count === 2, "Expected budget rule coverage to count eligible active products");
  const preferenceCoverage = ruleCoverage.getAnswerOptionCoverage(demo.demoQuiz.questions[2].options[2], demo.demoProducts);
  assert(preferenceCoverage.status === "preference" && preferenceCoverage.count === demo.demoProducts.length, "Expected preference-only answers to keep active products eligible");
  const emptyCoverage = ruleCoverage.getAnswerOptionCoverage({ match_type: "tag", match_value: "nonexistent-signal" }, demo.demoProducts);
  assert(emptyCoverage.status === "empty" && emptyCoverage.count === 0, "Expected unmatched answer rules to report empty catalog coverage");
  const brokenQuiz = { ...demo.demoQuiz, questions: [{ ...demo.demoQuiz.questions[0], options: [{ ...demo.demoQuiz.questions[0].options[0], match_value: "" }] }] };
  const brokenReadiness = quizReadiness.analyzeQuizReadiness(brokenQuiz, demo.demoProducts);
  assert(!brokenReadiness.canPublish && brokenReadiness.blockers.some((item) => item.id === "answer-options" || item.id === "rule-values"), "Expected incomplete finder rules to block publishing");

  const readyConfigurator = configuratorReadiness.analyzeConfiguratorReadiness(demo.demoConfigurator, demo.demoProducts);
  assert(readyConfigurator.canPublish && readyConfigurator.score >= 80, "Expected seeded demo configurator to pass publish-readiness checks");
  const brokenConfigurator = { ...demo.demoConfigurator, steps: [{ ...demo.demoConfigurator.steps[0], options: [{ ...demo.demoConfigurator.steps[0].options[0], product_id: "missing_product" }] }] };
  const brokenConfiguratorReadiness = configuratorReadiness.analyzeConfiguratorReadiness(brokenConfigurator, demo.demoProducts);
  assert(!brokenConfiguratorReadiness.canPublish && brokenConfiguratorReadiness.blockers.some((item) => item.id === "available-linked-products"), "Expected missing linked products to block configurator publishing");

}

async function main() {
  await assertPage("/", "Turn product choice");
  await assertPage("/platform", "Findly platform");
  await assertPage("/platform/configurators", "Visual configurators");
  await assertPage("/industries", "Industries");
  await assertPage("/resources", "Demo the product discovery loop");
  await assertPage("/finder/quiz_footwear", "Preparing your product guide");
  await assertPage("/assistant/quiz_footwear", "Preparing your product advisor");
  await assertPage("/search/quiz_footwear", "Preparing product search");
  await assertPage("/configurator/config_trail_kit", "Loading configurator");
  await assertPage("/api/preflight", "Authentication required", 401);
  await assertWidgetScript();
  assertPublishedAdvisorRuntime();
  assertPublishedFinderRuntime();
  assertPublishedConfiguratorRuntime();
  assertSessionAnalytics();
  assertLaunchStudioWorkflow();
  assertSemanticSearchWorkflow();
  assertCatalogImportWorkflow();
  assertQuizReadinessWorkflow();
  assertConfiguratorReadinessWorkflow();
  assertPreflightReadinessWorkflow();
  await assertDeterministicLogic();
  console.log("Findly smoke test passed");
}

main().catch((error) => {
  console.error(`Findly smoke test failed: ${error.message}`);
  process.exit(1);
});
