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
  for (const token of ["data-experience", "data-mode", "data-id", "assistant", "configurator", "finder", "search", "inline", "ensureFrame", "findly_source", "findly_campaign", "findly_page_url"]) {
    assert(text.includes(token), `/api/widget.js missing ${token}`);
  }
  assert(text.indexOf("function open(){ensureFrame()") > text.indexOf("function ensureFrame()"), "Modal widget should lazy-load the iframe only when opened");
}

function assertPublishedAdvisorRuntime() {
  const route = readFileSync("app/api/public/assistant/[id]/route.ts", "utf8");
  const engine = readFileSync("lib/assistant-engine.ts", "utf8");
  const recovery = readFileSync("lib/advisor-recovery.ts", "utf8");
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
  assert(engine.includes("buildAdvisorRecoveryReport"), "Advisor engine should attach deterministic recovery metadata");
  assert(recovery.includes("buildAdvisorRecoveryReport"), "Advisor recovery helper should expose a reusable recovery builder");
  assert(recovery.includes("relax-budget"), "Advisor recovery should suggest budget relaxation when constraints block products");
  assert(page.includes("recovery_status"), "Assistant analytics should record advisor recovery status");
  assert(page.includes("Closest catalog options"), "Assistant page should show near-miss products when matching is weak or blocked");
}

function assertPublishedFinderRuntime() {
  const route = readFileSync("app/api/public/finder/[id]/route.ts", "utf8");
  const page = readFileSync("app/finder/[id]/page.tsx", "utf8");
  const builder = readFileSync("app/dashboard/quizzes/page.tsx", "utf8");
  const lab = readFileSync("app/dashboard/lab/page.tsx", "utf8");
  const readiness = readFileSync("lib/quiz-readiness.ts", "utf8");
  const flow = readFileSync("lib/finder-flow.ts", "utf8");
  const trace = readFileSync("lib/recommendation-trace.ts", "utf8");
  const scenarioCoverage = readFileSync("lib/scenario-coverage.ts", "utf8");
  const recovery = readFileSync("lib/recommendation-recovery.ts", "utf8");
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
  assert(route.includes("recovery"), "Published finder recommendations should return deterministic no-result recovery metadata");
  assert(page.includes("/api/public/finder/"), "Finder page should call the published finder runtime outside demo mode");
  assert(page.includes("setRecovery"), "Finder page should render deterministic no-result recovery guidance");
  assert(page.includes("Closest catalog options"), "Finder page should show closest catalog options when exact matches fail");
  assert(page.includes("getNextFinderQuestionIndex"), "Finder page should follow conditional answer routing in the customer experience");
  assert(page.includes("visitedStepIndexes"), "Finder page should keep back navigation aligned to the shopper's actual branch path");
  assert(page.includes("compareFinderRecommendations"), "Finder page should generate deterministic comparison rows for recommended products");
  assert(page.includes("Compare your matches"), "Finder page should show a side-by-side recommendation comparison");
  assert(builder.includes("Then show"), "Finder builder should expose answer-level branching controls");
  assert(builder.includes("Branching tip"), "Finder builder should explain conditional routing");
  assert(lab.includes("buildFinderQuestionPath"), "Recommendation lab should simulate the same conditional finder path as shoppers");
  assert(lab.includes("Skipped by this branch"), "Recommendation lab should expose questions skipped by the current branch");
  assert(lab.includes("buildRecommendationTraceReport"), "Recommendation lab should generate a merchant-readable decision trace");
  assert(lab.includes("Recommendation decision trace"), "Recommendation lab should show a deterministic recommendation trace panel");
  assert(lab.includes("buildScenarioCoverageReport"), "Recommendation lab should use the shared scenario coverage helper");
  assert(lab.includes("Scenario coverage suite"), "Recommendation lab should expose bounded scenario coverage before launch");
  assert(trace.includes("buildRecommendationTraceReport"), "Recommendation trace helper should expose a reusable deterministic report builder");
  assert(trace.includes("tuningActions"), "Recommendation trace should include merchant tuning actions");
  assert(scenarioCoverage.includes("buildScenarioCoverageReport"), "Scenario coverage helper should expose a reusable report builder");
  assert(scenarioCoverage.includes("answerCoverageRate") && scenarioCoverage.includes("productCoverageRate"), "Scenario coverage should score answer and product coverage");
  assert(recovery.includes("buildRecommendationRecoveryReport"), "Recommendation recovery helper should expose deterministic no-result recovery");
  assert(recovery.includes("Above selected budget"), "Recommendation recovery should identify budget blockers");
  assert(readiness.includes("Conditional routing"), "Quiz readiness should validate conditional finder routes");
  assert(flow.includes("resolveFinderAnswerPath"), "Finder flow helper should expose deterministic answer-path resolution");
  assert(flow.includes("defaultFinderSelections"), "Finder flow helper should expose branch-aware default selections for merchant testing");
  assert(schema.includes("next_question_id"), "Database schema should persist answer-level branch targets");
}

function assertPublishedConfiguratorRuntime() {
  const route = readFileSync("app/api/public/configurator/[id]/route.ts", "utf8");
  const page = readFileSync("app/configurator/[id]/page.tsx", "utf8");
  const guidance = readFileSync("lib/configurator-guidance.ts", "utf8");
  assert(route.includes("validateConfiguratorSelection"), "Published configurator route should validate bundles server-side");
  assert(route.includes("buildConfiguratorSelectionGuidance"), "Published configurator route should return compatibility guidance");
  assert(route.includes("selectedIds"), "Published configurator route should accept selected option IDs");
  assert(page.includes("/api/public/configurator/"), "Configurator page should call the published configurator runtime outside demo mode");
  assert(page.includes("server_validated"), "Configurator analytics should mark server-validated bundles");
  assert(page.includes("Compatibility guidance"), "Configurator page should explain blocked compatibility choices");
  assert(page.includes("buildConfiguratorOptionGuidance"), "Configurator page should use deterministic option guidance");
  assert(guidance.includes("buildConfiguratorSelectionGuidance"), "Configurator guidance helper should expose selection guidance");
  assert(guidance.includes("safeAlternativeIds"), "Configurator guidance should include safe alternatives for blocked options");
}

function assertPublicBrandingRuntime() {
  const helper = readFileSync("lib/public-experience.ts", "utf8");
  const finder = readFileSync("app/finder/[id]/page.tsx", "utf8");
  const assistant = readFileSync("app/assistant/[id]/page.tsx", "utf8");
  const search = readFileSync("app/search/[id]/page.tsx", "utf8");
  const configurator = readFileSync("app/configurator/[id]/page.tsx", "utf8");
  const finderRoute = readFileSync("app/api/public/finder/[id]/route.ts", "utf8");
  const searchRoute = readFileSync("app/api/public/search/[id]/route.ts", "utf8");
  const configuratorRoute = readFileSync("app/api/public/configurator/[id]/route.ts", "utf8");
  assert(helper.includes("buildPublicExperienceCopy"), "Public experience helper should expose shared copy generation");
  assert(helper.includes("normalizeWidgetSettings"), "Public experience helper should normalize widget settings");
  assert(finder.includes("buildPublicExperienceCopy(\"finder\""), "Finder page should use shared public branding copy");
  assert(assistant.includes("buildPublicExperienceCopy(\"assistant\""), "Assistant page should use shared public branding copy");
  assert(search.includes("buildPublicExperienceCopy(\"search\""), "Search page should use shared public branding copy");
  assert(configurator.includes("buildPublicExperienceCopy(\"configurator\""), "Configurator page should use shared public branding copy");
  assert(finderRoute.includes("normalizeWidgetSettings(settings)"), "Finder public API should return normalized settings");
  assert(searchRoute.includes("normalizeWidgetSettings(settings)"), "Search public API should return normalized settings");
  assert(configuratorRoute.includes("normalizeWidgetSettings(settingsResult.data)"), "Configurator public API should return normalized settings");
  assert(!assistant.includes("wet weekend trails"), "Assistant starter prompts should not be tied to the demo shoe catalog");
  assert(!search.includes("waterproof hiking shoes"), "Search starter prompts should not be tied to the demo shoe catalog");
}

function assertExplanationRuntimeSafety() {
  const route = readFileSync("app/api/explain/route.ts", "utf8");
  const finderEngine = readFileSync("lib/finder-engine.ts", "utf8");
  const explanations = readFileSync("lib/recommendation-explanations.ts", "utf8");
  assert(route.includes("checkRateLimit(`explain:"), "Standalone explanation API should rate-limit public OpenAI/fallback requests");
  assert(route.includes("explainRecommendation"), "Standalone explanation API should use the shared recommendation explanation helper");
  assert(route.includes("fallbackRecommendationExplanation"), "Standalone explanation API should fall back to deterministic explanation copy after failures");
  assert(!route.includes("new OpenAI"), "Standalone explanation API should not duplicate direct OpenAI client logic");
  assert(finderEngine.includes("explainRecommendation"), "Finder engine should use the shared recommendation explanation helper");
  assert(finderEngine.includes("fallbackRecommendationExplanation"), "Finder engine should use shared deterministic fallback explanations");
  assert(explanations.includes("Use only the supplied facts"), "Recommendation explanation helper should keep AI explanations grounded to supplied facts");
  assert(explanations.includes("fallbackRecommendationExplanation"), "Recommendation explanation helper should expose deterministic fallback copy");
}

function assertSessionAnalytics() {
  const session = readFileSync("lib/session.ts", "utf8");
  const analytics = readFileSync("app/dashboard/analytics/page.tsx", "utf8");
  const analyticsHelpers = readFileSync("lib/analytics.ts", "utf8");
  const analyticsQuality = readFileSync("lib/analytics-quality.ts", "utf8");
  const attribution = readFileSync("lib/attribution.ts", "utf8");
  const insights = readFileSync("lib/insights.ts", "utf8");
  const journeys = readFileSync("lib/journey-insights.ts", "utf8");
  const discoveryGaps = readFileSync("lib/discovery-gaps.ts", "utf8");
  for (const file of ["app/finder/[id]/page.tsx", "app/assistant/[id]/page.tsx", "app/configurator/[id]/page.tsx", "app/search/[id]/page.tsx"]) {
    assert(readFileSync(file, "utf8").includes("getSessionMetadata"), `${file} should attach anonymous session metadata to analytics events`);
  }
  assert(session.includes("findly_anonymous_session"), "Session helper should persist anonymous shopper sessions");
  assert(session.includes("getAttributionMetadata"), "Session helper should attach widget attribution metadata to every public event");
  assert(analytics.includes("buildAnalyticsSnapshot"), "Analytics dashboard should group events into session-aware snapshots");
  assert(analyticsHelpers.includes("buildAnalyticsTrends"), "Analytics helpers should calculate real period-over-period trends");
  assert(analytics.includes("funnelDiagnosis"), "Analytics dashboard should surface a deterministic funnel diagnosis");
  assert(analytics.includes("buildZeroPartyInsights"), "Analytics dashboard should use shared zero-party insight intelligence");
  assert(analytics.includes("Zero-party intent hub"), "Analytics dashboard should expose a zero-party intent hub");
  assert(analytics.includes("Intent opportunities"), "Analytics dashboard should surface deterministic intent opportunities");
  assert(analytics.includes("buildShopperJourneyReport"), "Analytics dashboard should use shared shopper journey reconstruction");
  assert(analytics.includes("Shopper journey replay"), "Analytics dashboard should expose session-level journey replay");
  assert(analytics.includes("buildDiscoveryGapReport"), "Analytics dashboard should use shared discovery gap intelligence");
  assert(analytics.includes("Discovery gap planner"), "Analytics dashboard should expose a discovery gap planner");
  assert(analytics.includes("buildAnalyticsQualityReport"), "Analytics dashboard should use shared analytics quality QA");
  assert(analytics.includes("Analytics QA"), "Analytics dashboard should expose an analytics QA panel");
  assert(analytics.includes("Event-contract health"), "Analytics dashboard should expose event-contract health checks");
  assert(analytics.includes("buildAttributionReport"), "Analytics dashboard should use shared attribution reporting");
  assert(analytics.includes("Attribution command board"), "Analytics dashboard should expose source/campaign attribution");
  assert(attribution.includes("buildAttributionReport"), "Attribution helper should expose a reusable report builder");
  assert(attribution.includes("findly_page_url") && attribution.includes("findly_placement"), "Attribution helper should track storefront page and placement labels");
  assert(analyticsQuality.includes("buildAnalyticsQualityReport"), "Analytics quality helper should expose a reusable report builder");
  assert(analyticsQuality.includes("requiredEventFields"), "Analytics quality helper should validate required event metadata");
  assert(analyticsQuality.includes("sessionSequenceIssues"), "Analytics quality helper should validate event sequence integrity");
  assert(insights.includes("buildZeroPartyInsights"), "Insight helper should expose a reusable zero-party report builder");
  assert(insights.includes("ProductDemandInsight"), "Insight helper should calculate product demand from recommendations and clicks");
  assert(journeys.includes("buildShopperJourneyReport"), "Journey helper should expose a reusable session report builder");
  assert(journeys.includes("analyticsEventSessionId"), "Journey helper should group events by anonymous session");
  assert(discoveryGaps.includes("buildDiscoveryGapReport"), "Discovery gap helper should expose a reusable deterministic report builder");
  assert(discoveryGaps.includes("zeroResultJourneys"), "Discovery gap helper should detect no-result journeys");
  assert(discoveryGaps.includes("termGaps"), "Discovery gap helper should detect missing shopper language");
  assert(!analytics.includes("percentChangePlaceholder"), "Analytics dashboard should not display placeholder trend percentages");
}

function assertPublicRuntimeGuardrails() {
  const guard = readFileSync("lib/public-runtime-guard.ts", "utf8");
  const rateLimit = readFileSync("lib/rate-limit.ts", "utf8");
  const eventsRoute = readFileSync("app/api/events/route.ts", "utf8");
  const assistantRoute = readFileSync("app/api/assistant/route.ts", "utf8");
  const publicRoutes = [
    "app/api/public/finder/[id]/route.ts",
    "app/api/public/search/[id]/route.ts",
    "app/api/public/assistant/[id]/route.ts",
    "app/api/public/configurator/[id]/route.ts",
  ];

  assert(guard.includes("readBoundedJson"), "Public runtime guard should expose bounded JSON parsing");
  assert(guard.includes("publicRateLimit"), "Public runtime guard should expose shared rate-limit responses");
  assert(guard.includes("sanitizeAnalyticsMetadata"), "Public runtime guard should sanitize analytics metadata");
  assert(rateLimit.includes("retryAfter") && rateLimit.includes("resetAt"), "Rate limiter should expose retry timing for public responses");
  assert(eventsRoute.includes("readBoundedJson") && eventsRoute.includes("publicRateLimit") && eventsRoute.includes("sanitizeAnalyticsMetadata"), "Analytics event route should bound bodies, rate-limit and sanitize metadata");
  assert(assistantRoute.includes("readBoundedJson") && assistantRoute.includes("publicRateLimit"), "Demo advisor route should bound browser-supplied product payloads");
  for (const file of publicRoutes) {
    const source = readFileSync(file, "utf8");
    assert(source.includes("publicRateLimit"), `${file} should use the shared public rate limiter`);
    assert(source.includes("readBoundedJson"), `${file} should parse bounded JSON request bodies`);
    assert(source.includes("handlePublicError"), `${file} should return clean public request errors`);
  }
}

function assertLaunchStudioWorkflow() {
  const page = readFileSync("app/dashboard/launch/page.tsx", "utf8");
  const generator = readFileSync("app/api/quizzes/generate/route.ts", "utf8");
  const quizGeneration = readFileSync("lib/quiz-generation.ts", "utf8");
  const quizBlueprint = readFileSync("lib/quiz-blueprint.ts", "utf8");
  const settings = readFileSync("app/dashboard/settings/page.tsx", "utf8");
  const widgetSnippet = readFileSync("lib/widget-snippet.ts", "utf8");
  const experienceLaunch = readFileSync("lib/experience-launch.ts", "utf8");
  const launchPacket = readFileSync("lib/launch-packet.ts", "utf8");
  const launchContract = readFileSync("lib/launch-contract.ts", "utf8");
  const storefrontQaRunbook = readFileSync("lib/storefront-qa-runbook.ts", "utf8");
  const shell = readFileSync("components/dashboard-shell.tsx", "utf8");
  const overview = readFileSync("app/dashboard/page.tsx", "utf8");
  assert(page.includes("/api/catalog/enrich"), "Launch Studio should call catalog enrichment");
  assert(page.includes("/api/quizzes/generate"), "Launch Studio should call AI quiz generation");
  assert(page.includes("catalog ontology engine"), "Launch Studio should report ontology-guided generation source");
  assert(page.includes("buildQuizBlueprint"), "Launch Studio should build a pre-generation quiz blueprint");
  assert(page.includes("AI quiz blueprint"), "Launch Studio should preview the AI quiz blueprint before generation");
  assert(page.includes("blueprintStatusLabel"), "Launch Studio should expose blueprint readiness status");
  assert(generator.includes("buildQuizGenerationOntologySummary"), "Quiz generation route should pass ontology context to OpenAI");
  assert(generator.includes("buildOntologyQuizSuggestion"), "Quiz generation route should use ontology-guided deterministic fallback");
  assert(quizGeneration.includes("buildCatalogOntology"), "Quiz generation helper should derive questions from the catalog ontology");
  assert(quizBlueprint.includes("buildQuizBlueprint"), "Quiz blueprint helper should expose a reusable report builder");
  assert(quizBlueprint.includes("getAnswerOptionCoverage"), "Quiz blueprint should validate planned answer options against the catalog");
  assert(page.includes("quiz.published = true"), "Launch Studio should publish the generated finder");
  assert(experienceLaunch.includes("buildWidgetSnippet"), "Launch Studio embed registry should use the shared widget snippet helper");
  assert(page.includes("Embed QA checklist"), "Launch Studio should expose widget install QA checks");
  assert(page.includes("buildLaunchExperienceCards"), "Launch Studio should build a multi-experience embed registry");
  assert(page.includes("launchExperienceCards.map"), "Launch Studio should let merchants choose from multiple embeddable experiences");
  assert(page.includes("selectedLaunchExperience.snippet"), "Launch Studio should render the selected experience snippet");
  assert(experienceLaunch.includes("buildLaunchExperienceCards"), "Launch experience helper should expose reusable multi-experience launch cards");
  assert(experienceLaunch.includes("\"assistant\"") && experienceLaunch.includes("\"search\"") && experienceLaunch.includes("\"configurator\""), "Launch experience helper should include advisor, search and configurator embeds");
  assert(page.includes("buildLaunchPacket"), "Launch Studio should use the shared launch packet helper");
  assert(page.includes("Developer handoff"), "Launch Studio should expose a developer handoff packet");
  assert(page.includes("Copy packet"), "Launch Studio should let merchants copy the developer launch packet");
  assert(page.includes("buildLaunchContract"), "Launch Studio should build a deterministic launch contract");
  assert(page.includes("Launch contract"), "Launch Studio should expose a launch contract panel");
  assert(page.includes("Copy contract"), "Launch Studio should let merchants copy the launch contract");
  assert(launchContract.includes("buildLaunchContract"), "Launch contract helper should expose reusable contract generation");
  assert(launchContract.includes("formatLaunchContract"), "Launch contract helper should expose reusable contract formatting");
  assert(launchContract.includes("Analytics contract") && launchContract.includes("data-experience"), "Launch contract should document analytics events and widget attributes");
  assert(page.includes("buildStorefrontQaRunbook"), "Launch Studio should build a deterministic storefront QA runbook");
  assert(page.includes("Storefront QA runbook"), "Launch Studio should expose a storefront QA runbook panel");
  assert(page.includes("Copy runbook"), "Launch Studio should let merchants copy the storefront QA runbook");
  assert(storefrontQaRunbook.includes("buildStorefrontQaRunbook"), "Storefront QA helper should expose reusable runbook generation");
  assert(storefrontQaRunbook.includes("formatStorefrontQaRunbook"), "Storefront QA helper should expose reusable runbook formatting");
  assert(storefrontQaRunbook.includes("Acceptance criteria") && storefrontQaRunbook.includes("Rollback plan"), "Storefront QA runbook should document acceptance criteria and rollback");
  assert(settings.includes("Embed mode"), "Settings should let merchants choose modal or inline embed mode");
  assert(settings.includes("buildWidgetSnippet"), "Settings should use the shared widget snippet helper");
  assert(settings.includes("buildWidgetInstallReport"), "Settings should expose widget install readiness diagnostics");
  assert(settings.includes("Analytics labels"), "Settings should let merchants label widget source, campaign and placement analytics");
  assert(widgetSnippet.includes("data-mode=\"${config.mode}\""), "Widget snippet helper should include the selected embed mode");
  assert(widgetSnippet.includes("data-experience=\"${config.experience}\""), "Widget snippet helper should include the selected experience type");
  assert(widgetSnippet.includes("data-campaign") && widgetSnippet.includes("data-placement"), "Widget snippet helper should include optional attribution attributes");
  assert(widgetSnippet.includes("buildWidgetInstallReport"), "Widget snippet helper should expose install QA reporting");
  assert(launchPacket.includes("buildLaunchPacket"), "Launch packet helper should expose reusable handoff generation");
  assert(launchPacket.includes("sourceLabel"), "Launch packet should support non-finder experience labels");
  assert(launchPacket.includes("Analytics events tracked"), "Launch packet should document the analytics event contract");
  assert(page.includes("/dashboard/preflight"), "Launch Studio should link to production preflight");
  assert(shell.includes("/dashboard/launch"), "Dashboard navigation should expose Launch Studio");
  assert(overview.includes("/dashboard/launch"), "Dashboard overview should route quick-start work through Launch Studio");
}

function assertDashboardCommandCenterWorkflow() {
  const overview = readFileSync("app/dashboard/page.tsx", "utf8");
  const commandCenter = readFileSync("lib/dashboard-command-center.ts", "utf8");
  const conversionPlaybook = readFileSync("lib/conversion-playbook.ts", "utf8");
  assert(overview.includes("buildDashboardCommandCenter"), "Dashboard overview should use the shared command-center helper");
  assert(overview.includes("buildConversionPlaybook"), "Dashboard overview should use the shared conversion playbook helper");
  assert(overview.includes("Command queue"), "Dashboard overview should expose prioritized command-center actions");
  assert(overview.includes("Conversion playbook"), "Dashboard overview should expose a deterministic conversion playbook");
  assert(overview.includes("Real shopper activity"), "Dashboard overview should label the activity chart as real data");
  assert(!overview.includes("+12.4%") && !overview.includes("[36, 52, 42"), "Dashboard overview should not use placeholder trend percentages or static chart data");
  assert(commandCenter.includes("buildDashboardCommandCenter"), "Command-center helper should expose a reusable report builder");
  assert(commandCenter.includes("buildDiscoveryGapReport"), "Command-center helper should reuse discovery gap analytics");
  assert(commandCenter.includes("buildRecommendationQaReport"), "Command-center helper should reuse recommendation QA");
  assert(commandCenter.includes("analyzeCatalogIntelligence"), "Command-center helper should reuse catalog intelligence");
  assert(conversionPlaybook.includes("buildConversionPlaybook"), "Conversion playbook helper should expose a reusable report builder");
  assert(conversionPlaybook.includes("buildAnalyticsQualityReport"), "Conversion playbook should consider analytics quality before optimization");
  assert(conversionPlaybook.includes("buildZeroPartyInsights"), "Conversion playbook should consider zero-party product demand");
}

function assertStarterKitWorkflow() {
  const page = readFileSync("app/dashboard/templates/page.tsx", "utf8");
  const starterKits = readFileSync("lib/starter-kits.ts", "utf8");
  const shell = readFileSync("components/dashboard-shell.tsx", "utf8");
  const overview = readFileSync("app/dashboard/page.tsx", "utf8");
  const readme = readFileSync("README.md", "utf8");
  assert(starterKits.includes("performance-footwear") && starterKits.includes("beauty-routine") && starterKits.includes("home-office"), "Starter kits should cover multiple ecommerce verticals");
  assert(starterKits.includes("materializeStarterKit"), "Starter kit helper should materialize editable workspace records");
  assert(starterKits.includes("buildStarterKitReadiness"), "Starter kit helper should expose launch-readiness diagnostics");
  assert(starterKits.includes("next_question_key"), "Starter kits should support answer-level branching");
  assert(starterKits.includes("product_key"), "Starter kits should support product-linked configurator options");
  assert(page.includes("saveProduct(product.input, product.id)"), "Templates page should save starter products with stable generated IDs");
  assert(page.includes("saveQuiz(payload.quiz)"), "Templates page should save the generated finder draft");
  assert(page.includes("saveConfigurator(payload.configurator)"), "Templates page should save the generated configurator draft");
  assert(page.includes("Install starter kit"), "Templates page should expose a one-click starter install action");
  assert(page.includes("Readiness checks"), "Templates page should show starter readiness before install");
  assert(shell.includes("/dashboard/templates"), "Dashboard navigation should expose starter templates");
  assert(overview.includes("/dashboard/templates"), "Dashboard overview should route merchants to templates");
  assert(readme.includes("Industry starter kits"), "README should document starter kit onboarding");
}

function assertDecisionGraphWorkflow() {
  const page = readFileSync("app/dashboard/decision-graph/page.tsx", "utf8");
  const helper = readFileSync("lib/decision-graph.ts", "utf8");
  const shell = readFileSync("components/dashboard-shell.tsx", "utf8");
  const overview = readFileSync("app/dashboard/page.tsx", "utf8");
  const readme = readFileSync("README.md", "utf8");
  assert(helper.includes("buildDecisionGraph"), "Decision graph helper should expose a reusable graph builder");
  assert(helper.includes("answer_rule"), "Decision graph should model answer-rule relationships");
  assert(helper.includes("configurator_product"), "Decision graph should model configurator product links");
  assert(helper.includes("shopper_language"), "Decision graph should model observed shopper language");
  assert(helper.includes("Product selection") || helper.includes("productsForRule"), "Decision graph should evaluate deterministic product selection coverage");
  assert(page.includes("buildDecisionGraph"), "Decision graph dashboard should use the shared graph helper");
  assert(page.includes("Finder rule coverage"), "Decision graph dashboard should expose finder rule audits");
  assert(page.includes("Configurator compatibility graph"), "Decision graph dashboard should expose configurator link and compatibility audits");
  assert(page.includes("Shopper language links"), "Decision graph dashboard should expose shopper-language mapping");
  assert(page.includes("Why this is safe AI"), "Decision graph dashboard should explain safe AI guardrails");
  assert(shell.includes("/dashboard/decision-graph"), "Dashboard navigation should expose the decision graph");
  assert(overview.includes("/dashboard/decision-graph"), "Dashboard overview should link to the decision graph");
  assert(readme.includes("Decision graph workbench"), "README should document the decision graph workbench");
}

function assertVocabularyStudioWorkflow() {
  const page = readFileSync("app/dashboard/vocabulary/page.tsx", "utf8");
  const helper = readFileSync("lib/vocabulary-studio.ts", "utf8");
  const shell = readFileSync("components/dashboard-shell.tsx", "utf8");
  const overview = readFileSync("app/dashboard/page.tsx", "utf8");
  const readme = readFileSync("README.md", "utf8");
  assert(helper.includes("buildVocabularyStudioReport"), "Vocabulary Studio helper should expose a reusable report builder");
  assert(helper.includes("buildShopperLanguagePlan"), "Vocabulary Studio should reuse the shopper language planner");
  assert(helper.includes("synonymClusters"), "Vocabulary Studio should group synonym review clusters");
  assert(helper.includes("unsupportedTerms"), "Vocabulary Studio should expose unsupported shopper language");
  assert(helper.includes("Findly approved discovery vocabulary"), "Vocabulary Studio should generate a copyable glossary");
  assert(helper.includes("Findly Vocabulary Studio packet"), "Vocabulary Studio should generate a copyable packet");
  assert(page.includes("buildVocabularyStudioReport"), "Vocabulary page should use the shared report builder");
  assert(page.includes("Approved discovery dictionary"), "Vocabulary page should show the approved dictionary");
  assert(page.includes("Unsupported shopper language"), "Vocabulary page should show unsupported terms");
  assert(page.includes("Synonym review clusters"), "Vocabulary page should show synonym review clusters");
  assert(page.includes("Product language tasks"), "Vocabulary page should show product language tasks");
  assert(page.includes("Copy vocabulary packet"), "Vocabulary page should let merchants copy the packet");
  assert(shell.includes("/dashboard/vocabulary"), "Dashboard navigation should expose Vocabulary Studio");
  assert(overview.includes("/dashboard/vocabulary"), "Dashboard overview should link to Vocabulary Studio");
  assert(readme.includes("Vocabulary Studio"), "README should document Vocabulary Studio");
}

function assertTrustCenterWorkflow() {
  const page = readFileSync("app/dashboard/trust-center/page.tsx", "utf8");
  const helper = readFileSync("lib/trust-center.ts", "utf8");
  const shell = readFileSync("components/dashboard-shell.tsx", "utf8");
  const overview = readFileSync("app/dashboard/page.tsx", "utf8");
  const readme = readFileSync("README.md", "utf8");
  assert(helper.includes("buildTrustCenterReport"), "Trust Center helper should expose a reusable report builder");
  assert(helper.includes("buildExplanationGroundingReport"), "Trust Center should include explanation grounding evidence");
  assert(helper.includes("buildAnalyticsQualityReport"), "Trust Center should include analytics quality evidence");
  assert(helper.includes("buildRecommendationQaReport"), "Trust Center should include recommendation QA evidence");
  assert(helper.includes("buildVocabularyStudioReport"), "Trust Center should include vocabulary governance evidence");
  assert(helper.includes("Rules select. AI explains."), "Trust Center should document the safe-AI selection boundary");
  assert(helper.includes("Findly AI trust packet"), "Trust Center should generate a copyable trust packet");
  assert(page.includes("buildTrustCenterReport"), "Trust Center dashboard should use the shared report builder");
  assert(page.includes("AI Trust Center"), "Trust Center page should expose the dashboard title");
  assert(page.includes("Trust principles"), "Trust Center page should explain trust principles");
  assert(page.includes("Runtime guardrails"), "Trust Center page should explain public runtime guardrails");
  assert(page.includes("AI boundary"), "Trust Center page should show the AI boundary");
  assert(page.includes("Data boundary"), "Trust Center page should show the data boundary");
  assert(page.includes("Copy trust packet"), "Trust Center page should let merchants copy the trust packet");
  assert(shell.includes("/dashboard/trust-center"), "Dashboard navigation should expose AI Trust Center");
  assert(overview.includes("/dashboard/trust-center"), "Dashboard overview should route merchants to AI Trust Center");
  assert(readme.includes("AI Trust Center"), "README should document AI Trust Center");
}

function assertFlowStudioWorkflow() {
  const page = readFileSync("app/dashboard/flow-studio/page.tsx", "utf8");
  const helper = readFileSync("lib/flow-studio.ts", "utf8");
  const shell = readFileSync("components/dashboard-shell.tsx", "utf8");
  const overview = readFileSync("app/dashboard/page.tsx", "utf8");
  const readme = readFileSync("README.md", "utf8");
  assert(helper.includes("buildFlowStudioReport"), "Flow Studio helper should expose a reusable report builder");
  assert(helper.includes("answerToFinderAnswer") && helper.includes("buildFinderQuestionPath"), "Flow Studio should use the same branch resolver as the finder runtime");
  assert(helper.includes("getAnswerOptionCoverage"), "Flow Studio should audit answer rule coverage");
  assert(helper.includes("buildScenarioCoverageReport"), "Flow Studio should include deterministic route QA");
  assert(helper.includes("Findly visual flow studio packet"), "Flow Studio should generate a copyable flow packet");
  assert(page.includes("buildFlowStudioReport"), "Flow Studio page should use the shared helper");
  assert(page.includes("Visual flow canvas"), "Flow Studio page should render a visual flow canvas");
  assert(page.includes("Answer route map"), "Flow Studio page should expose the answer route map");
  assert(page.includes("Route QA"), "Flow Studio page should expose route QA");
  assert(page.includes("Copy flow packet"), "Flow Studio page should let merchants copy a flow packet");
  assert(shell.includes("/dashboard/flow-studio"), "Dashboard navigation should expose Flow Studio");
  assert(overview.includes("/dashboard/flow-studio"), "Dashboard overview should link to Flow Studio");
  assert(readme.includes("Flow Studio workbench"), "README should document Flow Studio");
}

function assertLaunchChannelsWorkflow() {
  const page = readFileSync("app/dashboard/channels/page.tsx", "utf8");
  const helper = readFileSync("lib/launch-channels.ts", "utf8");
  const shell = readFileSync("components/dashboard-shell.tsx", "utf8");
  const overview = readFileSync("app/dashboard/page.tsx", "utf8");
  const readme = readFileSync("README.md", "utf8");
  assert(helper.includes("buildLaunchChannelReport"), "Launch channels helper should expose a reusable report builder");
  assert(helper.includes("homepage-finder") && helper.includes("category-inline-search") && helper.includes("pdp-configurator") && helper.includes("support-advisor"), "Launch channels should include homepage, category, PDP and support placements");
  assert(helper.includes("buildWidgetSnippet") && helper.includes("buildWidgetInstallReport"), "Launch channels should use shared widget snippet and install QA helpers");
  assert(helper.includes("findly_campaign") && helper.includes("findly_placement") && helper.includes("findly_source"), "Launch channels should evaluate attributed channel events");
  assert(page.includes("buildLaunchChannelReport"), "Launch Channels page should use the shared report builder");
  assert(page.includes("Copy channel packet"), "Launch Channels page should let merchants copy a complete channel packet");
  assert(page.includes("Channel QA"), "Launch Channels page should show channel QA checks");
  assert(page.includes("Channel telemetry"), "Launch Channels page should show channel metrics");
  assert(shell.includes("/dashboard/channels"), "Dashboard navigation should expose Launch Channels");
  assert(overview.includes("/dashboard/channels"), "Dashboard overview should expose Launch Channels");
  assert(readme.includes("Launch Channels board"), "README should document Launch Channels");
}

function assertExperienceRegistryWorkflow() {
  const page = readFileSync("app/dashboard/experiences/page.tsx", "utf8");
  const helper = readFileSync("lib/experience-registry.ts", "utf8");
  const shell = readFileSync("components/dashboard-shell.tsx", "utf8");
  const overview = readFileSync("app/dashboard/page.tsx", "utf8");
  const readme = readFileSync("README.md", "utf8");
  assert(helper.includes("buildExperienceRegistry"), "Experience Registry helper should expose a reusable report builder");
  assert(helper.includes("buildLaunchExperienceCards"), "Experience Registry should reuse launch experience cards");
  assert(helper.includes("buildAnalyticsSnapshot"), "Experience Registry should include telemetry metrics");
  assert(helper.includes("Findly Experience Registry packet"), "Experience Registry should generate a copyable packet");
  assert(page.includes("buildExperienceRegistry"), "Experience Registry page should use the shared helper");
  assert(page.includes("Experience Registry"), "Experience Registry page should expose the dashboard title");
  assert(page.includes("Copy registry packet"), "Experience Registry page should let merchants copy the packet");
  assert(page.includes("QA checklist"), "Experience Registry page should show install/runtime QA");
  assert(page.includes("Recommended rollout candidate"), "Experience Registry page should recommend a rollout candidate");
  assert(shell.includes("/dashboard/experiences"), "Dashboard navigation should expose Experience Registry");
  assert(overview.includes("/dashboard/experiences"), "Dashboard overview should expose Experience Registry");
  assert(readme.includes("Experience Registry"), "README should document Experience Registry");
}

function assertPartnerSyndicationWorkflow() {
  const page = readFileSync("app/dashboard/syndication/page.tsx", "utf8");
  const helper = readFileSync("lib/syndication.ts", "utf8");
  const shell = readFileSync("components/dashboard-shell.tsx", "utf8");
  const overview = readFileSync("app/dashboard/page.tsx", "utf8");
  const readme = readFileSync("README.md", "utf8");
  assert(helper.includes("buildSyndicationReport"), "Syndication helper should expose a reusable report builder");
  assert(helper.includes("retailer-pdp-advisor") && helper.includes("marketplace-buying-guide") && helper.includes("affiliate-search-guide"), "Syndication helper should package retailer, marketplace and affiliate placements");
  assert(helper.includes("data-medium=\"syndication\"") || helper.includes("medium: \"syndication\""), "Syndication helper should stamp syndication attribution");
  assert(helper.includes("Findly partner syndication packet"), "Syndication helper should generate copyable partner packets");
  assert(helper.includes("Partner acceptance criteria"), "Syndication helper should include partner acceptance criteria");
  assert(helper.includes("No Supabase keys") && helper.includes("OpenAI keys"), "Syndication helper should document partner data boundaries");
  assert(page.includes("buildSyndicationReport"), "Syndication page should use the shared report builder");
  assert(page.includes("Copy syndication packet"), "Syndication page should let merchants copy a partner packet");
  assert(page.includes("Partner acceptance criteria"), "Syndication page should show partner acceptance criteria");
  assert(page.includes("Syndication QA"), "Syndication page should show partner QA checks");
  assert(page.includes("Data policy"), "Syndication page should show the data policy");
  assert(page.includes("Governance checks"), "Syndication page should show governance checks");
  assert(shell.includes("/dashboard/syndication"), "Dashboard navigation should expose Syndication");
  assert(overview.includes("/dashboard/syndication"), "Dashboard overview should link to Syndication");
  assert(readme.includes("Partner Syndication board"), "README should document partner syndication");
}

function assertStorefrontSandboxWorkflow() {
  const page = readFileSync("app/dashboard/storefront-sandbox/page.tsx", "utf8");
  const helper = readFileSync("lib/storefront-sandbox.ts", "utf8");
  const shell = readFileSync("components/dashboard-shell.tsx", "utf8");
  const overview = readFileSync("app/dashboard/page.tsx", "utf8");
  const readme = readFileSync("README.md", "utf8");
  assert(helper.includes("buildStorefrontSandboxReport"), "Storefront sandbox helper should expose a reusable report builder");
  assert(helper.includes("expectedEvents"), "Storefront sandbox should define expected analytics events");
  assert(helper.includes("acceptanceCriteria") && helper.includes("qaSteps"), "Storefront sandbox should produce QA steps and acceptance criteria");
  assert(helper.includes("Findly storefront QA sandbox packet"), "Storefront sandbox should export a copyable QA packet");
  assert(page.includes("buildStorefrontSandboxReport"), "Storefront sandbox page should use the shared report builder");
  assert(page.includes("Expected event contract"), "Storefront sandbox page should show expected telemetry");
  assert(page.includes("Exact snippet"), "Storefront sandbox page should show the exact install snippet");
  assert(page.includes("Desktop storefront QA preview"), "Storefront sandbox page should render a desktop storefront preview");
  assert(shell.includes("/dashboard/storefront-sandbox"), "Dashboard navigation should expose Storefront QA sandbox");
  assert(overview.includes("/dashboard/storefront-sandbox"), "Dashboard overview should expose Storefront QA sandbox");
  assert(readme.includes("Storefront QA sandbox"), "README should document Storefront QA sandbox");
}

function assertReleaseCenterWorkflow() {
  const page = readFileSync("app/dashboard/release-center/page.tsx", "utf8");
  const helper = readFileSync("lib/release-center.ts", "utf8");
  const shell = readFileSync("components/dashboard-shell.tsx", "utf8");
  const overview = readFileSync("app/dashboard/page.tsx", "utf8");
  const readme = readFileSync("README.md", "utf8");
  assert(helper.includes("buildReleaseCandidate"), "Release Center helper should expose a reusable release candidate builder");
  assert(helper.includes("decisionFromGates"), "Release Center should produce a go/review/no-go decision");
  assert(helper.includes("rollbackPlan"), "Release Center should produce a rollback plan");
  assert(helper.includes("Findly release candidate"), "Release Center should generate copyable release notes");
  assert(page.includes("buildReleaseCandidate"), "Release Center page should use the shared release candidate builder");
  assert(page.includes("Release gates"), "Release Center page should show launch gates");
  assert(page.includes("Rollback plan"), "Release Center page should show rollback plan");
  assert(page.includes("Copy release notes"), "Release Center page should let merchants copy release notes");
  assert(shell.includes("/dashboard/release-center"), "Dashboard navigation should expose Release Center");
  assert(overview.includes("/dashboard/release-center"), "Dashboard overview should expose Release Center");
  assert(readme.includes("Release Center"), "README should document Release Center");
}

function assertWorkspaceSnapshotWorkflow() {
  const page = readFileSync("app/dashboard/workspace-snapshot/page.tsx", "utf8");
  const helper = readFileSync("lib/workspace-snapshot.ts", "utf8");
  const shell = readFileSync("components/dashboard-shell.tsx", "utf8");
  const overview = readFileSync("app/dashboard/page.tsx", "utf8");
  const readme = readFileSync("README.md", "utf8");
  assert(helper.includes("buildWorkspaceSnapshot"), "Workspace snapshot helper should expose a reusable snapshot builder");
  assert(helper.includes("findly-workspace-snapshot-v1"), "Workspace snapshot should version its archive format");
  assert(helper.includes("safeMetadata"), "Workspace snapshot should restrict analytics metadata before export");
  assert(helper.includes("productCsv") && helper.includes("analyticsCsv"), "Workspace snapshot should export product and analytics CSV files");
  assert(helper.includes("Findly workspace snapshot"), "Workspace snapshot should generate copyable handoff notes");
  assert(page.includes("buildWorkspaceSnapshot"), "Workspace snapshot page should use the shared helper");
  assert(page.includes("Copy JSON archive"), "Workspace snapshot page should let merchants copy the JSON archive");
  assert(page.includes("Copy product CSV"), "Workspace snapshot page should let merchants copy product CSV");
  assert(page.includes("Download archive"), "Workspace snapshot page should let merchants download the archive");
  assert(page.includes("Safe export checks"), "Workspace snapshot page should show export checks");
  assert(page.includes("Restore plan"), "Workspace snapshot page should show restore guidance");
  assert(page.includes("Privacy boundary"), "Workspace snapshot page should explain what is excluded");
  assert(shell.includes("/dashboard/workspace-snapshot"), "Dashboard navigation should expose Workspace Snapshot");
  assert(overview.includes("/dashboard/workspace-snapshot"), "Dashboard overview should link to Workspace Snapshot");
  assert(readme.includes("Workspace Snapshot exporter"), "README should document Workspace Snapshot");
}

function assertExperimentPlannerWorkflow() {
  const page = readFileSync("app/dashboard/experiments/page.tsx", "utf8");
  const helper = readFileSync("lib/experiments.ts", "utf8");
  const shell = readFileSync("components/dashboard-shell.tsx", "utf8");
  const overview = readFileSync("app/dashboard/page.tsx", "utf8");
  const readme = readFileSync("README.md", "utf8");
  assert(helper.includes("buildExperimentPlanningReport"), "Experiment helper should expose a reusable planning report");
  assert(helper.includes("launcher-promise") && helper.includes("first-question-friction") && helper.includes("results-trust"), "Experiment helper should include funnel optimization experiments");
  assert(helper.includes("inline-semantic-search") && helper.includes("pdp-bundle-configurator") && helper.includes("channel-attribution-contract"), "Experiment helper should include search, configurator and attribution experiments");
  assert(helper.includes("rollbackPlan") && helper.includes("successCriteria") && helper.includes("sampleSizeNote"), "Experiment helper should include safe-test governance");
  assert(page.includes("buildExperimentPlanningReport"), "Experiments page should use the shared report builder");
  assert(page.includes("Copy experiment packet"), "Experiments page should let merchants copy the experiment packet");
  assert(page.includes("Experiment guardrails"), "Experiments page should show launch guardrails");
  assert(page.includes("Success criteria"), "Experiments page should show experiment success criteria");
  assert(shell.includes("/dashboard/experiments"), "Dashboard navigation should expose Experiments");
  assert(overview.includes("/dashboard/experiments"), "Dashboard overview should expose Experiments");
  assert(readme.includes("Experiment planner"), "README should document the experiment planner");
}

function assertCommercialImpactWorkflow() {
  const analyticsPage = readFileSync("app/dashboard/analytics/page.tsx", "utf8");
  const commercialImpact = readFileSync("lib/commercial-impact.ts", "utf8");
  assert(analyticsPage.includes("buildCommercialImpactReport"), "Analytics dashboard should use the shared commercial impact helper");
  assert(analyticsPage.includes("Commercial impact"), "Analytics dashboard should expose a commercial impact panel");
  assert(analyticsPage.includes("ROI opportunity board"), "Analytics dashboard should expose deterministic ROI opportunities");
  assert(analyticsPage.includes("commercialImpact.confidence"), "Analytics dashboard should render assisted-value confidence boundaries");
  assert(commercialImpact.includes("buildCommercialImpactReport"), "Commercial impact helper should expose a reusable report builder");
  assert(commercialImpact.includes("Directional: based on Findly recommendation and buy-click events"), "Commercial impact helper should disclose assisted-value confidence boundaries");
  assert(commercialImpact.includes("influencedRevenue"), "Commercial impact helper should calculate assisted product value");
  assert(commercialImpact.includes("unclickedRecommendedValue"), "Commercial impact helper should calculate unclicked recommendation value");
  assert(commercialImpact.includes("demandCoverageRate"), "Commercial impact helper should calculate catalog demand coverage");
}

function assertSemanticSearchWorkflow() {
  const route = readFileSync("app/api/search/route.ts", "utf8");
  const publicRoute = readFileSync("app/api/public/search/[id]/route.ts", "utf8");
  const page = readFileSync("app/dashboard/search/page.tsx", "utf8");
  const publicPage = readFileSync("app/search/[id]/page.tsx", "utf8");
  const explanations = readFileSync("lib/search-explanations.ts", "utf8");
  const searchRecovery = readFileSync("lib/search-recovery.ts", "utf8");
  const benefits = readFileSync("lib/catalog-benefits.ts", "utf8");
  const advisor = readFileSync("lib/assistant-engine.ts", "utf8");
  const settings = readFileSync("app/dashboard/settings/page.tsx", "utf8");
  const eventsRoute = readFileSync("app/api/events/route.ts", "utf8");
  const utils = readFileSync("lib/utils.ts", "utf8");
  const shell = readFileSync("components/dashboard-shell.tsx", "utf8");
  const overview = readFileSync("app/dashboard/page.tsx", "utf8");
  const engine = readFileSync("lib/search-engine.ts", "utf8");
  const tuning = readFileSync("lib/search-tuning.ts", "utf8");
  assert(route.includes("getWorkspaceIdentity"), "Search service should require an authenticated workspace");
  assert(route.includes("runSemanticProductSearch"), "Search service should use the shared semantic search engine");
  assert(route.includes("buildSearchRecoveryReport"), "Search service should return deterministic search recovery guidance");
  assert(publicRoute.includes("eq(\"published\", true)"), "Published search route should validate published finder context");
  assert(publicRoute.includes("runSemanticProductSearch"), "Published search route should use the shared semantic search engine");
  assert(publicRoute.includes("explainSearchReport"), "Published search route should generate grounded explanations after ranking");
  assert(publicRoute.includes("buildSearchRecoveryReport"), "Published search route should return deterministic search recovery guidance");
  assert(publicRoute.includes("explanation_source"), "Published search route should expose explanation source metadata");
  assert(explanations.includes("already selected deterministically"), "Search explanation prompt should keep AI out of product selection");
  assert(page.includes("runSemanticProductSearch"), "Search Lab should run the shared semantic search engine");
  assert(page.includes("buildSearchRecoveryReport"), "Search Lab should expose deterministic search recovery");
  assert(page.includes("Search recovery"), "Search Lab should show a recovery/debug panel");
  assert(page.includes("Catalog term coverage"), "Search Lab should expose deterministic catalog coverage for parsed terms");
  assert(page.includes("buildSearchTuningReport"), "Search Lab should turn term coverage into deterministic tuning guidance");
  assert(page.includes("Search tuning plan"), "Search Lab should show a merchant-facing search tuning plan");
  assert(page.includes("POST /api/search"), "Search Lab should document the search service endpoint");
  assert(publicPage.includes("/api/public/search/"), "Public search page should call the published search runtime outside demo mode");
  assert(publicPage.includes("experience_type: \"search\""), "Public search analytics should identify search experiences");
  assert(publicPage.includes("explanation_source"), "Public search analytics should record explanation source");
  assert(publicPage.includes("recovery_status"), "Public search analytics should record recovery status");
  assert(publicPage.includes("Closest catalog options"), "Public search should show near-miss options when exact matching is weak or blocked");
  assert(publicPage.includes("report.intent.coverage"), "Public search should render term coverage chips from the shared search report");
  assert(settings.includes("<option value=\"search\">Semantic search</option>"), "Settings should expose semantic search as an embeddable experience");
  assert(settings.includes("WidgetEmbedExperience"), "Settings snippet should support search through the generic experience field");
  assert(eventsRoute.includes("requestedType === \"search\""), "Analytics route should preserve search experience metadata");
  assert(utils.includes("value === \"search\""), "Experience type inference should recognise search events");
  assert(shell.includes("/dashboard/search"), "Dashboard navigation should expose Search Lab");
  assert(overview.includes("/dashboard/search"), "Dashboard overview should expose Search Lab");
  assert(engine.includes("extractSearchIntentTokens"), "Search engine should parse natural-language intent tokens");
  assert(engine.includes("expandBenefitIntentTokens"), "Search engine should expand shopper benefit language into catalog terms");
  assert(advisor.includes("expandBenefitIntentTokens"), "Advisor engine should expand shopper benefit language into catalog terms");
  assert(benefits.includes("expandBenefitIntentTokens"), "Catalog benefits helper should expose benefit-aware intent expansion");
  assert(engine.includes("extractSearchBudget"), "Search engine should parse budget constraints");
  assert(engine.includes("buildTermCoverage"), "Search engine should diagnose active-catalog coverage for each parsed term");
  assert(engine.includes("SearchTermCoverage"), "Search engine should expose term coverage in the shared search report type");
  assert(engine.includes("nearMisses"), "Search engine should expose blocked near misses for recovery flows");
  assert(searchRecovery.includes("buildSearchRecoveryReport"), "Search recovery helper should expose deterministic recovery guidance");
  assert(searchRecovery.includes("relax-budget"), "Search recovery should suggest budget relaxation when constraints block products");
  assert(tuning.includes("buildSearchTuningReport"), "Search tuning helper should expose deterministic merchant recommendations");
  assert(tuning.includes("missingTerms"), "Search tuning helper should prioritize missing catalog language");
}

function assertAdvisorStudioWorkflow() {
  const page = readFileSync("app/dashboard/advisor/page.tsx", "utf8");
  const helper = readFileSync("lib/advisor-studio.ts", "utf8");
  const shell = readFileSync("components/dashboard-shell.tsx", "utf8");
  const overview = readFileSync("app/dashboard/page.tsx", "utf8");
  const readme = readFileSync("README.md", "utf8");
  assert(helper.includes("buildAdvisorStudioReport"), "Advisor Studio helper should expose a reusable report builder");
  assert(helper.includes("runSemanticProductSearch"), "Advisor Studio should reuse the deterministic search engine for prompt QA");
  assert(helper.includes("buildAdvisorRecoveryReport"), "Advisor Studio should include advisor recovery guidance");
  assert(helper.includes("buildWidgetSnippet"), "Advisor Studio should generate assistant widget snippets");
  assert(helper.includes("Findly Advisor Studio packet"), "Advisor Studio should generate a copyable packet");
  assert(page.includes("buildAdvisorStudioReport"), "Advisor Studio page should use the shared report builder");
  assert(page.includes("Advisor Studio"), "Advisor Studio page should expose the dashboard title");
  assert(page.includes("Advisor response QA"), "Advisor Studio page should show response QA");
  assert(page.includes("Catalog term coverage"), "Advisor Studio page should expose prompt term coverage");
  assert(page.includes("Assistant widget snippet"), "Advisor Studio page should expose the assistant snippet");
  assert(page.includes("Copy advisor packet"), "Advisor Studio page should let merchants copy the packet");
  assert(shell.includes("/dashboard/advisor"), "Dashboard navigation should expose Advisor Studio");
  assert(overview.includes("/dashboard/advisor"), "Dashboard overview should expose Advisor Studio");
  assert(readme.includes("Advisor Studio"), "README should document Advisor Studio");
}

function assertAttributeStudioWorkflow() {
  const page = readFileSync("app/dashboard/attributes/page.tsx", "utf8");
  const helper = readFileSync("lib/attribute-studio.ts", "utf8");
  const shell = readFileSync("components/dashboard-shell.tsx", "utf8");
  const overview = readFileSync("app/dashboard/page.tsx", "utf8");
  const readme = readFileSync("README.md", "utf8");
  assert(helper.includes("buildAttributeStudioReport"), "Attribute Studio helper should expose a reusable report builder");
  assert(helper.includes("buildCatalogBenefitReport"), "Attribute Studio should reuse spec-to-benefit mapping");
  assert(helper.includes("analyzeCatalogIntelligence"), "Attribute Studio should include catalog readiness evidence");
  assert(helper.includes("Findly normalized attribute glossary"), "Attribute Studio should generate a copyable glossary");
  assert(helper.includes("Findly Attribute Studio packet"), "Attribute Studio should generate a copyable packet");
  assert(page.includes("buildAttributeStudioReport"), "Attribute Studio page should use the shared report builder");
  assert(page.includes("Attribute Studio"), "Attribute Studio page should expose the dashboard title");
  assert(page.includes("Normalized attribute glossary"), "Attribute Studio page should show canonical attributes");
  assert(page.includes("Attribute variant groups"), "Attribute Studio page should show alias/variant review");
  assert(page.includes("Product cleanup tasks"), "Attribute Studio page should show product-level cleanup tasks");
  assert(page.includes("Copy attribute packet"), "Attribute Studio page should let merchants copy the packet");
  assert(shell.includes("/dashboard/attributes"), "Dashboard navigation should expose Attribute Studio");
  assert(overview.includes("/dashboard/attributes"), "Dashboard overview should expose Attribute Studio");
  assert(readme.includes("Attribute Studio"), "README should document Attribute Studio");
}

function assertCatalogImportWorkflow() {
  const page = readFileSync("app/dashboard/products/page.tsx", "utf8");
  const ontologyPage = readFileSync("app/dashboard/ontology/page.tsx", "utf8");
  const shell = readFileSync("components/dashboard-shell.tsx", "utf8");
  const importer = readFileSync("lib/catalog-import.ts", "utf8");
  const intelligence = readFileSync("lib/catalog-intelligence.ts", "utf8");
  const ontology = readFileSync("lib/catalog-ontology.ts", "utf8");
  const benefits = readFileSync("lib/catalog-benefits.ts", "utf8");
  const languagePlanner = readFileSync("lib/shopper-language-planner.ts", "utf8");
  const preflight = readFileSync("app/api/preflight/route.ts", "utf8");
  const preflightPage = readFileSync("app/dashboard/preflight/page.tsx", "utf8");
  assert(page.includes("normalizeCatalogImportRows"), "Product CSV import should use the shared catalog import normalizer");
  assert(page.includes("Fix required"), "Product CSV import should expose invalid row feedback before import");
  assert(page.includes("Buyer needs"), "Product form should expose buyer-needs editing");
  assert(page.includes("Semantic search text"), "Product form should expose semantic search text editing");
  assert(importer.includes("headerAliases"), "Catalog import normalizer should support flexible CSV header aliases");
  assert(importer.includes("buyer_needs"), "Catalog import normalizer should support buyer-needs fields");
  assert(importer.includes("search_text"), "Catalog import normalizer should support semantic search text fields");
  assert(importer.includes("Possible duplicate name/category"), "Catalog import normalizer should warn about duplicate rows");
  assert(page.includes("analyzeCatalogIntelligence"), "Products dashboard should show shared catalog intelligence diagnostics");
  assert(page.includes("Catalog intelligence score"), "Products dashboard should surface the catalog intelligence score");
  assert(intelligence.includes("analyzeCatalogIntelligence"), "Catalog intelligence helper should expose a deterministic analyzer");
  assert(ontology.includes("buildCatalogOntology"), "Catalog ontology helper should expose a deterministic attribute mapper");
  assert(ontologyPage.includes("buildCatalogOntology"), "Ontology dashboard should use the shared catalog ontology mapper");
  assert(benefits.includes("buildCatalogBenefitReport"), "Catalog benefit helper should expose deterministic spec-to-benefit translation");
  assert(ontologyPage.includes("buildCatalogBenefitReport"), "Ontology dashboard should use the shared catalog benefit translator");
  assert(ontologyPage.includes("Spec-to-benefit translator"), "Ontology dashboard should surface spec-to-benefit translation");
  assert(languagePlanner.includes("buildShopperLanguagePlan"), "Shopper language planner should expose a reusable report builder");
  assert(languagePlanner.includes("missingObservedTerms") && languagePlanner.includes("synonymSuggestions"), "Shopper language planner should detect missing observed terms and synonym opportunities");
  assert(ontologyPage.includes("buildShopperLanguagePlan"), "Ontology dashboard should use the shared shopper language planner");
  assert(ontologyPage.includes("Shopper language planner"), "Ontology dashboard should surface shopper-language planning");
  assert(preflight.includes("buildShopperLanguagePlan"), "Preflight should reuse shopper-language launch checks");
  assert(preflight.includes("Shopper language coverage"), "Preflight should expose a shopper-language coverage section");
  assert(preflightPage.includes("shopper_language_score"), "Preflight page should show shopper-language summary fields");
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
  const route = readFileSync("app/api/configurators/generate/route.ts", "utf8");
  const blueprint = readFileSync("lib/configurator-blueprint.ts", "utf8");
  const readiness = readFileSync("lib/configurator-readiness.ts", "utf8");
  const qa = readFileSync("lib/configurator-qa.ts", "utf8");
  assert(page.includes("analyzeConfiguratorReadiness"), "Configurator builder should run publish-readiness diagnostics");
  assert(page.includes("/api/configurators/generate"), "Configurator dashboard should call authenticated configurator generation");
  assert(page.includes("Generate configurator"), "Configurator dashboard should expose one-click configurator generation");
  assert(page.includes("applyConfiguratorSuggestion"), "Configurator dashboard should turn generated blueprints into editable configurators");
  assert(route.includes("buildConfiguratorBlueprint"), "Configurator generation route should use deterministic catalog blueprints");
  assert(route.includes("new OpenAI"), "Configurator generation route should optionally use OpenAI for richer structure and copy");
  assert(blueprint.includes("buildConfiguratorBlueprint"), "Configurator blueprint helper should expose a reusable report builder");
  assert(blueprint.includes("incompatible_option_keys"), "Configurator blueprint should infer compatibility guardrails");
  assert(page.includes("buildConfiguratorQaReport"), "Configurator builder should run deterministic path QA");
  assert(page.includes("Publish readiness"), "Configurator builder should surface publish-readiness feedback");
  assert(page.includes("Path QA"), "Configurator builder should surface path QA feedback");
  assert(page.includes("!readiness.canPublish"), "Configurator builder should block publishing when readiness has blockers");
  assert(readiness.includes("available-linked-products"), "Configurator readiness helper should validate linked product availability");
  assert(readiness.includes("compatibility"), "Configurator readiness helper should validate compatibility references");
  assert(qa.includes("buildConfiguratorQaReport"), "Configurator QA helper should expose a reusable report builder");
  assert(qa.includes("compatibilityGuardrails") && qa.includes("productLinkedScenarioRate"), "Configurator QA should track compatibility guardrails and product-link coverage");
}

function assertPreflightReadinessWorkflow() {
  const route = readFileSync("app/api/preflight/route.ts", "utf8");
  const page = readFileSync("app/dashboard/preflight/page.tsx", "utf8");
  const recommendationQa = readFileSync("lib/recommendation-qa.ts", "utf8");
  const configuratorQa = readFileSync("lib/configurator-qa.ts", "utf8");
  const explanationGrounding = readFileSync("lib/explanation-grounding.ts", "utf8");
  const analyticsQuality = readFileSync("lib/analytics-quality.ts", "utf8");
  const attribution = readFileSync("lib/attribution.ts", "utf8");
  const launchReport = readFileSync("lib/launch-readiness-report.ts", "utf8");
  assert(route.includes("analyzeQuizReadiness"), "Preflight should reuse finder publish-readiness diagnostics");
  assert(route.includes("analyzeConfiguratorReadiness"), "Preflight should reuse configurator publish-readiness diagnostics");
  assert(route.includes("buildRecommendationQaReport"), "Preflight should run synthetic recommendation QA");
  assert(route.includes("buildConfiguratorQaReport"), "Preflight should run configurator path QA");
  assert(route.includes("buildExplanationGroundingReport"), "Preflight should run explanation grounding QA");
  assert(route.includes("buildAnalyticsQualityReport"), "Preflight should run analytics quality QA");
  assert(route.includes("buildAttributionReport"), "Preflight should run widget attribution QA");
  assert(route.includes("buildLaunchReadinessReport"), "Preflight should build a prioritized launch-readiness report");
  assert(route.includes("launch_report"), "Preflight API should expose the launch-readiness report");
  assert(route.includes("Recommendation reliability"), "Preflight should expose a recommendation reliability section");
  assert(route.includes("Configurator path QA"), "Preflight should expose a configurator path QA section");
  assert(route.includes("Explanation grounding"), "Preflight should expose an explanation grounding section");
  assert(route.includes("Analytics quality"), "Preflight should expose an analytics quality section");
  assert(route.includes("Source attribution"), "Preflight should expose source attribution telemetry checks");
  assert(page.includes("attribution_rate"), "Preflight page should show attribution summary fields");
  assert(attribution.includes("buildAttributionReport"), "Attribution helper should expose a reusable report builder");
  assert(route.includes("finder_readiness_blockers"), "Preflight summary should expose finder readiness blockers");
  assert(route.includes("configurator_readiness_blockers"), "Preflight summary should expose configurator readiness blockers");
  assert(route.includes("configurator_qa_score"), "Preflight summary should expose configurator QA score");
  assert(route.includes("recommendation_qa_score"), "Preflight summary should expose recommendation QA score");
  assert(route.includes("explanation_grounding_score"), "Preflight summary should expose explanation grounding score");
  assert(route.includes("analytics_quality_score"), "Preflight summary should expose analytics quality score");
  assert(page.includes("Launch readiness score"), "Preflight page should surface the launch readiness score");
  assert(page.includes("Priority launch plan"), "Preflight page should surface prioritized launch actions");
  assert(page.includes("Readiness blockers"), "Preflight page should show readiness blocker counts");
  assert(page.includes("QA scenarios"), "Preflight page should show recommendation QA scenario counts");
  assert(page.includes("Configurator QA"), "Preflight page should show configurator QA summary fields");
  assert(page.includes("Explanation QA"), "Preflight page should show explanation grounding summary fields");
  assert(page.includes("Analytics QA"), "Preflight page should show analytics quality summary fields");
  assert(explanationGrounding.includes("buildExplanationGroundingReport"), "Explanation grounding helper should expose a reusable report builder");
  assert(explanationGrounding.includes("unsupportedTerms") && explanationGrounding.includes("riskyTerms"), "Explanation grounding helper should detect unsupported and risky explanation terms");
  assert(launchReport.includes("buildLaunchReadinessReport"), "Launch readiness helper should expose a reusable report builder");
  assert(launchReport.includes("nextActions"), "Launch readiness report should include prioritized next actions");
  assert(launchReport.includes("Recommendation reliability"), "Launch readiness report should classify recommendation QA impact");
  assert(launchReport.includes("configurator-qa"), "Launch readiness report should score configurator QA coverage");
  assert(launchReport.includes("explanation-grounding"), "Launch readiness report should score explanation grounding coverage");
  assert(launchReport.includes("analytics-quality"), "Launch readiness report should score analytics quality coverage");
  assert(recommendationQa.includes("buildRecommendationQaReport"), "Recommendation QA helper should expose a reusable report builder");
  assert(recommendationQa.includes("auditProductMatches"), "Recommendation QA should use the deterministic product scorer");
  assert(configuratorQa.includes("buildConfiguratorQaReport"), "Configurator QA helper should expose a reusable report builder");
  assert(analyticsQuality.includes("buildAnalyticsQualityReport"), "Analytics quality helper should expose a reusable report builder");
}

async function assertDeterministicLogic() {
  if (existsSync(compileDir)) rmSync(compileDir, { recursive: true, force: true });
  execFileSync("./node_modules/.bin/tsc", ["-p", "tsconfig.json", "--outDir", compileDir, "--noEmit", "false", "--declaration", "false", "--emitDeclarationOnly", "false"], { stdio: "ignore" });
  const compiledQuizReadiness = `${compileDir}/lib/quiz-readiness.js`;
  writeFileSync(compiledQuizReadiness, readFileSync(compiledQuizReadiness, "utf8").replace('from "./rule-coverage";', 'from "./rule-coverage.js";'));
  const compiledQuizGeneration = `${compileDir}/lib/quiz-generation.js`;
  writeFileSync(compiledQuizGeneration, readFileSync(compiledQuizGeneration, "utf8").replace('from "./catalog-ontology";', 'from "./catalog-ontology.js";'));
  const compiledQuizBlueprint = `${compileDir}/lib/quiz-blueprint.js`;
  writeFileSync(compiledQuizBlueprint, readFileSync(compiledQuizBlueprint, "utf8")
    .replace('from "./quiz-generation";', 'from "./quiz-generation.js";')
    .replace('from "./rule-coverage";', 'from "./rule-coverage.js";'));
  const compiledJourneyInsights = `${compileDir}/lib/journey-insights.js`;
  writeFileSync(compiledJourneyInsights, readFileSync(compiledJourneyInsights, "utf8")
    .replace('from "./analytics";', 'from "./analytics.js";')
    .replace('from "./utils";', 'from "./utils.js";'));
  const compiledAnalyticsQuality = `${compileDir}/lib/analytics-quality.js`;
  writeFileSync(compiledAnalyticsQuality, readFileSync(compiledAnalyticsQuality, "utf8")
    .replace('from "./analytics";', 'from "./analytics.js";')
    .replace('from "./utils";', 'from "./utils.js";'));
  const compiledAttribution = `${compileDir}/lib/attribution.js`;
  writeFileSync(compiledAttribution, readFileSync(compiledAttribution, "utf8")
    .replace('from "./analytics";', 'from "./analytics.js";'));
  const compiledRecommendationQa = `${compileDir}/lib/recommendation-qa.js`;
  writeFileSync(compiledRecommendationQa, readFileSync(compiledRecommendationQa, "utf8")
    .replace('from "./finder-flow";', 'from "./finder-flow.js";')
    .replace('from "./utils";', 'from "./utils.js";'));
  const compiledScenarioCoverage = `${compileDir}/lib/scenario-coverage.js`;
  writeFileSync(compiledScenarioCoverage, readFileSync(compiledScenarioCoverage, "utf8")
    .replace('from "./finder-flow";', 'from "./finder-flow.js";')
    .replace('from "./utils";', 'from "./utils.js";'));
  const compiledFlowStudio = `${compileDir}/lib/flow-studio.js`;
  writeFileSync(compiledFlowStudio, readFileSync(compiledFlowStudio, "utf8")
    .replace('from "./finder-flow";', 'from "./finder-flow.js";')
    .replace('from "./quiz-readiness";', 'from "./quiz-readiness.js";')
    .replace('from "./rule-coverage";', 'from "./rule-coverage.js";')
    .replace('from "./scenario-coverage";', 'from "./scenario-coverage.js";')
    .replace('from "./utils";', 'from "./utils.js";'));
  const compiledExplanationGrounding = `${compileDir}/lib/explanation-grounding.js`;
  writeFileSync(compiledExplanationGrounding, readFileSync(compiledExplanationGrounding, "utf8")
    .replace('from "./finder-flow";', 'from "./finder-flow.js";')
    .replace('from "./utils";', 'from "./utils.js";'));
  const compiledRecommendationRecovery = `${compileDir}/lib/recommendation-recovery.js`;
  writeFileSync(compiledRecommendationRecovery, readFileSync(compiledRecommendationRecovery, "utf8")
    .replace('from "./utils";', 'from "./utils.js";')
    .replace('from "@/lib/utils";', 'from "./utils.js";'));
  const compiledConfiguratorGuidance = `${compileDir}/lib/configurator-guidance.js`;
  writeFileSync(compiledConfiguratorGuidance, readFileSync(compiledConfiguratorGuidance, "utf8")
    .replace('from "./utils";', 'from "./utils.js";')
    .replace('from "@/lib/utils";', 'from "./utils.js";'));
  const compiledConfiguratorQa = `${compileDir}/lib/configurator-qa.js`;
  writeFileSync(compiledConfiguratorQa, readFileSync(compiledConfiguratorQa, "utf8")
    .replace('from "@/lib/utils";', 'from "./utils.js";'));
  const compiledConfiguratorBlueprint = `${compileDir}/lib/configurator-blueprint.js`;
  writeFileSync(compiledConfiguratorBlueprint, readFileSync(compiledConfiguratorBlueprint, "utf8")
    .replace('from "./catalog-benefits";', 'from "./catalog-benefits.js";'));
  const compiledSearchEngine = `${compileDir}/lib/search-engine.js`;
  writeFileSync(compiledSearchEngine, readFileSync(compiledSearchEngine, "utf8").replace('from "./catalog-benefits";', 'from "./catalog-benefits.js";'));
  const compiledAttributeStudio = `${compileDir}/lib/attribute-studio.js`;
  writeFileSync(compiledAttributeStudio, readFileSync(compiledAttributeStudio, "utf8")
    .replace('from "./catalog-benefits";', 'from "./catalog-benefits.js";')
    .replace('from "./catalog-intelligence";', 'from "./catalog-intelligence.js";'));
  const compiledAdvisorStudio = `${compileDir}/lib/advisor-studio.js`;
  writeFileSync(compiledAdvisorStudio, readFileSync(compiledAdvisorStudio, "utf8")
    .replace('from "./advisor-recovery";', 'from "./advisor-recovery.js";')
    .replace('from "./search-engine";', 'from "./search-engine.js";')
    .replace('from "./widget-snippet";', 'from "./widget-snippet.js";'));
  const compiledShopperLanguagePlanner = `${compileDir}/lib/shopper-language-planner.js`;
  writeFileSync(compiledShopperLanguagePlanner, readFileSync(compiledShopperLanguagePlanner, "utf8")
    .replace('from "./catalog-benefits";', 'from "./catalog-benefits.js";')
    .replace('from "./catalog-ontology";', 'from "./catalog-ontology.js";')
    .replace('from "./search-engine";', 'from "./search-engine.js";'));
  const compiledVocabularyStudio = `${compileDir}/lib/vocabulary-studio.js`;
  writeFileSync(compiledVocabularyStudio, readFileSync(compiledVocabularyStudio, "utf8")
    .replace('from "./catalog-benefits";', 'from "./catalog-benefits.js";')
    .replace('from "./catalog-ontology";', 'from "./catalog-ontology.js";')
    .replace('from "./shopper-language-planner";', 'from "./shopper-language-planner.js";'));
  const compiledTrustCenter = `${compileDir}/lib/trust-center.js`;
  writeFileSync(compiledTrustCenter, readFileSync(compiledTrustCenter, "utf8")
    .replace('from "./analytics-quality";', 'from "./analytics-quality.js";')
    .replace('from "./decision-graph";', 'from "./decision-graph.js";')
    .replace('from "./explanation-grounding";', 'from "./explanation-grounding.js";')
    .replace('from "./recommendation-qa";', 'from "./recommendation-qa.js";')
    .replace('from "./vocabulary-studio";', 'from "./vocabulary-studio.js";'));
  const compiledExperienceLaunch = `${compileDir}/lib/experience-launch.js`;
  writeFileSync(compiledExperienceLaunch, readFileSync(compiledExperienceLaunch, "utf8")
    .replace('from "./widget-snippet";', 'from "./widget-snippet.js";')
    .replace('from "@/lib/widget-snippet";', 'from "./widget-snippet.js";'));
  const compiledExperienceRegistry = `${compileDir}/lib/experience-registry.js`;
  writeFileSync(compiledExperienceRegistry, readFileSync(compiledExperienceRegistry, "utf8")
    .replace('from "./analytics";', 'from "./analytics.js";')
    .replace('from "./experience-launch";', 'from "./experience-launch.js";')
    .replace('from "@/lib/utils";', 'from "./utils.js";'));
  const compiledLaunchContract = `${compileDir}/lib/launch-contract.js`;
  writeFileSync(compiledLaunchContract, readFileSync(compiledLaunchContract, "utf8")
    .replace('from "./widget-snippet";', 'from "./widget-snippet.js";')
    .replace('from "@/lib/widget-snippet";', 'from "./widget-snippet.js";'));
  const compiledDiscoveryGaps = `${compileDir}/lib/discovery-gaps.js`;
  writeFileSync(compiledDiscoveryGaps, readFileSync(compiledDiscoveryGaps, "utf8")
    .replace('from "./utils";', 'from "./utils.js";')
    .replace('from "@/lib/utils";', 'from "./utils.js";'));
  const compiledDashboardCommandCenter = `${compileDir}/lib/dashboard-command-center.js`;
  writeFileSync(compiledDashboardCommandCenter, readFileSync(compiledDashboardCommandCenter, "utf8")
    .replace('from "@/lib/analytics";', 'from "./analytics.js";')
    .replace('from "@/lib/catalog-intelligence";', 'from "./catalog-intelligence.js";')
    .replace('from "@/lib/configurator-readiness";', 'from "./configurator-readiness.js";')
    .replace('from "@/lib/discovery-gaps";', 'from "./discovery-gaps.js";')
    .replace('from "@/lib/quiz-readiness";', 'from "./quiz-readiness.js";')
    .replace('from "@/lib/recommendation-qa";', 'from "./recommendation-qa.js";'));
  const compiledConversionPlaybook = `${compileDir}/lib/conversion-playbook.js`;
  writeFileSync(compiledConversionPlaybook, readFileSync(compiledConversionPlaybook, "utf8")
    .replace('from "./analytics";', 'from "./analytics.js";')
    .replace('from "./analytics-quality";', 'from "./analytics-quality.js";')
    .replace('from "./catalog-intelligence";', 'from "./catalog-intelligence.js";')
    .replace('from "./discovery-gaps";', 'from "./discovery-gaps.js";')
    .replace('from "./insights";', 'from "./insights.js";')
    .replace('from "./recommendation-qa";', 'from "./recommendation-qa.js";'));
  const compiledCommercialImpact = `${compileDir}/lib/commercial-impact.js`;
  writeFileSync(compiledCommercialImpact, readFileSync(compiledCommercialImpact, "utf8")
    .replace('from "./analytics";', 'from "./analytics.js";'));
  const compiledStarterKits = `${compileDir}/lib/starter-kits.js`;
  writeFileSync(compiledStarterKits, readFileSync(compiledStarterKits, "utf8")
    .replace('from "@/lib/utils";', 'from "./utils.js";'));
  const compiledDecisionGraph = `${compileDir}/lib/decision-graph.js`;
  writeFileSync(compiledDecisionGraph, readFileSync(compiledDecisionGraph, "utf8")
    .replace('from "@/lib/utils";', 'from "./utils.js";'));
  const compiledLaunchChannels = `${compileDir}/lib/launch-channels.js`;
  writeFileSync(compiledLaunchChannels, readFileSync(compiledLaunchChannels, "utf8")
    .replace('from "@/lib/widget-snippet";', 'from "./widget-snippet.js";'));
  const compiledSyndication = `${compileDir}/lib/syndication.js`;
  writeFileSync(compiledSyndication, readFileSync(compiledSyndication, "utf8")
    .replace('from "./utils";', 'from "./utils.js";')
    .replace('from "./widget-snippet";', 'from "./widget-snippet.js";'));
  const compiledStorefrontSandbox = `${compileDir}/lib/storefront-sandbox.js`;
  writeFileSync(compiledStorefrontSandbox, readFileSync(compiledStorefrontSandbox, "utf8")
    .replace('from "./launch-channels";', 'from "./launch-channels.js";')
    .replace('from "@/lib/widget-snippet";', 'from "./widget-snippet.js";'));
  const compiledExperiments = `${compileDir}/lib/experiments.js`;
  writeFileSync(compiledExperiments, readFileSync(compiledExperiments, "utf8")
    .replace('from "./analytics";', 'from "./analytics.js";')
    .replace('from "./analytics-quality";', 'from "./analytics-quality.js";')
    .replace('from "./attribution";', 'from "./attribution.js";')
    .replace('from "./discovery-gaps";', 'from "./discovery-gaps.js";')
    .replace('from "./launch-channels";', 'from "./launch-channels.js";'));
  const compiledReleaseCenter = `${compileDir}/lib/release-center.js`;
  writeFileSync(compiledReleaseCenter, readFileSync(compiledReleaseCenter, "utf8")
    .replace('from "./analytics-quality";', 'from "./analytics-quality.js";')
    .replace('from "./catalog-intelligence";', 'from "./catalog-intelligence.js";')
    .replace('from "./configurator-readiness";', 'from "./configurator-readiness.js";')
    .replace('from "./decision-graph";', 'from "./decision-graph.js";')
    .replace('from "./experiments";', 'from "./experiments.js";')
    .replace('from "./launch-channels";', 'from "./launch-channels.js";')
    .replace('from "./quiz-readiness";', 'from "./quiz-readiness.js";')
    .replace('from "./recommendation-qa";', 'from "./recommendation-qa.js";')
    .replace('from "./storefront-sandbox";', 'from "./storefront-sandbox.js";'));
  const compiledWorkspaceSnapshot = `${compileDir}/lib/workspace-snapshot.js`;
  writeFileSync(compiledWorkspaceSnapshot, readFileSync(compiledWorkspaceSnapshot, "utf8")
    .replace('from "./decision-graph";', 'from "./decision-graph.js";')
    .replace('from "./launch-channels";', 'from "./launch-channels.js";')
    .replace('from "./release-center";', 'from "./release-center.js";'));

  const demo = await import(pathToFileURL(`${compileDir}/lib/demo-data.js`));
  const utils = await import(pathToFileURL(`${compileDir}/lib/utils.js`));
  const analytics = await import(pathToFileURL(`${compileDir}/lib/analytics.js`));
  const analyticsQuality = await import(pathToFileURL(`${compileDir}/lib/analytics-quality.js`));
  const attribution = await import(pathToFileURL(`${compileDir}/lib/attribution.js`));
  const journeyInsights = await import(pathToFileURL(`${compileDir}/lib/journey-insights.js`));
  const finderFlow = await import(pathToFileURL(`${compileDir}/lib/finder-flow.js`));
  const insights = await import(pathToFileURL(`${compileDir}/lib/insights.js`));
  const catalogIntelligence = await import(pathToFileURL(`${compileDir}/lib/catalog-intelligence.js`));
  const catalogOntology = await import(pathToFileURL(`${compileDir}/lib/catalog-ontology.js`));
  const catalogBenefits = await import(pathToFileURL(`${compileDir}/lib/catalog-benefits.js`));
  const catalogImport = await import(pathToFileURL(`${compileDir}/lib/catalog-import.js`));
  const quizGeneration = await import(pathToFileURL(`${compileDir}/lib/quiz-generation.js`));
  const quizBlueprint = await import(pathToFileURL(`${compileDir}/lib/quiz-blueprint.js`));
  const quizReadiness = await import(pathToFileURL(`${compileDir}/lib/quiz-readiness.js`));
  const recommendationQa = await import(pathToFileURL(`${compileDir}/lib/recommendation-qa.js`));
  const scenarioCoverage = await import(pathToFileURL(`${compileDir}/lib/scenario-coverage.js`));
  const flowStudio = await import(pathToFileURL(`${compileDir}/lib/flow-studio.js`));
  const explanationGrounding = await import(pathToFileURL(`${compileDir}/lib/explanation-grounding.js`));
  const recommendationRecovery = await import(pathToFileURL(`${compileDir}/lib/recommendation-recovery.js`));
  const configuratorGuidance = await import(pathToFileURL(`${compileDir}/lib/configurator-guidance.js`));
  const configuratorQa = await import(pathToFileURL(`${compileDir}/lib/configurator-qa.js`));
  const configuratorBlueprint = await import(pathToFileURL(`${compileDir}/lib/configurator-blueprint.js`));
  const recommendationTrace = await import(pathToFileURL(`${compileDir}/lib/recommendation-trace.js`));
  const ruleCoverage = await import(pathToFileURL(`${compileDir}/lib/rule-coverage.js`));
  const searchEngine = await import(pathToFileURL(`${compileDir}/lib/search-engine.js`));
  const attributeStudio = await import(pathToFileURL(`${compileDir}/lib/attribute-studio.js`));
  const advisorStudio = await import(pathToFileURL(`${compileDir}/lib/advisor-studio.js`));
  const shopperLanguagePlanner = await import(pathToFileURL(`${compileDir}/lib/shopper-language-planner.js`));
  const vocabularyStudio = await import(pathToFileURL(`${compileDir}/lib/vocabulary-studio.js`));
  const trustCenter = await import(pathToFileURL(`${compileDir}/lib/trust-center.js`));
  const searchRecovery = await import(pathToFileURL(`${compileDir}/lib/search-recovery.js`));
  const searchTuning = await import(pathToFileURL(`${compileDir}/lib/search-tuning.js`));
  const publicExperience = await import(pathToFileURL(`${compileDir}/lib/public-experience.js`));
  const widgetSnippet = await import(pathToFileURL(`${compileDir}/lib/widget-snippet.js`));
  const experienceLaunch = await import(pathToFileURL(`${compileDir}/lib/experience-launch.js`));
  const experienceRegistry = await import(pathToFileURL(`${compileDir}/lib/experience-registry.js`));
  const launchPacket = await import(pathToFileURL(`${compileDir}/lib/launch-packet.js`));
  const launchContract = await import(pathToFileURL(`${compileDir}/lib/launch-contract.js`));
  const storefrontQaRunbook = await import(pathToFileURL(`${compileDir}/lib/storefront-qa-runbook.js`));
  const launchReadinessReport = await import(pathToFileURL(`${compileDir}/lib/launch-readiness-report.js`));
  const advisorRecovery = await import(pathToFileURL(`${compileDir}/lib/advisor-recovery.js`));
  const discoveryGaps = await import(pathToFileURL(`${compileDir}/lib/discovery-gaps.js`));
  const dashboardCommandCenter = await import(pathToFileURL(`${compileDir}/lib/dashboard-command-center.js`));
  const configuratorReadiness = await import(pathToFileURL(`${compileDir}/lib/configurator-readiness.js`));
  const conversionPlaybook = await import(pathToFileURL(`${compileDir}/lib/conversion-playbook.js`));
  const commercialImpact = await import(pathToFileURL(`${compileDir}/lib/commercial-impact.js`));
  const starterKitHelpers = await import(pathToFileURL(`${compileDir}/lib/starter-kits.js`));
  const decisionGraph = await import(pathToFileURL(`${compileDir}/lib/decision-graph.js`));
  const launchChannels = await import(pathToFileURL(`${compileDir}/lib/launch-channels.js`));
  const syndication = await import(pathToFileURL(`${compileDir}/lib/syndication.js`));
  const storefrontSandbox = await import(pathToFileURL(`${compileDir}/lib/storefront-sandbox.js`));
  const experiments = await import(pathToFileURL(`${compileDir}/lib/experiments.js`));
  const releaseCenter = await import(pathToFileURL(`${compileDir}/lib/release-center.js`));
  const workspaceSnapshot = await import(pathToFileURL(`${compileDir}/lib/workspace-snapshot.js`));

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
  const traceReport = recommendationTrace.buildRecommendationTraceReport({ quiz: demo.demoQuiz, products: demo.demoProducts, answers, audits });
  assert(traceReport.topProduct?.productId === "prod_trail" && traceReport.summary.includes("Terra Trail Runner"), "Expected recommendation trace to explain the deterministic winning product");
  assert(traceReport.products.some((product) => product.status === "blocked") && traceReport.tuningActions.length, "Expected recommendation trace to include blocked products and tuning actions");
  const scenarioCoverageReport = scenarioCoverage.buildScenarioCoverageReport(demo.demoQuiz, demo.demoProducts);
  assert(scenarioCoverageReport.summary.scenarios > 1 && scenarioCoverageReport.summary.answerCoverageRate > 0 && scenarioCoverageReport.summary.routeCoverageRate > 0, "Expected scenario coverage to sweep multiple branch-aware finder paths");
  assert(scenarioCoverageReport.productCoverage.some((product) => product.surfacedInScenarios > 0) && scenarioCoverageReport.actions.length, "Expected scenario coverage to expose product coverage and merchant actions");
  const blockedScenarioCoverage = scenarioCoverage.buildScenarioCoverageReport(undefined, demo.demoProducts);
  assert(blockedScenarioCoverage.status === "blocked" && blockedScenarioCoverage.actions.some((action) => action.id === "create-finder"), "Expected missing finder scenario coverage to guide finder creation");
  const flowStudioReport = flowStudio.buildFlowStudioReport({ quiz: demo.demoQuiz, products: demo.demoProducts });
  assert(flowStudioReport.nodes.some((node) => node.type === "welcome") && flowStudioReport.nodes.some((node) => node.type === "result"), "Expected Flow Studio to include welcome and result nodes");
  assert(flowStudioReport.edges.some((edge) => edge.answerId && edge.label === "Trails & outdoors"), "Expected Flow Studio to expose answer edges");
  assert(flowStudioReport.summary.branchingAnswers > 0 && flowStudioReport.summary.routeScenarios > 0, "Expected Flow Studio to summarize branching and route QA");
  assert(flowStudioReport.routes.some((route) => route.topProducts.some((product) => product.id === "prod_trail")), "Expected Flow Studio route QA to surface deterministic top products");
  assert(flowStudioReport.packet.includes("Findly visual flow studio packet") && flowStudioReport.packet.includes("Answer route map"), "Expected Flow Studio to generate a copyable flow packet");
  const explanationGroundingReport = explanationGrounding.buildExplanationGroundingReport({ products: demo.demoProducts, quizzes: [demo.demoQuiz], openaiConfigured: false });
  assert(explanationGroundingReport.summary.auditedRecommendations > 0 && explanationGroundingReport.score > 0, "Expected explanation grounding to audit recommendation copy against product facts");
  assert(explanationGroundingReport.audits.every((audit) => audit.sampleExplanation && audit.factCount > 0), "Expected explanation grounding audits to include sample copy and fact counts");
  const blockedExplanationGrounding = explanationGrounding.buildExplanationGroundingReport({ products: demo.demoProducts, quizzes: [] });
  assert(blockedExplanationGrounding.status === "fail" && blockedExplanationGrounding.actions.some((action) => action.id === "create-explanation-scenarios"), "Expected missing finder explanation grounding to guide scenario creation");

  let selected = [];
  selected = utils.updateConfiguratorSelection(demo.demoConfigurator, selected, "config_step_base", "config_opt_terra");
  selected = utils.updateConfiguratorSelection(demo.demoConfigurator, selected, "config_step_conditions", "config_opt_mud");
  selected = utils.updateConfiguratorSelection(demo.demoConfigurator, selected, "config_step_comfort", "config_opt_max_cushion");
  selected = utils.updateConfiguratorSelection(demo.demoConfigurator, selected, "config_step_addons", "config_opt_care");

  const cloud = demo.demoConfigurator.steps[0].options.find((option) => option.id === "config_opt_cloud");
  assert(utils.getConfiguratorTotal(demo.demoConfigurator, selected) === 166, "Expected configured trail kit total to be £166");
  assert(utils.getConfiguratorProgress(demo.demoConfigurator, selected) === 100, "Expected configured trail kit progress to be 100%");
  assert(utils.optionConflictsWithSelection(cloud, selected, demo.demoConfigurator), "Expected Cloud Rest to conflict with wet/mud trail selection");
  const cloudGuidance = configuratorGuidance.buildConfiguratorOptionGuidance(demo.demoConfigurator, "config_opt_cloud", selected);
  assert(cloudGuidance?.blocked && cloudGuidance.explanation.includes("Wet trails & mud"), "Expected configurator guidance to explain the selected compatibility conflict");
  const selectionGuidance = configuratorGuidance.buildConfiguratorSelectionGuidance(demo.demoConfigurator, selected);
  assert(selectionGuidance.blockedOptions.length > 0 && selectionGuidance.summary.includes("blocked"), "Expected configurator selection guidance to summarize blocked options");
  const configuratorQaReport = configuratorQa.buildConfiguratorQaReport([demo.demoConfigurator], demo.demoProducts);
  assert(configuratorQaReport.summary.completionScenarios > 0 && configuratorQaReport.summary.productLinkedScenarioRate > 0, "Expected configurator QA to simulate completed, product-linked bundles");
  assert(configuratorQaReport.summary.compatibilityGuardrails > 0 && configuratorQaReport.summary.failedGuardrails === 0, "Expected configurator QA to verify incompatible option guardrails");
  assert(configuratorQaReport.actions.length || configuratorQaReport.score > 0, "Expected configurator QA to produce a score or remediation actions");
  const brokenConfiguratorQa = configuratorQa.buildConfiguratorQaReport([{ ...demo.demoConfigurator, steps: [{ ...demo.demoConfigurator.steps[0], options: [] }] }], demo.demoProducts);
  assert(brokenConfiguratorQa.status === "fail" && brokenConfiguratorQa.actions.some((action) => action.id === "fix-configurator-completion" || action.id === "create-configurator-qa"), "Expected broken configurator QA to produce launch-blocking actions");
  const configuratorBlueprintReport = configuratorBlueprint.buildConfiguratorBlueprint(demo.demoProducts, "Generate a trail kit configurator");
  assert(configuratorBlueprintReport.canGenerate && configuratorBlueprintReport.suggestion.steps.length >= 2, "Expected configurator blueprint to generate multi-step visual selling flow");
  assert(configuratorBlueprintReport.compatibilityRules > 0 && configuratorBlueprintReport.suggestion.steps.some((step) => step.options.some((option) => option.product_id)), "Expected configurator blueprint to include product-linked options and compatibility guardrails");
  const blockedConfiguratorBlueprint = configuratorBlueprint.buildConfiguratorBlueprint([{ ...demo.demoProducts[0], id: "single_config_product" }], "");
  assert(!blockedConfiguratorBlueprint.canGenerate && blockedConfiguratorBlueprint.status === "blocked", "Expected configurator blueprint to block generation for a single-product catalog");

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
  assert(demo.demoEvents.some((event) => typeof event.metadata?.findly_source === "string" && typeof event.metadata?.findly_page_url === "string"), "Expected seeded analytics to include storefront attribution metadata");
  assert(demo.demoEvents.some((event) => event.event_type === "product_recommended" && typeof event.metadata?.rank === "number"), "Expected seeded recommendation analytics to include rank metadata");
  assert(demo.demoEvents.some((event) => event.event_type === "quiz_complete" && typeof event.metadata?.result_count === "number"), "Expected seeded completion analytics to include result count metadata");

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
  const qualityReport = analyticsQuality.buildAnalyticsQualityReport([
    { id: "qa1", user_id: "demo-user", quiz_id: "quiz_footwear", event_type: "widget_view", metadata: { session_id: "qa", experience_type: "finder", experience_id: "quiz_footwear" }, created_at: "2026-06-25T10:00:00Z" },
    { id: "qa2", user_id: "demo-user", quiz_id: "quiz_footwear", event_type: "quiz_start", metadata: { session_id: "qa", experience_type: "finder", experience_id: "quiz_footwear" }, created_at: "2026-06-25T10:01:00Z" },
    { id: "qa3", user_id: "demo-user", quiz_id: "quiz_footwear", event_type: "quiz_complete", metadata: { session_id: "qa", experience_type: "finder", experience_id: "quiz_footwear", result_count: 1 }, created_at: "2026-06-25T10:02:00Z" },
    { id: "qa4", user_id: "demo-user", quiz_id: "quiz_footwear", product_id: "prod_trail", event_type: "product_recommended", metadata: { session_id: "qa", experience_type: "finder", experience_id: "quiz_footwear", rank: 1, product_name: "Terra Trail Runner" }, created_at: "2026-06-25T10:03:00Z" },
    { id: "qa5", user_id: "demo-user", quiz_id: "quiz_footwear", product_id: "prod_trail", event_type: "buy_click", metadata: { session_id: "qa", experience_type: "finder", experience_id: "quiz_footwear", product_name: "Terra Trail Runner" }, created_at: "2026-06-25T10:04:00Z" },
  ]);
  assert(qualityReport.status === "healthy" && qualityReport.summary.completeEventTypes === 5, "Expected complete analytics event contract to pass QA");
  const brokenQualityReport = analyticsQuality.buildAnalyticsQualityReport([
    { id: "bad1", user_id: "demo-user", quiz_id: "quiz_footwear", event_type: "buy_click", metadata: { experience_type: "finder" }, created_at: "2026-06-25T10:00:00Z" },
  ]);
  assert(brokenQualityReport.status === "needs-attention" && brokenQualityReport.summary.missingRequiredMetadata > 0, "Expected broken analytics events to fail QA");
  const journeyReport = journeyInsights.buildShopperJourneyReport(analyticsEvents, demo.demoProducts);
  assert(journeyReport.summary.sessions === 2 && journeyReport.summary.completed === 1, "Expected journey report to group events into anonymous sessions");
  assert(journeyReport.summary.abandonedAfterStart === 0 && journeyReport.dropoffs.some((item) => item.stage === "completed"), "Expected journey report to expose deterministic drop-off stages");
  assert(journeyReport.journeys[0].steps.some((step) => step.label.includes("Completed")), "Expected journey report to preserve shopper path steps");
  const attributionReport = attribution.buildAttributionReport([
    { id: "attr1", user_id: "demo-user", quiz_id: "quiz_footwear", event_type: "widget_view", metadata: { session_id: "attr-a", experience_type: "finder", experience_id: "quiz_footwear", findly_source: "homepage", findly_campaign: "spring-guide", findly_placement: "hero", findly_page_url: "https://store.example/" }, created_at: "2026-06-25T10:00:00Z" },
    { id: "attr2", user_id: "demo-user", quiz_id: "quiz_footwear", event_type: "quiz_start", metadata: { session_id: "attr-a", experience_type: "finder", experience_id: "quiz_footwear", findly_source: "homepage", findly_campaign: "spring-guide", findly_placement: "hero", findly_page_url: "https://store.example/" }, created_at: "2026-06-25T10:01:00Z" },
    { id: "attr3", user_id: "demo-user", quiz_id: "quiz_footwear", event_type: "quiz_complete", metadata: { session_id: "attr-a", experience_type: "finder", experience_id: "quiz_footwear", result_count: 1, findly_source: "homepage", findly_campaign: "spring-guide", findly_placement: "hero", findly_page_url: "https://store.example/" }, created_at: "2026-06-25T10:02:00Z" },
    { id: "attr4", user_id: "demo-user", quiz_id: "quiz_footwear", product_id: "prod_trail", event_type: "buy_click", metadata: { session_id: "attr-a", experience_type: "finder", experience_id: "quiz_footwear", product_name: "Terra Trail Runner", findly_source: "homepage", findly_campaign: "spring-guide", findly_placement: "hero", findly_page_url: "https://store.example/" }, created_at: "2026-06-25T10:03:00Z" },
    { id: "attr5", user_id: "demo-user", quiz_id: "quiz_footwear", event_type: "widget_view", metadata: { session_id: "attr-b", experience_type: "finder", experience_id: "quiz_footwear" }, created_at: "2026-06-25T10:04:00Z" },
    { id: "attr6", user_id: "demo-user", quiz_id: "quiz_footwear", event_type: "quiz_start", metadata: { session_id: "attr-b", experience_type: "finder", experience_id: "quiz_footwear" }, created_at: "2026-06-25T10:05:00Z" },
  ]);
  assert(attributionReport.summary.attributionRate === 67 && attributionReport.channels[0]?.source === "homepage", "Expected attribution report to score labelled widget traffic by source");
  assert(attributionReport.actions.some((item) => item.id === "label-widget-traffic") && attributionReport.actions.some((item) => item.id === "scale-winning-source"), "Expected attribution report to recommend labels and winning-source scale-up");
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
  const gapReport = discoveryGaps.buildDiscoveryGapReport([
    { id: "g1", user_id: "demo-user", quiz_id: "quiz_footwear", event_type: "quiz_start", metadata: { session_id: "g1", experience_type: "search", query: "orthopedic office shoe under 90", terms: ["orthopedic", "office"], result_count: 0 }, created_at: "2026-06-25T10:01:00Z" },
    { id: "g2", user_id: "demo-user", quiz_id: "quiz_footwear", event_type: "quiz_complete", metadata: { session_id: "g2", experience_type: "finder", result_count: 1, recovery_status: "thin-results", answer_summary: ["Office comfort"] }, created_at: "2026-06-25T10:02:00Z" },
    { id: "g3", user_id: "demo-user", quiz_id: "quiz_footwear", product_id: "prod_cloud", event_type: "product_recommended", metadata: { session_id: "g3", experience_type: "search", product_name: "Cloud Rest Walker", confidence: "low", score: 0.4 }, created_at: "2026-06-25T10:03:00Z" },
    { id: "g4", user_id: "demo-user", quiz_id: "quiz_footwear", product_id: "prod_cloud", event_type: "product_recommended", metadata: { session_id: "g4", experience_type: "finder", product_name: "Cloud Rest Walker" }, created_at: "2026-06-25T10:04:00Z" },
  ], demo.demoProducts);
  assert(gapReport.status === "needs-attention" && gapReport.summary.zeroResultJourneys === 1, "Expected discovery gap report to flag no-result journeys");
  assert(gapReport.termGaps.some((gap) => gap.term === "orthopedic" && gap.coverage === "missing"), "Expected discovery gap report to identify missing shopper language");
  assert(gapReport.summary.lowConfidenceRecommendations === 1 && gapReport.productGaps.some((gap) => gap.productName === "Cloud Rest Walker"), "Expected discovery gap report to flag low-confidence and stalled product gaps");
  assert(gapReport.actions[0]?.id === "fix-no-result-paths", "Expected discovery gap report to prioritize no-result fixes first");
  const advisorRecoveryReport = advisorRecovery.buildAdvisorRecoveryReport({
    query: "trail shoes under £10",
    products: demo.demoProducts,
    intent: { maxBudget: 10, terms: ["trail"] },
    matches: [],
    status: "recommendations",
  });
  assert(advisorRecoveryReport.status === "no-results" && advisorRecoveryReport.budgetBlocked, "Expected advisor recovery to flag no-result budget blockers");
  assert(advisorRecoveryReport.suggestions.some((suggestion) => suggestion.id === "relax-budget") && advisorRecoveryReport.nearMisses.length, "Expected advisor recovery to suggest budget relaxation and near misses");
  const advisorStudioReport = advisorStudio.buildAdvisorStudioReport({ products: demo.demoProducts, quizzes: [demo.demoQuiz], events: demo.demoEvents, settings: demo.demoSettings, origin: "https://findly.example", focusPrompt: "trail comfort for rainy weekends" });
  assert(advisorStudioReport.scenarios.length > 0 && advisorStudioReport.activeScenario.prompt.includes("trail comfort"), "Expected Advisor Studio to build a prompt QA suite with the focused prompt");
  assert(advisorStudioReport.activeScenario.results.some((result) => result.product.id === "prod_trail"), "Expected Advisor Studio to surface deterministic advisor product matches");
  assert(advisorStudioReport.checks.some((check) => check.id === "published-context") && advisorStudioReport.actions.length, "Expected Advisor Studio to expose readiness checks and actions");
  assert(advisorStudioReport.snippet.includes('data-experience="assistant"') && advisorStudioReport.packet.includes("Findly Advisor Studio packet"), "Expected Advisor Studio to generate assistant snippets and packets");
  const commandCenter = dashboardCommandCenter.buildDashboardCommandCenter({ products: demo.demoProducts, quizzes: [demo.demoQuiz], configurators: [demo.demoConfigurator], events: demo.demoEvents, settings: demo.demoSettings });
  assert(commandCenter.snapshot.widget_view > 0 && commandCenter.performance.length === 14, "Expected dashboard command center to build real 14-day analytics");
  assert(commandCenter.launchScore > 0 && commandCenter.catalogScore >= 80 && commandCenter.summary.readyFinders === 1, "Expected dashboard command center to summarize launch readiness");
  assert(commandCenter.experienceMix.search > 0 && commandCenter.experienceMix.configurator > 0, "Expected dashboard command center to calculate real experience mix");
  assert(commandCenter.actions.length && commandCenter.milestones.some((item) => item.id === "analytics" && item.done), "Expected dashboard command center to produce actions and milestone status");
  const playbook = conversionPlaybook.buildConversionPlaybook({ products: demo.demoProducts, quizzes: [demo.demoQuiz], configurators: [demo.demoConfigurator], events: demo.demoEvents, settings: demo.demoSettings });
  assert(playbook.actions.length && playbook.score >= 0 && playbook.summary.analyticsQualityScore >= 0, "Expected conversion playbook to produce prioritized merchant actions");
  const emptyPlaybook = conversionPlaybook.buildConversionPlaybook({ products: [], quizzes: [], configurators: [], events: [], settings: demo.demoSettings });
  assert(emptyPlaybook.status === "blocked" && emptyPlaybook.actions.some((action) => action.id === "generate-first-session" || action.id === "publish-experience"), "Expected empty conversion playbook to guide first launch actions");
  const impactReport = commercialImpact.buildCommercialImpactReport(demo.demoEvents, demo.demoProducts);
  assert(impactReport.summary.influencedRevenue > 0 && impactReport.summary.unclickedRecommendedValue >= 0, "Expected commercial impact report to estimate assisted and unclicked product value");
  assert(impactReport.topProducts.length && impactReport.actions.length && impactReport.confidence.includes("not checkout-order attribution"), "Expected commercial impact report to expose product paths, actions and confidence boundaries");
  const emptyImpactReport = commercialImpact.buildCommercialImpactReport([], demo.demoProducts);
  assert(emptyImpactReport.status === "empty" && emptyImpactReport.actions.some((action) => action.id === "capture-first-impact-session"), "Expected empty commercial impact report to guide first revenue proof actions");

  const importPreview = catalogImport.normalizeCatalogImportRows([
    { title: "Trail Shoe", "sale price": "£1,299.50", collection: "Footwear", attributes: "Grip|Waterproof", keywords: "trail,wet", benefits: "wet-weather protection|outdoor confidence", "semantic text": "Rain-ready trail grip for weekend hikes", link: "store.example/trail" },
    { name: "", price: "not-a-price", category: "" },
    { title: "Trail Shoe", "sale price": "99", collection: "Footwear" },
  ]);
  assert(importPreview.summary.valid === 2 && importPreview.summary.invalid === 1, "Expected CSV import normalizer to separate valid and invalid rows");
  assert(importPreview.products[0].price === 1299.5 && importPreview.products[0].product_url === "https://store.example/trail", "Expected CSV import normalizer to clean aliased price and URL fields");
  assert(importPreview.products[0].buyer_needs?.includes("wet-weather protection") && importPreview.products[0].search_text?.includes("Rain-ready"), "Expected CSV import normalizer to preserve buyer-needs and semantic search text");
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
  const benefitReport = catalogBenefits.buildCatalogBenefitReport(demo.demoProducts);
  assert(benefitReport.coverage >= 60 && benefitReport.benefits.length >= 3, "Expected catalog benefit report to translate demo product signals into shopper benefits");
  assert(benefitReport.benefits.some((benefit) => benefit.id === "wet-weather" || benefit.id === "trail-grip"), "Expected benefit report to detect weather or trail confidence benefits");
  assert(benefitReport.suggestedQuestion.options.length, "Expected benefit report to produce benefit-led question options");
  const benefitIntentTerms = catalogBenefits.expandBenefitIntentTokens("I need wet-weather protection");
  assert(benefitIntentTerms.includes("water") && benefitIntentTerms.includes("rain"), "Expected benefit intent expansion to map shopper benefit language to concrete catalog terms");
  const attributeReport = attributeStudio.buildAttributeStudioReport(demo.demoProducts);
  assert(attributeReport.summary.normalizedAttributes > 0 && attributeReport.attributes.some((attribute) => attribute.canonicalValue.includes("wet-weather") || attribute.canonicalValue.includes("outdoor")), "Expected Attribute Studio to normalize catalog benefit attributes");
  assert(attributeReport.productTasks.length >= 0 && attributeReport.actions.length, "Expected Attribute Studio to expose product cleanup tasks or ready actions");
  assert(attributeReport.glossary.includes("Findly normalized attribute glossary") && attributeReport.packet.includes("Findly Attribute Studio packet"), "Expected Attribute Studio to generate copyable glossary and packet text");
  const shopperLanguagePlan = shopperLanguagePlanner.buildShopperLanguagePlan({ products: demo.demoProducts, quizzes: [demo.demoQuiz], events: demo.demoEvents });
  assert(shopperLanguagePlan.score > 0 && shopperLanguagePlan.summary.coveredTerms > 0, "Expected shopper language planner to score catalog-backed vocabulary coverage");
  assert(shopperLanguagePlan.missingTerms.some((term) => term.term === "orthopedic" || term.term === "office"), "Expected shopper language planner to detect missing observed shopper vocabulary");
  assert(shopperLanguagePlan.actions.some((action) => action.id === "add-missing-shopper-language"), "Expected shopper language planner to create enrichment actions from missing query terms");
  assert(shopperLanguagePlan.productAudits.some((audit) => audit.suggestedSearchText.includes(audit.productName)), "Expected shopper language planner to create product-level search text suggestions");
  const vocabularyReport = vocabularyStudio.buildVocabularyStudioReport({ products: demo.demoProducts, quizzes: [demo.demoQuiz], events: demo.demoEvents });
  assert(vocabularyReport.summary.terms > 0 && vocabularyReport.summary.synonymClusters > 0, "Expected Vocabulary Studio to produce terms and synonym clusters");
  assert(vocabularyReport.unsupportedTerms.some((term) => term.label === "Orthopedic" || term.label === "Office"), "Expected Vocabulary Studio to expose unsupported observed shopper language");
  assert(vocabularyReport.governance.some((item) => item.id === "observed-language"), "Expected Vocabulary Studio to include governance checks");
  assert(vocabularyReport.glossary.includes("Findly approved discovery vocabulary") && vocabularyReport.packet.includes("Findly Vocabulary Studio packet"), "Expected Vocabulary Studio to generate copyable glossary and packet text");
  const trustReport = trustCenter.buildTrustCenterReport({ products: demo.demoProducts, quizzes: [demo.demoQuiz], configurators: [demo.demoConfigurator], events: demo.demoEvents, openaiConfigured: false });
  assert(trustReport.pillars.some((pillar) => pillar.id === "deterministic-selection") && trustReport.pillars.some((pillar) => pillar.id === "grounded-ai"), "Expected Trust Center to audit deterministic selection and grounded AI");
  assert(trustReport.principles.some((principle) => principle.label === "Rules select. AI explains."), "Expected Trust Center to document the AI selection boundary");
  assert(trustReport.aiBoundary.some((item) => item.includes("Rules select products first")) && trustReport.dataBoundary.some((item) => item.includes("anonymous session IDs")), "Expected Trust Center to expose AI and data boundaries");
  assert(trustReport.packet.includes("Findly AI trust packet") && trustReport.packet.includes("Runtime guardrails"), "Expected Trust Center to generate a copyable trust packet");
  const generatedSuggestion = quizGeneration.buildOntologyQuizSuggestion(demo.demoProducts, "Help shoppers choose the right footwear");
  assert(generatedSuggestion.questions.length >= 2, "Expected ontology-guided quiz generation to produce multiple questions");
  assert(generatedSuggestion.questions.some((question) => question.options.some((option) => option.match_type === "category" || option.match_type === "tag" || option.match_type === "feature")), "Expected generated quiz to use ontology-backed catalog rules");
  assert(generatedSuggestion.questions.some((question) => question.options.some((option) => option.match_type === "budget_max")), "Expected generated quiz to include a budget question");
  const generationSummary = quizGeneration.buildQuizGenerationOntologySummary(demo.demoProducts);
  assert(generationSummary.categoryClusters.length >= 2 && generationSummary.suggestedQuestions.length, "Expected quiz generation summary to expose ontology context");
  const blueprint = quizBlueprint.buildQuizBlueprint(demo.demoProducts, "Help shoppers choose technical footwear");
  assert(blueprint.canGenerate && blueprint.score >= 70 && blueprint.questions.length >= 2, "Expected quiz blueprint to be generation-ready for the demo catalog");
  assert(blueprint.questions.some((question) => question.options.some((option) => option.status === "matched" && option.productCount > 0)), "Expected quiz blueprint to expose matched option coverage");
  const thinBlueprint = quizBlueprint.buildQuizBlueprint([{ ...demo.demoProducts[0], id: "single_blueprint_product" }], "");
  assert(!thinBlueprint.canGenerate && thinBlueprint.status === "blocked" && thinBlueprint.risks.length, "Expected quiz blueprint to block generation for a single-product catalog");

  const trailSearch = searchEngine.runSemanticProductSearch({ query: "waterproof hiking shoes under £140", products: demo.demoProducts, limit: 3 });
  assert(trailSearch.intent.maxBudget === 140 && trailSearch.intent.terms.includes("trail"), "Expected semantic search to parse budget and expanded hiking/trail intent");
  assert(trailSearch.intent.coverage.some((item) => item.term === "trail" && item.status !== "missing"), "Expected semantic search coverage to identify catalog-backed terms");
  assert(trailSearch.results[0]?.product.id === "prod_trail", `Expected semantic search to rank Terra Trail Runner first, got ${trailSearch.results[0]?.product.name || "nothing"}`);
  assert(trailSearch.results[0]?.matchedSignals.some((signal) => signal.source === "budget"), "Expected semantic search to include budget eligibility signals");
  const benefitSearch = searchEngine.runSemanticProductSearch({ query: "wet-weather protection under £140", products: demo.demoProducts, limit: 3 });
  assert(benefitSearch.intent.terms.includes("water") && benefitSearch.results[0]?.product.id === "prod_trail", "Expected benefit-aware search to translate wet-weather protection into water-resistant product evidence");
  const citySearch = searchEngine.runSemanticProductSearch({ query: "lightweight city travel shoe", products: demo.demoProducts, limit: 3 });
  assert(citySearch.results[0]?.product.id === "prod_city", `Expected semantic search to rank Aero City Knit first, got ${citySearch.results[0]?.product.name || "nothing"}`);
  const budgetSearch = searchEngine.runSemanticProductSearch({ query: "running shoes under £100", products: demo.demoProducts, limit: 4 });
  assert(budgetSearch.blockedProducts >= 2 && budgetSearch.results.every((result) => result.product.price <= 100), "Expected semantic search budget constraints to block over-budget products");
  const impossibleBudgetSearch = searchEngine.runSemanticProductSearch({ query: "trail shoes under £10", products: demo.demoProducts, limit: 3 });
  const searchRecoveryReport = searchRecovery.buildSearchRecoveryReport(impossibleBudgetSearch);
  assert(impossibleBudgetSearch.results.length === 0 && impossibleBudgetSearch.nearMisses.length > 0, "Expected impossible budget search to return blocked near misses");
  assert(searchRecoveryReport.status === "no-results" && searchRecoveryReport.budgetBlocked && searchRecoveryReport.suggestions.some((suggestion) => suggestion.id === "relax-budget"), "Expected search recovery to suggest relaxing impossible budgets");
  const uncoveredSearch = searchEngine.runSemanticProductSearch({ query: "orthopedic office shoe", products: demo.demoProducts, limit: 3 });
  assert(uncoveredSearch.intent.coverage.some((item) => item.status === "missing"), "Expected semantic search coverage to flag missing catalog terms");
  const tuningReport = searchTuning.buildSearchTuningReport(uncoveredSearch);
  assert(tuningReport.score < 80 && tuningReport.opportunities.some((item) => item.severity === "critical"), "Expected search tuning to produce critical guidance for missing terms");
  const healthyTuningReport = searchTuning.buildSearchTuningReport(trailSearch);
  assert(healthyTuningReport.counts.covered > 0 && healthyTuningReport.opportunities.length, "Expected search tuning to summarize healthy catalog-backed terms");

  const normalizedSettings = publicExperience.normalizeWidgetSettings({ brand_name: "Acme Labs", primary_color: "not-a-colour", widget_title: "Find the right setup", welcome_message: "Tell us what matters most.", button_text: "Start matching", launcher_position: "bottom-left" });
  assert(normalizedSettings.primary_color === "#22352a" && normalizedSettings.launcher_position === "bottom-left", "Expected public settings normalization to sanitize invalid colors while preserving valid launcher placement");
  const publicCopy = publicExperience.buildPublicExperienceCopy("assistant", normalizedSettings);
  assert(publicCopy.brandName === "Acme Labs" && publicCopy.title === "Find the right setup" && publicCopy.assistantGreeting === "Tell us what matters most.", "Expected public experience copy to reuse merchant widget settings");

  const generatedWidgetSnippet = widgetSnippet.buildWidgetSnippet({ origin: "https://findly.example", experience: "search", mode: "inline", id: "quiz_footwear", color: "#22352a", label: "Search products", position: "right", campaign: "spring-guide", placement: "category-hero" });
  assert(generatedWidgetSnippet.includes('data-experience="search"') && generatedWidgetSnippet.includes('data-mode="inline"') && generatedWidgetSnippet.includes('data-id="quiz_footwear"') && generatedWidgetSnippet.includes('data-campaign="spring-guide"') && generatedWidgetSnippet.includes('data-placement="category-hero"'), "Expected widget helper to generate a complete attributed search embed snippet");
  const blockedInstallReport = widgetSnippet.buildWidgetInstallReport({ origin: "http://store.example", experience: "finder", mode: "modal", color: "#22352a", label: "Find my match", position: "right" });
  assert(!blockedInstallReport.canInstall && blockedInstallReport.checks.some((item) => item.id === "id" && item.severity === "blocker"), "Expected widget install report to block placeholder/missing experience IDs");
  const readyInstallReport = widgetSnippet.buildWidgetInstallReport({ origin: "https://findly.example", experience: "finder", mode: "modal", id: "quiz_footwear", color: "#22352a", label: "Find my match", position: "right" });
  assert(readyInstallReport.canInstall && readyInstallReport.targetPath === "/finder/quiz_footwear", "Expected widget install report to pass for a complete finder embed");
  const launchCards = experienceLaunch.buildLaunchExperienceCards({ origin: "https://findly.example", settings: demo.demoSettings, finders: [demo.demoQuiz], configurators: [demo.demoConfigurator], mode: "modal" });
  assert(launchCards.length === 4 && launchCards.every((card) => card.snippet.includes(`data-experience="${card.experience}"`)), "Expected launch experience helper to generate snippets for all four embeddable experiences");
  assert(launchCards.find((card) => card.experience === "assistant")?.id === demo.demoQuiz.id && launchCards.find((card) => card.experience === "search")?.targetPath === "/search/quiz_footwear", "Expected advisor/search launch cards to reuse the published finder context");
  assert(launchCards.find((card) => card.experience === "configurator")?.targetPath === "/configurator/config_trail_kit", "Expected configurator launch card to use the published configurator context");
  const registryReport = experienceRegistry.buildExperienceRegistry({ origin: "https://findly.example", settings: demo.demoSettings, quizzes: [demo.demoQuiz], configurators: [demo.demoConfigurator], events: demo.demoEvents });
  assert(registryReport.surfaces.length === 4 && registryReport.surfaces.every((surface) => surface.snippet.includes(`data-experience="${surface.experience}"`)), "Expected Experience Registry to inventory all embeddable surfaces");
  assert(registryReport.surfaces.some((surface) => surface.experience === "assistant") && registryReport.surfaces.some((surface) => surface.experience === "configurator"), "Expected Experience Registry to include advisor and configurator surfaces");
  assert(registryReport.packet.includes("Findly Experience Registry packet") && registryReport.summary.totalViews >= 0, "Expected Experience Registry to generate a deployment packet and metrics");
  const packet = launchPacket.buildLaunchPacket({
    origin: "https://findly.example/",
    publicUrl: "https://findly.example/finder/footwear-finder",
    widgetExperience: "Guided product finder",
    embedSnippet: generatedWidgetSnippet,
    installReport: readyInstallReport,
    settings: demo.demoSettings,
    finder: demo.demoQuiz,
    activeProducts: demo.demoProducts.length,
    enrichedPercent: 75,
  });
  assert(packet.includes("Findly launch packet") && packet.includes("Stable embed ID: quiz_footwear"), "Expected launch packet to include a title and stable embed ID");
  assert(packet.includes("Analytics events tracked") && packet.includes("buy_click"), "Expected launch packet to document analytics events");
  assert(packet.includes(generatedWidgetSnippet), "Expected launch packet to include the generated embed snippet");
  const contract = launchContract.buildLaunchContract({
    config: { origin: "https://findly.example", experience: "finder", mode: "modal", id: "quiz_footwear", color: "#22352a", label: "Find my match", position: "right" },
    installReport: readyInstallReport,
    publicUrl: "https://findly.example/finder/quiz_footwear",
    activeProducts: demo.demoProducts.length,
    enrichedPercent: 75,
  });
  assert(contract.apiEndpoints.includes("https://findly.example/api/widget.js") && contract.events.some((event) => event.event === "buy_click"), "Expected launch contract to include runtime endpoints and buy-click analytics");
  const contractText = launchContract.formatLaunchContract(contract);
  assert(contractText.includes("Analytics contract") && contractText.includes('data-experience="finder"'), "Expected formatted launch contract to document analytics and widget attributes");
  const runbook = storefrontQaRunbook.buildStorefrontQaRunbook({
    contract,
    embedSnippet: generatedWidgetSnippet,
    experienceLabel: "Guided finder",
    experienceName: "Footwear finder",
  });
  assert(runbook.steps.length >= 5 && runbook.analyticsEvents.includes("buy_click"), "Expected storefront QA runbook to include manual QA steps and analytics proof points");
  const runbookText = storefrontQaRunbook.formatStorefrontQaRunbook(runbook);
  assert(runbookText.includes("Acceptance criteria") && runbookText.includes("/api/events") && runbookText.includes(generatedWidgetSnippet), "Expected formatted storefront QA runbook to include acceptance criteria, analytics endpoint and embed snippet");

  const channelEvents = [
    { id: "channel_view", user_id: "demo-user", quiz_id: "quiz_footwear", event_type: "widget_view", metadata: { experience_type: "finder", findly_source: "homepage", findly_campaign: "findly-homepage-guide", findly_placement: "homepage-hero" }, created_at: "2026-06-25T12:00:00Z" },
    { id: "channel_start", user_id: "demo-user", quiz_id: "quiz_footwear", event_type: "quiz_start", metadata: { experience_type: "finder", findly_source: "homepage", findly_campaign: "findly-homepage-guide", findly_placement: "homepage-hero" }, created_at: "2026-06-25T12:01:00Z" },
    { id: "channel_complete", user_id: "demo-user", quiz_id: "quiz_footwear", event_type: "quiz_complete", metadata: { experience_type: "finder", findly_source: "homepage", findly_campaign: "findly-homepage-guide", findly_placement: "homepage-hero", result_count: 2 }, created_at: "2026-06-25T12:02:00Z" },
    { id: "channel_rec", user_id: "demo-user", quiz_id: "quiz_footwear", product_id: "prod_trail", event_type: "product_recommended", metadata: { experience_type: "finder", findly_source: "homepage", findly_campaign: "findly-homepage-guide", findly_placement: "homepage-hero", rank: 1, product_name: "Terra Trail Runner" }, created_at: "2026-06-25T12:03:00Z" },
    { id: "channel_click", user_id: "demo-user", quiz_id: "quiz_footwear", product_id: "prod_trail", event_type: "buy_click", metadata: { experience_type: "finder", findly_source: "homepage", findly_campaign: "findly-homepage-guide", findly_placement: "homepage-hero", product_name: "Terra Trail Runner" }, created_at: "2026-06-25T12:04:00Z" },
  ];
  const channelReport = launchChannels.buildLaunchChannelReport({
    origin: "https://findly.example",
    settings: demo.demoSettings,
    finders: [demo.demoQuiz],
    configurators: [demo.demoConfigurator],
    events: channelEvents,
  });
  assert(channelReport.channels.length === 4 && channelReport.summary.installReady === 4, "Expected launch channels to generate four install-ready storefront placements");
  assert(channelReport.packet.includes("Findly launch channel packet") && channelReport.packet.includes("data-campaign=\"findly-homepage-guide\""), "Expected launch channel packet to include attributed snippets");
  const homepageChannel = channelReport.channels.find((channel) => channel.id === "homepage-finder");
  assert(homepageChannel?.status === "live" && homepageChannel.metrics.clicks === 1 && homepageChannel.metrics.clickRate === 100, "Expected attributed homepage channel events to produce live channel metrics");
  assert(channelReport.channels.some((channel) => channel.id === "pdp-configurator" && channel.snippet.includes('data-experience="configurator"')), "Expected PDP channel to generate configurator embed snippet");
  assert(channelReport.channels.some((channel) => channel.id === "category-inline-search" && channel.snippet.includes('data-mode="inline"') && channel.snippet.includes('data-experience="search"')), "Expected category channel to generate inline search embed snippet");

  const partnerEvents = [
    { id: "partner_view", user_id: "demo-user", quiz_id: "quiz_footwear", event_type: "widget_view", metadata: { experience_type: "assistant", findly_medium: "syndication", findly_source: "retailer", findly_campaign: "findly-syndication-retailer-pdp-advisor", findly_placement: "partner-pdp-advisor" }, created_at: "2026-06-25T13:00:00Z" },
    { id: "partner_start", user_id: "demo-user", quiz_id: "quiz_footwear", event_type: "quiz_start", metadata: { experience_type: "assistant", findly_medium: "syndication", findly_source: "retailer", findly_campaign: "findly-syndication-retailer-pdp-advisor", findly_placement: "partner-pdp-advisor" }, created_at: "2026-06-25T13:01:00Z" },
    { id: "partner_rec", user_id: "demo-user", quiz_id: "quiz_footwear", product_id: "prod_trail", event_type: "product_recommended", metadata: { experience_type: "assistant", findly_medium: "syndication", findly_source: "retailer", findly_campaign: "findly-syndication-retailer-pdp-advisor", findly_placement: "partner-pdp-advisor", product_name: "Terra Trail Runner" }, created_at: "2026-06-25T13:02:00Z" },
    { id: "partner_click", user_id: "demo-user", quiz_id: "quiz_footwear", product_id: "prod_trail", event_type: "buy_click", metadata: { experience_type: "assistant", findly_medium: "syndication", findly_source: "retailer", findly_campaign: "findly-syndication-retailer-pdp-advisor", findly_placement: "partner-pdp-advisor", product_name: "Terra Trail Runner" }, created_at: "2026-06-25T13:03:00Z" },
  ];
  const syndicationReport = syndication.buildSyndicationReport({
    origin: "https://findly.example",
    settings: demo.demoSettings,
    products: demo.demoProducts,
    quizzes: [demo.demoQuiz],
    configurators: [demo.demoConfigurator],
    events: partnerEvents,
  });
  assert(syndicationReport.placements.length >= 5 && syndicationReport.summary.installReady === syndicationReport.placements.length, "Expected partner syndication to produce install-ready partner packages");
  assert(syndicationReport.packet.includes("Findly partner syndication packet") && syndicationReport.packet.includes("Partner acceptance criteria"), "Expected partner syndication packet to include title and acceptance criteria");
  assert(syndicationReport.packet.includes('data-medium="syndication"') && syndicationReport.packet.includes('data-campaign="findly-syndication-retailer-pdp-advisor"'), "Expected partner syndication snippets to include syndication attribution");
  const retailerSyndication = syndicationReport.placements.find((placement) => placement.id === "retailer-pdp-advisor");
  assert(retailerSyndication?.status === "live" && retailerSyndication.metrics.clicks === 1 && retailerSyndication.metrics.clickValue > 0, "Expected retailer partner events to produce live syndication metrics");
  assert(syndicationReport.placements.some((placement) => placement.id === "marketplace-buying-guide" && placement.snippet.includes('data-mode="inline"') && placement.snippet.includes('data-experience="finder"')), "Expected marketplace package to generate an inline finder snippet");
  assert(syndicationReport.placements.some((placement) => placement.id === "sales-rep-configurator" && placement.snippet.includes('data-experience="configurator"')), "Expected sales partner package to include configurator syndication");
  assert(syndicationReport.governance.some((item) => item.id === "partner-boundary" && item.status === "pass"), "Expected syndication governance to confirm partner-safe boundaries");

  const sandboxReport = storefrontSandbox.buildStorefrontSandboxReport({
    origin: "https://findly.example",
    settings: demo.demoSettings,
    finders: [demo.demoQuiz],
    configurators: [demo.demoConfigurator],
    events: channelEvents,
  });
  assert(sandboxReport.cases.length === 4 && sandboxReport.summary.expectedEvents >= 16, "Expected storefront sandbox to generate QA cases and expected event contracts for all channels");
  assert(sandboxReport.packet.includes("Findly storefront QA sandbox packet") && sandboxReport.packet.includes("Acceptance criteria:"), "Expected storefront sandbox to generate a copyable QA packet");
  assert(sandboxReport.cases.some((item) => item.id === "homepage-finder" && item.status === "verified" && item.expectedEvents.some((event) => event.event === "buy_click")), "Expected homepage sandbox case to be verified by attributed QA telemetry");
  assert(sandboxReport.cases.some((item) => item.id === "category-inline-search" && item.mode === "inline" && item.snippet.includes('data-experience="search"')), "Expected category sandbox case to render inline search QA");
  assert(sandboxReport.cases.every((item) => item.acceptanceCriteria.some((criterion) => criterion.includes("data-source")) && item.qaSteps.length >= 5), "Expected every sandbox case to include attribution acceptance criteria and QA steps");

  const experimentReport = experiments.buildExperimentPlanningReport({
    origin: "https://findly.example",
    settings: demo.demoSettings,
    products: demo.demoProducts,
    quizzes: [demo.demoQuiz],
    configurators: [demo.demoConfigurator],
    events: [
      ...demo.demoEvents,
      ...channelEvents.map((event) => ({
        ...event,
        metadata: { ...event.metadata, session_id: "experiment-session", experience_id: "quiz_footwear" },
      })),
    ],
  });
  assert(experimentReport.experiments.length >= 6 && experimentReport.score > 0, "Expected experiment planner to produce a scored experiment backlog");
  assert(experimentReport.experiments.some((experiment) => experiment.id === "launcher-promise" && experiment.rollbackPlan && experiment.successCriteria.length), "Expected launcher experiment to include rollback and success criteria");
  assert(experimentReport.experiments.some((experiment) => experiment.id === "inline-semantic-search" && experiment.href === "/dashboard/channels"), "Expected semantic search experiment to route through Launch Channels");
  assert(experimentReport.experiments.some((experiment) => experiment.id === "channel-attribution-contract" && experiment.primaryMetric.label === "Attribution rate"), "Expected attribution experiment to use attribution quality as a primary metric");
  assert(experimentReport.guardrails.some((guardrail) => guardrail.id === "deterministic-selection" && guardrail.status === "pass"), "Expected experiment planner to include deterministic-selection guardrails");
  assert(experimentReport.packet.includes("Findly experiment plan") && experimentReport.packet.includes("Rollback:"), "Expected experiment planner to generate a copyable packet");

  const releaseCandidate = releaseCenter.buildReleaseCandidate({
    origin: "https://findly.example",
    settings: demo.demoSettings,
    products: demo.demoProducts,
    quizzes: [demo.demoQuiz],
    configurators: [demo.demoConfigurator],
    events: [
      ...demo.demoEvents,
      ...channelEvents.map((event) => ({ ...event, metadata: { ...event.metadata, session_id: "release-session", experience_id: "quiz_footwear" } })),
    ],
    generatedAt: new Date("2026-06-25T12:00:00Z"),
  });
  assert(releaseCandidate.id === "findly-20260625" && releaseCandidate.gates.length >= 8, "Expected Release Center to build a dated release candidate with launch gates");
  assert(["go", "review", "no-go"].includes(releaseCandidate.decision) && releaseCandidate.score >= 0, "Expected release candidate to produce a go/no-go decision and score");
  assert(releaseCandidate.scope.some((item) => item.label === "Launch channels") && releaseCandidate.summary.installReadyChannels >= 1, "Expected release candidate to include launch channel scope");
  assert(releaseCandidate.rollbackPlan.length >= 5 && releaseCandidate.releaseNotes.includes("Rollback plan"), "Expected release candidate to include rollback notes");
  assert(releaseCandidate.releaseNotes.includes("Findly release candidate") && releaseCandidate.releaseNotes.includes("Launch gates"), "Expected release candidate to generate copyable release notes");

  const snapshot = workspaceSnapshot.buildWorkspaceSnapshot({
    origin: "https://findly.example",
    settings: demo.demoSettings,
    products: demo.demoProducts,
    quizzes: [demo.demoQuiz],
    configurators: [demo.demoConfigurator],
    events: [
      ...demo.demoEvents,
      ...channelEvents.map((event) => ({ ...event, metadata: { ...event.metadata, session_id: "snapshot-session", experience_id: "quiz_footwear" } })),
    ],
    generatedAt: new Date("2026-06-25T12:00:00Z"),
  });
  assert(snapshot.id === "snapshot-northstar-goods-20260625" && snapshot.archive.version === "findly-workspace-snapshot-v1", "Expected Workspace Snapshot to build a dated versioned archive");
  assert(snapshot.exportFiles.some((file) => file.id === "json" && file.filename === "snapshot-northstar-goods-20260625.json"), "Expected Workspace Snapshot to name export files from the snapshot ID");
  assert(snapshot.productCsv.includes("Terra Trail Runner") && snapshot.productCsv.includes("buyer_needs"), "Expected Workspace Snapshot to export product CSV with discovery fields");
  assert(snapshot.analyticsCsv.includes("widget_view") && snapshot.analyticsCsv.includes("findly_campaign"), "Expected Workspace Snapshot to export attribution-aware analytics CSV");
  assert(snapshot.handoff.includes("Findly workspace snapshot") && snapshot.handoff.includes("Release decision") && snapshot.handoff.includes("Restore plan"), "Expected Workspace Snapshot to generate copyable handoff notes");
  assert(snapshot.archive.launch_channels.channels.some((channel) => channel.snippet.includes("data-experience")), "Expected Workspace Snapshot archive to include launch snippets");
  assert(snapshot.checks.some((item) => item.id === "release") && snapshot.sections.some((item) => item.id === "channels"), "Expected Workspace Snapshot to expose release and channel checks");
  assert(!snapshot.json.includes("user_id") && !snapshot.json.includes("OPENAI") && !snapshot.json.includes("SUPABASE"), "Expected Workspace Snapshot JSON to avoid user IDs and environment secret names");
  assert(snapshot.archive.analytics.recent_events.every((event) => !("session_id" in event.metadata)), "Expected Workspace Snapshot to omit session IDs from shared analytics metadata");

  assert(starterKitHelpers.starterKits.length >= 3, "Expected multiple vertical starter kits");
  const firstStarterKit = starterKitHelpers.starterKits[0];
  const starterReadiness = starterKitHelpers.buildStarterKitReadiness(firstStarterKit);
  assert(starterReadiness.status === "ready" && starterReadiness.score >= 80, "Expected starter kit readiness to pass before install");
  const starterPayload = starterKitHelpers.materializeStarterKit(firstStarterKit, "demo-user");
  assert(starterPayload.products.length >= 3 && starterPayload.quiz.questions.length >= 3 && starterPayload.configurator.steps.length >= 2, "Expected starter kit install payload to include products, finder and configurator");
  const starterProductIds = new Set(starterPayload.products.map((item) => item.id));
  const linkedConfiguratorProductIds = starterPayload.configurator.steps.flatMap((step) => step.options.map((option) => option.product_id).filter(Boolean));
  assert(linkedConfiguratorProductIds.length >= 3 && linkedConfiguratorProductIds.every((id) => starterProductIds.has(id)), "Expected starter configurator product links to point at generated products");
  const starterQuestionIds = new Set(starterPayload.quiz.questions.map((question) => question.id));
  const branchTargets = starterPayload.quiz.questions.flatMap((question) => question.options.map((option) => option.next_question_id).filter(Boolean));
  assert(branchTargets.length > 0 && branchTargets.every((id) => starterQuestionIds.has(id)), "Expected starter finder branches to point at generated questions");
  const starterConfiguratorOptionIds = new Set(starterPayload.configurator.steps.flatMap((step) => step.options.map((option) => option.id)));
  const incompatibleOptionIds = starterPayload.configurator.steps.flatMap((step) => step.options.flatMap((option) => option.incompatible_option_ids));
  assert(incompatibleOptionIds.length > 0 && incompatibleOptionIds.every((id) => starterConfiguratorOptionIds.has(id)), "Expected starter configurator compatibility rules to point at generated options");

  const graphReport = decisionGraph.buildDecisionGraph({ products: demo.demoProducts, quizzes: [demo.demoQuiz], configurators: [demo.demoConfigurator], events: demo.demoEvents });
  assert(graphReport.score >= 70 && graphReport.nodes.length > 0 && graphReport.edges.length > 0, "Expected decision graph to build a connected report for the demo workspace");
  assert(graphReport.lanes.length === 4 && graphReport.lanes.every((lane) => typeof lane.score === "number"), "Expected decision graph to score catalog, finder, configurator and language lanes");
  assert(graphReport.ruleAudits.some((audit) => audit.answerLabel === "Trails & outdoors" && audit.status === "pass" && audit.linkedProducts.includes("Terra Trail Runner")), "Expected decision graph to connect finder answer rules to catalog products");
  assert(graphReport.configuratorAudits.some((audit) => audit.optionLabel === "Terra Trail Runner" && audit.linkedProductName === "Terra Trail Runner"), "Expected decision graph to connect configurator options to products");
  assert(graphReport.actions.length && graphReport.hotspots.length, "Expected decision graph to produce merchant actions and influential graph hotspots");
  const graphWithLanguageGap = decisionGraph.buildDecisionGraph({
    products: demo.demoProducts,
    quizzes: [demo.demoQuiz],
    configurators: [demo.demoConfigurator],
    events: [
      ...demo.demoEvents,
      { id: "gap_event", user_id: "demo-user", quiz_id: "quiz_footwear", event_type: "quiz_complete", metadata: { experience_type: "search", query: "orthopedic office shoe", terms: ["orthopedic", "office"], result_count: 0, recovery_status: "no-results" }, created_at: "2026-06-25T12:00:00Z" },
    ],
  });
  assert(graphWithLanguageGap.termAudits.some((audit) => audit.term === "orthopedic" && audit.status === "fail"), "Expected decision graph to detect unresolved observed shopper language");
  assert(graphWithLanguageGap.actions.some((action) => action.id === "map-unresolved-shopper-language"), "Expected decision graph to recommend mapping unresolved shopper language");

  const readyQuiz = quizReadiness.analyzeQuizReadiness(demo.demoQuiz, demo.demoProducts);
  assert(readyQuiz.canPublish && readyQuiz.score >= 80, "Expected seeded demo finder to pass publish-readiness checks");
  const qaReport = recommendationQa.buildRecommendationQaReport([demo.demoQuiz], demo.demoProducts);
  assert(qaReport.summary.scenariosChecked >= 2 && qaReport.summary.thinResultScenarios >= 1, "Expected recommendation QA to check multiple seeded finder paths and flag thin result sets");
  assert(qaReport.scenarios.every((scenario) => scenario.answers.length && scenario.visitedQuestions.length), "Expected recommendation QA scenarios to include answer and question paths");
  const impossibleQa = recommendationQa.buildRecommendationQaReport([demo.demoQuiz], demo.demoProducts.map((product) => ({ ...product, active: false })));
  assert(impossibleQa.blockers.length > 0 && impossibleQa.status === "fail", "Expected recommendation QA to fail when no active products can be recommended");
  const impossibleAnswers = [
    { questionId: "q_budget", question: "Budget?", optionId: "o_10", answer: "Under £10", matchType: "budget_max", matchValue: "10", weight: 5 },
  ];
  const impossibleAudits = utils.auditProductMatches(demo.demoProducts, impossibleAnswers);
  const recoveryReport = recommendationRecovery.buildRecommendationRecoveryReport({ products: demo.demoProducts, answers: impossibleAnswers, audits: impossibleAudits, recommendedCount: 0 });
  assert(recoveryReport.status === "no-results" && recoveryReport.blockers.some((blocker) => blocker.reason === "Above selected budget"), "Expected no-result recovery to identify budget blockers");
  assert(recoveryReport.suggestions.some((suggestion) => suggestion.id === "relax-budget") && recoveryReport.closestProducts.length, "Expected no-result recovery to suggest widening budget and show closest catalog options");
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

  const readinessReport = launchReadinessReport.buildLaunchReadinessReport([
    {
      id: "environment",
      label: "Environment",
      description: "Runtime setup",
      status: "warn",
      checks: [
        { id: "app-url", label: "App URL", description: "Production origin", status: "pass", detail: "URL configured." },
        { id: "openai", label: "OpenAI key", description: "AI quality", status: "warn", detail: "Fallbacks will run." },
      ],
    },
    {
      id: "recommendation-qa",
      label: "Recommendation reliability",
      description: "Synthetic shopper tests",
      status: "fail",
      checks: [
        { id: "qa-no-results", label: "No-result paths", description: "Paths should recommend products", status: "fail", detail: "One path returned no eligible products.", actionHref: "/dashboard/lab", actionLabel: "Debug paths" },
      ],
    },
  ]);
  assert(readinessReport.status === "blocked" && readinessReport.score < 80, "Expected launch readiness report to block launch when recommendation QA fails");
  assert(readinessReport.nextActions[0]?.priority === "critical" && readinessReport.nextActions[0]?.actionHref === "/dashboard/lab", "Expected launch readiness report to prioritize critical QA blockers");
  assert(readinessReport.coverage.some((item) => item.id === "recommendation-qa" && item.blockers === 1), "Expected launch readiness coverage to summarize blocker counts by section");

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
  assertPublicBrandingRuntime();
  assertExplanationRuntimeSafety();
  assertSessionAnalytics();
  assertPublicRuntimeGuardrails();
  assertLaunchStudioWorkflow();
  assertDashboardCommandCenterWorkflow();
  assertStarterKitWorkflow();
  assertVocabularyStudioWorkflow();
  assertDecisionGraphWorkflow();
  assertTrustCenterWorkflow();
  assertFlowStudioWorkflow();
  assertExperienceRegistryWorkflow();
  assertLaunchChannelsWorkflow();
  assertPartnerSyndicationWorkflow();
  assertStorefrontSandboxWorkflow();
  assertReleaseCenterWorkflow();
  assertWorkspaceSnapshotWorkflow();
  assertExperimentPlannerWorkflow();
  assertCommercialImpactWorkflow();
  assertSemanticSearchWorkflow();
  assertAdvisorStudioWorkflow();
  assertAttributeStudioWorkflow();
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
