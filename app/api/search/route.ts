import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceIdentity } from "@/lib/api-auth";
import { demoProducts } from "@/lib/demo-data";
import { runSemanticProductSearch } from "@/lib/search-engine";
import { buildSearchRecoveryReport } from "@/lib/search-recovery";
import type { Product } from "@/lib/types";

const searchSchema = z.object({
  query: z.string().min(1).max(300),
  limit: z.number().int().min(1).max(12).optional(),
});

export async function POST(request: Request) {
  try {
    const identity = await getWorkspaceIdentity();
    if (!identity) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const parsed = searchSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid search request." }, { status: 400 });

    let products: Product[] = demoProducts;
    if (identity.mode === "supabase" && identity.supabase) {
      const { data, error } = await identity.supabase.from("products").select("*").eq("user_id", identity.userId).order("updated_at", { ascending: false });
      if (error) throw error;
      products = (data || []) as Product[];
    }

    const report = runSemanticProductSearch({ query: parsed.data.query, products, limit: parsed.data.limit || 6 });
    return NextResponse.json({ ...report, recovery: buildSearchRecoveryReport(report) });
  } catch (error) {
    console.error("Search failed", error);
    return NextResponse.json({ error: "Could not run product search." }, { status: 500 });
  }
}
