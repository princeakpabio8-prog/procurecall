import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

type CreateRequestBody = {
  productOrService: string;
  quantity?: string;
  targetBudget?: string;
  deliveryLocation?: string;
  instructions?: string;
  supplierPhone?: string;
};

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: requests, error } = await supabase
      .from("procurement_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to list procurement requests:", error);
      return NextResponse.json(
        { error: "Failed to load procurement requests." },
        { status: 500 },
      );
    }

    return NextResponse.json({ requests: requests ?? [] });
  } catch (error) {
    console.error("Unexpected request list API error:", error);
    return NextResponse.json(
      { error: "Failed to load procurement requests." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateRequestBody;

    const productOrService = body.productOrService?.trim();

    if (!productOrService) {
      return NextResponse.json(
        { error: "Product or service is required." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: procurementRequest, error: requestError } = await supabase
      .from("procurement_requests")
      .insert({
        product_or_service: productOrService,
        quantity: body.quantity?.trim() || null,
        target_budget: body.targetBudget?.trim() || null,
        delivery_location: body.deliveryLocation?.trim() || null,
        instructions: body.instructions?.trim() || null,
        status: "draft",
      })
      .select()
      .single();

    if (requestError) {
      console.error("Failed to create procurement request:", requestError);

      return NextResponse.json(
        { error: "Failed to save procurement request." },
        { status: 500 },
      );
    }

    if (body.supplierPhone?.trim()) {
      const { error: supplierError } = await supabase.from("suppliers").insert({
        procurement_request_id: procurementRequest.id,
        phone: body.supplierPhone.trim(),
        name: null,
        region: null,
      });

      if (supplierError) {
        console.error("Failed to create supplier:", supplierError);

        return NextResponse.json(
          {
            error: "Request was created, but the supplier could not be saved.",
            requestId: procurementRequest.id,
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        request: procurementRequest,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unexpected request API error:", error);

    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 },
    );
  }
}

