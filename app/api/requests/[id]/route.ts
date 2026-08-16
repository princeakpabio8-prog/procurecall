import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Request ID is required." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: procurementRequest, error: requestError } = await supabase
      .from("procurement_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (requestError) {
      console.error("Failed to load procurement request:", requestError);

      return NextResponse.json(
        { error: "Procurement request not found." },
        { status: 404 },
      );
    }

    const { data: suppliers, error: supplierError } = await supabase
      .from("suppliers")
      .select("*")
      .eq("procurement_request_id", id)
      .order("created_at", { ascending: true });

    if (supplierError) {
      console.error("Failed to load suppliers:", supplierError);

      return NextResponse.json(
        {
          error:
            "Request was found, but suppliers could not be loaded.",
        },
        { status: 500 },
      );
    }

    // CALL-E saves completed calls in call_results.
    // Load the newest result belonging to this procurement request.
    const { data: callResult, error: callResultError } = await supabase
      .from("call_results")
      .select("*")
      .eq("procurement_request_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (callResultError) {
      console.error("Failed to load CALL-E result:", callResultError);

      return NextResponse.json(
        {
          error:
            "Request was found, but the CALL-E result could not be loaded.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      request: procurementRequest,
      suppliers: suppliers ?? [],
      callResult: callResult ?? null,
    });
  } catch (error) {
    console.error("Unexpected request detail API error:", error);

    return NextResponse.json(
      { error: "Failed to load procurement request." },
      { status: 500 },
    );
  }
}