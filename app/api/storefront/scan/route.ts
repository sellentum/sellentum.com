import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceIdentity } from "@/lib/api-auth";
import { analyzeStorefrontInstall, validateStorefrontScanUrl } from "@/lib/storefront-install-scanner";

const scanSchema = z.object({
  url: z.string().min(8).max(600),
  appOrigin: z.string().url().optional(),
});

const MAX_HTML_BYTES = 650_000;
const TIMEOUT_MS = 9000;

async function fetchHtml(url: URL) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "FindlyInstallScanner/1.0",
      },
    });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok) throw new Error(`Storefront returned ${response.status}.`);
    if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new Error(`Storefront returned ${contentType || "a non-HTML response"}.`);
    }
    const text = await response.text();
    return text.slice(0, MAX_HTML_BYTES);
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  try {
    const identity = await getWorkspaceIdentity();
    if (!identity) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const parsed = scanSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid storefront scan request." }, { status: 400 });

    let scanUrl: URL;
    try {
      scanUrl = validateStorefrontScanUrl(parsed.data.url);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid storefront URL." }, { status: 400 });
    }

    const html = await fetchHtml(scanUrl);
    return NextResponse.json(analyzeStorefrontInstall({
      url: scanUrl.href,
      html,
      appOrigin: parsed.data.appOrigin,
    }));
  } catch (error) {
    console.error("Storefront scan failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not scan storefront install." }, { status: 500 });
  }
}
