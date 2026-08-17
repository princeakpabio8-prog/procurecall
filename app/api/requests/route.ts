import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("procurement_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load procurement requests:", error);
      return NextResponse.json(
        { error: "Failed to load procurement requests." },
        { status: 500 },
      );
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("Unexpected requests API error:", error);

    return NextResponse.json(
      { error: "Failed to load procurement requests." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      productOrService,
      quantity,
      targetBudget,
      deliveryLocation,
      supplierPhone,
      instructions,
    } = body;

    if (!productOrService) {
      return NextResponse.json(
        { error: "Product or service is required." },
        { status: 400 },
      );
    }

    if (!supplierPhone) {
      return NextResponse.json(
        { error: "Supplier phone number is required." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: procurementRequest, error: requestError } = await supabase
      .from("procurement_requests")
      .insert({
        product_or_service: productOrService,
        quantity: quantity || null,
        target_budget: targetBudget || null,
        delivery_location: deliveryLocation || null,
        instructions: instructions || null,
      })
      .select()
      .single();

    if (requestError || !procurementRequest) {
      console.error(
        "Failed to create procurement request:",
        requestError,
      );

      return NextResponse.json(
        {
          error:
            requestError?.message ||
            "Failed to create procurement request.",
        },
        { status: 500 },
      );
    }

    const { data: supplier, error: supplierError } = await supabase
      .from("suppliers")
      .insert({
        procurement_request_id: procurementRequest.id,
        phone: supplierPhone,
      })
      .select()
      .single();

    if (supplierError) {
      console.error("Failed to create supplier:", supplierError);

      // Remove the request if the supplier record could not be created.
      await supabase
        .from("procurement_requests")
        .delete()
        .eq("id", procurementRequest.id);

      return NextResponse.json(
        {
          error:
            supplierError.message ||
            "Failed to create supplier.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        request: procurementRequest,
        supplier,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create procurement request failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create procurement request.",
      },
      { status: 500 },
    );
  }
}