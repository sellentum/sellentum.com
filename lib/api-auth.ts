import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DEMO_USER_ID } from "@/lib/demo-data";

export async function getWorkspaceIdentity() {
  const supabase = await createClient();
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    return user ? { userId: user.id, mode: "supabase" as const, supabase } : null;
  }

  const cookieStore = await cookies();
  if (cookieStore.get("findly_demo_session")?.value === "1") {
    return { userId: DEMO_USER_ID, mode: "demo" as const, supabase: null };
  }
  return null;
}
