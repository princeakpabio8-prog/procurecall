import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

type CreateRequestBody = {
  productOrService?: string;
  quantity?: string;
  targetBudget?: string;
  deliveryLocation?: string;
  instructions?: string;
  supplierPhone?: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown server error.";
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

    const { data: procurementRequest, error: requestError } =
      await supabase
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
      console.error(
        "Failed to create procurement request:",
        requestError,
      );

      return NextResponse.json(
        {
          error:
            requestError.message ||
            "Failed to save procurement request.",
        },
        { status: 500 },
      );
    }

    if (body.supplierPhone?.trim()) {
      const { error: supplierError } = await supabase
        .from("suppliers")
        .insert({
          procurement_request_id: procurementRequest.id,
          phone: body.supplierPhone.trim(),
          name: null,
          region: null,
        });

      if (supplierError) {
        console.error(
          "Failed to create supplier:",
          supplierError,
        );

        return NextResponse.json(
          {
            error:
              supplierError.message ||
              "Request was created, but the supplier could not be saved.",
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
    const message = getErrorMessage(error);

    console.error("Unexpected request API error:", error);

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}