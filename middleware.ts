import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const DEFAULT_WORKSPACE_BRAND = "Your brand";

function isDefaultWorkspaceBrand(value: string | null | undefined) {
  const brand = value?.trim().toLowerCase();
  return !brand || brand === DEFAULT_WORKSPACE_BRAND.toLowerCase();
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");
  const isOnboarding = request.nextUrl.pathname.startsWith("/dashboard/onboarding");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (isDashboard && request.cookies.get("sellentum_demo_session")?.value !== "1") {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (isDashboard && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isDashboard && user && !isOnboarding) {
    const { data: settings } = await supabase
      .from("widget_settings")
      .select("brand_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (isDefaultWorkspaceBrand(settings?.brand_name)) {
      const onboardingUrl = request.nextUrl.clone();
      onboardingUrl.pathname = "/dashboard/onboarding";
      onboardingUrl.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(onboardingUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};
