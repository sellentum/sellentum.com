export type LaunchCheckStatus = "pass" | "warn" | "fail";

export type LaunchReportCheck = {
  id: string;
  label: string;
  description: string;
  status: LaunchCheckStatus;
  detail: string;
  actionHref?: string;
  actionLabel?: string;
};

export type LaunchReportSection = {
  id: string;
  label: string;
  description: string;
  status: LaunchCheckStatus;
  checks: LaunchReportCheck[];
};

export type LaunchActionPriority = "critical" | "high" | "medium" | "low";

export type LaunchAction = {
  id: string;
  title: string;
  detail: string;
  evidence: string;
  priority: LaunchActionPriority;
  owner: string;
  impact: string;
  effort: "Small" | "Medium" | "Large";
  actionHref?: string;
  actionLabel?: string;
  checkIds: string[];
};

export type LaunchCoverageItem = {
  id: string;
  label: string;
  status: LaunchCheckStatus;
  score: number;
  passed: number;
  warnings: number;
  blockers: number;
  checks: number;
};

export type LaunchReadinessReport = {
  status: "ready" | "review" | "blocked";
  score: number;
  headline: string;
  narrative: string;
  confidence: "high" | "medium" | "low";
  counts: {
    checks: number;
    passed: number;
    warnings: number;
    blockers: number;
  };
  coverage: LaunchCoverageItem[];
  nextActions: LaunchAction[];
  strengths: string[];
};

const sectionWeights: Record<string, number> = {
  environment: 1.1,
  catalog: 1.15,
  experiences: 1.25,
  "recommendation-qa": 1.3,
  "embed-analytics": 1.1,
};

const priorityWeight: Record<LaunchActionPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function statusScore(status: LaunchCheckStatus) {
  if (status === "pass") return 1;
  if (status === "warn") return 0.58;
  return 0;
}

function sectionOwner(section: LaunchReportSection) {
  if (section.id === "environment") return "Engineering";
  if (section.id === "catalog") return "Catalog";
  if (section.id === "experiences") return "Experience";
  if (section.id === "recommendation-qa") return "Recommendation QA";
  if (section.id === "embed-analytics") return "Growth";
  return section.label;
}

function sectionImpact(section: LaunchReportSection, check: LaunchReportCheck) {
  if (section.id === "environment") return check.id === "openai" ? "AI quality" : "Production runtime";
  if (section.id === "catalog") return check.id.includes("semantic") || check.id.includes("enrichment") ? "Search relevance" : "Recommendation quality";
  if (section.id === "experiences") return "Launch coverage";
  if (section.id === "recommendation-qa") return "Recommendation reliability";
  if (check.id.includes("event") || check.id.includes("session") || check.id.includes("intent")) return "Measurement";
  return "Conversion";
}

function checkEffort(check: LaunchReportCheck) {
  if (["app-url", "openai", "settings", "event-volume", "session-events", "intent-events"].includes(check.id)) return "Small";
  if (check.id.includes("readiness") || check.id.includes("qa") || check.id.includes("catalog-")) return "Medium";
  if (check.id.includes("supabase") || check.id.includes("semantic-runtime")) return "Medium";
  return "Small";
}

function checkPriority(section: LaunchReportSection, check: LaunchReportCheck): LaunchActionPriority {
  if (check.status === "fail") {
    if (section.id === "environment" || section.id === "experiences" || section.id === "recommendation-qa") return "critical";
    return "high";
  }

  if (section.id === "recommendation-qa") return "high";
  if (section.id === "environment" && check.id.includes("supabase")) return "high";
  if (section.id === "experiences" && (check.id.includes("readiness") || check.id === "advisor")) return "high";
  if (check.id === "openai" || check.id.includes("semantic") || check.id.includes("event") || check.id.includes("session")) return "medium";
  return "low";
}

function actionTitle(check: LaunchReportCheck) {
  const titles: Record<string, string> = {
    "app-url": "Set the production app URL",
    "supabase-client": "Connect Supabase browser keys",
    "supabase-service": "Add the server-only Supabase service key",
    openai: "Add OpenAI for richer enrichment and explanations",
    "catalog-catalog-size": "Add enough active products for meaningful choice",
    "catalog-core-copy": "Fill product descriptions",
    "catalog-matching-signals": "Add structured tags, features and buyer needs",
    "catalog-enrichment": "Run catalog enrichment",
    "catalog-semantic-text": "Add semantic discovery language",
    "catalog-commerce-assets": "Complete product images and commerce links",
    "catalog-taxonomy": "Normalize product categories",
    "semantic-runtime": "Prepare semantic candidate retrieval",
    "published-finder": "Publish one launch-ready finder",
    "finder-readiness": "Fix published finder readiness issues",
    advisor: "Make the conversational advisor launchable",
    configurator: "Publish a configurator when compatibility matters",
    "configurator-readiness": "Fix configurator readiness issues",
    "qa-scenarios": "Create testable shopper paths",
    "qa-no-results": "Fix no-result shopper paths",
    "qa-thin-results": "Improve recommendation depth",
    "qa-score": "Raise the recommendation QA score",
    settings: "Polish brand and widget settings",
    "widget-script": "Publish an embeddable experience",
    "event-volume": "Run a live end-to-end widget test",
    "session-events": "Verify anonymous session tracking",
    "intent-events": "Verify shopper-intent analytics",
  };

  return titles[check.id] || `Review ${check.label.toLowerCase()}`;
}

function actionDetail(section: LaunchReportSection, check: LaunchReportCheck) {
  if (check.status === "fail") {
    return `${check.label} is blocking launch in ${section.label.toLowerCase()}. ${check.description}`;
  }

  return `${check.label} is usable but needs review before a confident storefront launch. ${check.description}`;
}

function buildAction(section: LaunchReportSection, check: LaunchReportCheck): LaunchAction | null {
  if (check.status === "pass") return null;

  return {
    id: `${section.id}-${check.id}`,
    title: actionTitle(check),
    detail: actionDetail(section, check),
    evidence: check.detail,
    priority: checkPriority(section, check),
    owner: sectionOwner(section),
    impact: sectionImpact(section, check),
    effort: checkEffort(check),
    actionHref: check.actionHref,
    actionLabel: check.actionLabel,
    checkIds: [check.id],
  };
}

function buildCoverage(section: LaunchReportSection): LaunchCoverageItem {
  const checks = section.checks.length;
  const passed = section.checks.filter((check) => check.status === "pass").length;
  const warnings = section.checks.filter((check) => check.status === "warn").length;
  const blockers = section.checks.filter((check) => check.status === "fail").length;
  const score = checks ? Math.round(section.checks.reduce((sum, check) => sum + statusScore(check.status), 0) / checks * 100) : 100;

  return {
    id: section.id,
    label: section.label,
    status: section.status,
    score,
    passed,
    warnings,
    blockers,
    checks,
  };
}

function strengthCopy(check: LaunchReportCheck) {
  const strengths: Record<string, string> = {
    "published-finder": "A published product finder is available for embedding.",
    "finder-readiness": "Published finder structure is ready for shopper traffic.",
    "qa-no-results": "Synthetic finder paths avoid hard no-result dead ends.",
    "widget-script": "The copy-paste widget has at least one launchable target.",
    "settings": "Brand settings are complete enough for a polished storefront widget.",
    "event-volume": "Analytics events are already flowing into Findly.",
    "session-events": "Shopper sessions can be grouped into journey analytics.",
    "intent-events": "Zero-party intent metadata is being captured.",
    "catalog-matching-signals": "The catalog has structured signals for deterministic matching.",
    "catalog-commerce-assets": "Result cards have enough media and links to convert.",
  };

  return strengths[check.id] || `${check.label} is ready.`;
}

export function buildLaunchReadinessReport(sections: LaunchReportSection[]): LaunchReadinessReport {
  const checks = sections.flatMap((section) => section.checks.map((check) => ({ section, check })));
  const passed = checks.filter(({ check }) => check.status === "pass").length;
  const warnings = checks.filter(({ check }) => check.status === "warn").length;
  const blockers = checks.filter(({ check }) => check.status === "fail").length;

  const weighted = sections.reduce((acc, section) => {
    const weight = sectionWeights[section.id] || 1;
    const average = section.checks.length ? section.checks.reduce((sum, check) => sum + statusScore(check.status), 0) / section.checks.length : 1;
    return { points: acc.points + average * weight, weight: acc.weight + weight };
  }, { points: 0, weight: 0 });

  const score = weighted.weight ? Math.round(weighted.points / weighted.weight * 100) : 100;
  const status = blockers ? "blocked" : warnings ? "review" : "ready";
  const nextActions = checks
    .map(({ section, check }) => buildAction(section, check))
    .filter((action): action is LaunchAction => Boolean(action))
    .sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority] || a.effort.localeCompare(b.effort) || a.title.localeCompare(b.title));

  const strengths = checks
    .filter(({ check }) => check.status === "pass")
    .slice(0, 6)
    .map(({ check }) => strengthCopy(check));

  const headline = status === "ready"
    ? "Ready for a live storefront test"
    : status === "review"
      ? "Launchable after a focused review pass"
      : "Blocked until critical launch checks are fixed";

  const narrative = status === "ready"
    ? "Core catalog, experiences, recommendation reliability, embed setup and analytics checks are passing. Run one real storefront session before sending traffic."
    : status === "review"
      ? `${warnings} warning${warnings === 1 ? "" : "s"} need attention before a confident launch. Prioritise the highest-impact actions below.`
      : `${blockers} blocker${blockers === 1 ? "" : "s"} and ${warnings} warning${warnings === 1 ? "" : "s"} are preventing a reliable launch. Clear critical items first, then rerun preflight.`;

  return {
    status,
    score,
    headline,
    narrative,
    confidence: blockers ? "low" : warnings > 2 ? "medium" : "high",
    counts: {
      checks: checks.length,
      passed,
      warnings,
      blockers,
    },
    coverage: sections.map(buildCoverage),
    nextActions,
    strengths,
  };
}
