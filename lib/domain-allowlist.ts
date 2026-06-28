export type DomainAllowlistDecision = {
  allowed: boolean;
  restrictionActive: boolean;
  reason: string;
  checkedHosts: string[];
  matchedDomain?: string;
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function normalizeAllowedDomain(value: unknown) {
  if (typeof value !== "string") return "";
  let text = value.trim().toLowerCase();
  if (!text) return "";

  text = text.replace(/^https?:\/\//i, "").replace(/^\/\//, "");
  text = text.replace(/^\*\./, "");
  text = text.split(/[/?#]/)[0] || "";
  text = text.replace(/:\d+$/, "");
  text = text.replace(/^\[|\]$/g, "");
  text = text.replace(/^\.+|\.+$/g, "");
  if (text.startsWith("www.")) text = text.slice(4);
  if (!text || text === "*") return "";
  if (LOCAL_HOSTS.has(text)) return text;
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(text)) return "";
  return text;
}

export function normalizeAllowedDomains(input: unknown) {
  const rawItems = Array.isArray(input)
    ? input.flatMap((item) => (typeof item === "string" ? item.split(/[\n,]/) : []))
    : typeof input === "string"
      ? input.split(/[\n,]/)
      : [];

  return unique(rawItems.map(normalizeAllowedDomain)).slice(0, 50);
}

export function formatAllowedDomains(input: unknown) {
  return normalizeAllowedDomains(input).join("\n");
}

export function hostnameFromUrlLike(value: unknown) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;

  try {
    const url = new URL(text.includes("://") ? text : `https://${text}`);
    return normalizeAllowedDomain(url.hostname);
  } catch {
    return normalizeAllowedDomain(text) || null;
  }
}

export function isLocalhostHostname(hostname: string) {
  return LOCAL_HOSTS.has(normalizeAllowedDomain(hostname));
}

export function hostnameMatchesAllowedDomain(hostname: string, domain: string) {
  const host = normalizeAllowedDomain(hostname);
  const allowed = normalizeAllowedDomain(domain);
  if (!host || !allowed) return false;
  return host === allowed || host.endsWith(`.${allowed}`);
}

function metadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function requestHeaderHost(request: Request, header: string) {
  return hostnameFromUrlLike(request.headers.get(header) || "");
}

function hostMatchesAny(hostname: string, allowedDomains: string[]) {
  const matchedDomain = allowedDomains.find((domain) => hostnameMatchesAllowedDomain(hostname, domain));
  return matchedDomain ? { allowed: true as const, matchedDomain } : { allowed: false as const };
}

function isAppHost(hostname: string, appHosts: string[]) {
  return appHosts.some((host) => hostnameMatchesAllowedDomain(hostname, host));
}

export function evaluateStorefrontDomainAllowlist({
  allowedDomains,
  request,
  metadata,
  appUrl,
}: {
  allowedDomains: unknown;
  request: Request;
  metadata?: Record<string, unknown>;
  appUrl?: string;
}): DomainAllowlistDecision {
  const normalizedDomains = normalizeAllowedDomains(allowedDomains);
  if (!normalizedDomains.length) {
    return {
      allowed: true,
      restrictionActive: false,
      reason: "No storefront domain restriction is configured.",
      checkedHosts: [],
    };
  }

  const requestHost = hostnameFromUrlLike(request.url);
  const appHosts = unique([hostnameFromUrlLike(appUrl || ""), requestHost].filter((host): host is string => Boolean(host)));
  const pageHost = hostnameFromUrlLike(metadataString(metadata, "sellentum_page_url"));
  const isEmbeddedWidget = Boolean(
    metadataString(metadata, "sellentum_embed_mode") ||
    metadataString(metadata, "sellentum_widget_experience") ||
    metadataString(metadata, "sellentum_launcher_position"),
  );

  if (pageHost) {
    const match = hostMatchesAny(pageHost, normalizedDomains);
    if (match.allowed) {
      return {
        allowed: true,
        restrictionActive: true,
        reason: "Storefront page URL matches an approved workspace domain.",
        checkedHosts: [pageHost],
        matchedDomain: match.matchedDomain,
      };
    }
    if (isLocalhostHostname(pageHost)) {
      return {
        allowed: true,
        restrictionActive: true,
        reason: "Localhost storefront preview is allowed for development.",
        checkedHosts: [pageHost],
      };
    }
    if (!isEmbeddedWidget && isAppHost(pageHost, appHosts)) {
      return {
        allowed: true,
        restrictionActive: true,
        reason: "Direct Sellentum-hosted public page is allowed.",
        checkedHosts: [pageHost],
      };
    }
    return {
      allowed: false,
      restrictionActive: true,
      reason: "Storefront page URL is not in this workspace allowlist.",
      checkedHosts: [pageHost],
    };
  }

  const fallbackHosts = unique([
    requestHeaderHost(request, "origin"),
    requestHeaderHost(request, "referer"),
    hostnameFromUrlLike(metadataString(metadata, "sellentum_referrer")),
  ].filter((host): host is string => Boolean(host)));

  for (const host of fallbackHosts) {
    const match = hostMatchesAny(host, normalizedDomains);
    if (match.allowed) {
      return {
        allowed: true,
        restrictionActive: true,
        reason: "Request origin or referrer matches an approved workspace domain.",
        checkedHosts: fallbackHosts,
        matchedDomain: match.matchedDomain,
      };
    }
    if (isLocalhostHostname(host)) {
      return {
        allowed: true,
        restrictionActive: true,
        reason: "Localhost storefront preview is allowed for development.",
        checkedHosts: fallbackHosts,
      };
    }
  }

  return {
    allowed: false,
    restrictionActive: true,
    reason: fallbackHosts.length
      ? "Request origin or referrer is not in this workspace allowlist."
      : "No storefront page URL, origin, or referrer was available to validate.",
    checkedHosts: fallbackHosts,
  };
}
