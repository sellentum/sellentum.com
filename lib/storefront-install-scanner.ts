import type { WidgetEmbedExperience, WidgetEmbedMode } from "./widget-snippet";

export type StorefrontInstallScanStatus = "installed" | "partial" | "missing" | "blocked";
export type StorefrontInstallCheckStatus = "pass" | "warn" | "fail";
export type StorefrontInstallCheck = {
  id: string;
  label: string;
  status: StorefrontInstallCheckStatus;
  detail: string;
  evidence: string;
};

export type StorefrontInstallSnippet = {
  scriptSrc: string;
  experience?: WidgetEmbedExperience;
  mode?: WidgetEmbedMode;
  id?: string;
  source?: string;
  campaign?: string;
  placement?: string;
  height?: string;
};

export type StorefrontInstallScanReport = {
  status: StorefrontInstallScanStatus;
  score: number;
  url: string;
  host: string;
  scannedAt: string;
  summary: {
    scripts: number;
    sellentumScripts: number;
    inlineFrames: number;
    modalHints: number;
    attributionLabels: number;
    blockers: number;
    warnings: number;
  };
  snippets: StorefrontInstallSnippet[];
  checks: StorefrontInstallCheck[];
  recommendations: string[];
  packet: string;
};

const privateHostPatterns = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^0\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^::1$/,
  /^\[::1\]$/,
];

const validExperiences = new Set(["finder", "assistant", "search", "configurator"]);
const validModes = new Set(["modal", "inline"]);
const widgetScriptPattern = /\/(?:api\/)?widget\.js(?:\?|$)/i;
const widgetHintPattern = /sellentum|data-sellentum|Sellentum|(?:api\/)?widget\.js/g;

function stripQuotes(value = "") {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

function attr(tag: string, name: string) {
  const pattern = new RegExp(`${name}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, "i");
  return stripQuotes(tag.match(pattern)?.[1] || "");
}

function normalizeHtml(html: string) {
  return html.replace(/\s+/g, " ").trim();
}

function check(id: string, label: string, status: StorefrontInstallCheckStatus, detail: string, evidence: string): StorefrontInstallCheck {
  return { id, label, status, detail, evidence };
}

function statusFromChecks(checks: StorefrontInstallCheck[]): StorefrontInstallScanStatus {
  if (checks.some((item) => item.id === "url" && item.status === "fail")) return "blocked";
  if (checks.some((item) => item.id === "script" && item.status === "fail")) return "missing";
  if (checks.some((item) => item.status === "fail" || item.status === "warn")) return "partial";
  return "installed";
}

function scoreFromChecks(checks: StorefrontInstallCheck[]) {
  if (checks.some((item) => item.id === "url" && item.status === "fail")) return 0;
  const score = checks.reduce((sum, item) => sum + (item.status === "pass" ? 100 : item.status === "warn" ? 58 : 0), 0) / Math.max(1, checks.length);
  return Math.round(score);
}

export function validateStorefrontScanUrl(input: string) {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Enter a valid storefront URL.");
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only http and https storefront URLs can be scanned.");
  if (privateHostPatterns.some((pattern) => pattern.test(url.hostname))) throw new Error("Private, localhost and internal network URLs cannot be scanned from the server.");
  return url;
}

export function extractSellentumSnippets(html: string): StorefrontInstallSnippet[] {
  const scripts = html.match(/<script\b[^>]*>/gi) || [];
  return scripts
    .flatMap((tag): StorefrontInstallSnippet[] => {
      const scriptSrc = attr(tag, "src");
      if (!scriptSrc || !widgetScriptPattern.test(scriptSrc)) return [];
      const experience = attr(tag, "data-experience");
      const mode = attr(tag, "data-mode");
      return [{
        scriptSrc,
        experience: validExperiences.has(experience) ? experience as WidgetEmbedExperience : undefined,
        mode: validModes.has(mode) ? mode as WidgetEmbedMode : undefined,
        id: attr(tag, "data-id") || undefined,
        source: attr(tag, "data-source") || undefined,
        campaign: attr(tag, "data-campaign") || undefined,
        placement: attr(tag, "data-placement") || undefined,
        height: attr(tag, "data-height") || undefined,
      }];
    });
}

function buildChecks({ url, html, snippets, appOrigin }: { url: URL; html: string; snippets: StorefrontInstallSnippet[]; appOrigin?: string }) {
  const normalized = normalizeHtml(html);
  const sellentumFrames = (html.match(/<iframe\b[^>]*(finder|assistant|search|configurator)\//gi) || []).length;
  const modalHints = (normalized.match(widgetHintPattern) || []).length;
  const first = snippets[0];
  const attributionLabels = snippets.reduce((sum, snippet) => sum + [snippet.source, snippet.campaign, snippet.placement].filter(Boolean).length, 0);
  const scriptOrigin = first?.scriptSrc ? (() => {
    try { return new URL(first.scriptSrc, url.origin).origin; } catch { return ""; }
  })() : "";
  const expectedOrigin = appOrigin ? appOrigin.replace(/\/+$/, "") : "";
  return [
    check("url", "Storefront URL", "pass", `${url.origin} is eligible for server-side install scanning.`, url.href),
    snippets.length
      ? check("script", "Sellentum widget script", "pass", `${snippets.length} Sellentum widget script${snippets.length === 1 ? "" : "s"} found.`, snippets.map((snippet) => snippet.scriptSrc).join(", "))
      : check("script", "Sellentum widget script", "fail", "No script using /api/widget.js or /widget.js was found in the storefront HTML.", "Missing <script src=\".../api/widget.js\">"),
    first?.experience
      ? check("experience", "Experience type", "pass", `Installed experience is ${first.experience}.`, first.experience)
      : check("experience", "Experience type", snippets.length ? "fail" : "warn", "The widget script should include data-experience=\"finder|assistant|search|configurator\".", first?.scriptSrc || "No Sellentum script found."),
    first?.mode
      ? check("mode", "Embed mode", "pass", `Widget loads in ${first.mode} mode.`, first.mode)
      : check("mode", "Embed mode", snippets.length ? "fail" : "warn", "The widget script should include data-mode=\"modal\" or data-mode=\"inline\".", first?.scriptSrc || "No Sellentum script found."),
    first?.id && !first.id.startsWith("YOUR_")
      ? check("experience-id", "Published experience ID", "pass", `Widget points at published ID ${first.id}.`, first.id)
      : check("experience-id", "Published experience ID", snippets.length ? "fail" : "warn", "Replace placeholder IDs with a published finder/configurator ID before launch.", first?.id || "Missing data-id"),
    attributionLabels
      ? check("attribution", "Attribution labels", "pass", `${attributionLabels} explicit source/campaign/placement label${attributionLabels === 1 ? "" : "s"} found.`, snippets.map((snippet) => [snippet.source, snippet.campaign, snippet.placement].filter(Boolean).join(" / ")).filter(Boolean).join(", "))
      : check("attribution", "Attribution labels", "warn", "No explicit source, campaign or placement labels found; Sellentum will infer page context only.", "Missing data-source/data-campaign/data-placement"),
    url.protocol === "https:"
      ? check("https", "HTTPS storefront", "pass", "Storefront uses HTTPS.", url.origin)
      : check("https", "HTTPS storefront", "warn", "Use HTTPS before installing on production.", url.origin),
    expectedOrigin && scriptOrigin
      ? scriptOrigin === expectedOrigin
        ? check("origin", "Expected app origin", "pass", "Widget script origin matches the expected Sellentum app origin.", scriptOrigin)
        : check("origin", "Expected app origin", "warn", "Widget script origin differs from the expected app origin.", `${scriptOrigin} vs ${expectedOrigin}`)
      : check("origin", "Expected app origin", "warn", "Pass the expected Sellentum app origin to compare production snippet domains.", scriptOrigin || "No script origin"),
    first?.mode === "inline" && sellentumFrames
      ? check("iframe", "Inline iframe evidence", "pass", `${sellentumFrames} Sellentum iframe hint${sellentumFrames === 1 ? "" : "s"} found.`, `${sellentumFrames} iframe hints`)
      : first?.mode === "inline"
        ? check("iframe", "Inline iframe evidence", "warn", "Inline scripts may render after hydration; no static iframe was found in initial HTML.", "No static iframe")
        : check("iframe", "Modal lazy-load evidence", modalHints ? "pass" : "warn", "Modal widgets are expected to lazy-load iframes after shopper click.", `${modalHints} Sellentum/widget hint${modalHints === 1 ? "" : "s"}`),
  ];
}

function recommendations(checks: StorefrontInstallCheck[]) {
  const recs = checks
    .filter((item) => item.status !== "pass")
    .map((item) => {
      if (item.id === "script") return "Paste the Sellentum widget snippet from Widget Studio into the storefront page or theme.";
      if (item.id === "experience-id") return "Publish the finder/configurator and replace placeholder data-id values.";
      if (item.id === "attribution") return "Add data-source, data-campaign or data-placement labels before campaign launch.";
      if (item.id === "origin") return "Confirm the script src points at the production Sellentum/Vercel app URL.";
      if (item.id === "https") return "Move the storefront install target to HTTPS before production.";
      return item.detail;
    });
  return recs.length ? [...new Set(recs)].slice(0, 8) : ["Run one full shopper QA session and confirm widget_view, start, completion, recommendation and buy-click events in Analytics."];
}

function buildPacket(report: Omit<StorefrontInstallScanReport, "packet">) {
  return [
    "Sellentum storefront install scan",
    "==============================",
    "",
    `URL: ${report.url}`,
    `Status: ${report.status.toUpperCase()} · Score: ${report.score}%`,
    `Scanned: ${report.scannedAt}`,
    "",
    "Checks",
    ...report.checks.map((item) => `- [${item.status.toUpperCase()}] ${item.label}: ${item.detail} (${item.evidence})`),
    "",
    "Detected snippets",
    ...(report.snippets.length ? report.snippets.map((snippet) => `- ${snippet.scriptSrc} · ${snippet.experience || "missing experience"} · ${snippet.mode || "missing mode"} · ${snippet.id || "missing id"}`) : ["- None"]),
    "",
    "Recommended next tasks",
    ...report.recommendations.map((item) => `- ${item}`),
  ].join("\n");
}

export function analyzeStorefrontInstall({
  url,
  html,
  appOrigin,
  scannedAt = new Date(),
}: {
  url: string;
  html: string;
  appOrigin?: string;
  scannedAt?: Date;
}): StorefrontInstallScanReport {
  const parsedUrl = validateStorefrontScanUrl(url);
  const snippets = extractSellentumSnippets(html);
  const checks = buildChecks({ url: parsedUrl, html, snippets, appOrigin });
  const blockers = checks.filter((item) => item.status === "fail").length;
  const warnings = checks.filter((item) => item.status === "warn").length;
  const inlineFrames = (html.match(/<iframe\b/gi) || []).length;
  const modalHints = (html.match(/sellentum|(?:api\/)?widget\.js/gi) || []).length;
  const attributionLabels = snippets.reduce((sum, snippet) => sum + [snippet.source, snippet.campaign, snippet.placement].filter(Boolean).length, 0);
  const baseReport: Omit<StorefrontInstallScanReport, "packet"> = {
    status: statusFromChecks(checks),
    score: scoreFromChecks(checks),
    url: parsedUrl.href,
    host: parsedUrl.hostname,
    scannedAt: scannedAt.toISOString(),
    summary: {
      scripts: (html.match(/<script\b/gi) || []).length,
      sellentumScripts: snippets.length,
      inlineFrames,
      modalHints,
      attributionLabels,
      blockers,
      warnings,
    },
    snippets,
    checks,
    recommendations: recommendations(checks),
  };
  return { ...baseReport, packet: buildPacket(baseReport) };
}
