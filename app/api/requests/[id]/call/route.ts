import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Request ID is required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.CALLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "CALLE_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const supabase = createAdminClient();

    const {
      data: procurementRequest,
      error: requestError,
    } = await supabase
      .from("procurement_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (requestError || !procurementRequest) {
      console.error(
        "Failed to load procurement request:",
        requestError
      );

      return NextResponse.json(
        { error: "Procurement request not found." },
        { status: 404 }
      );
    }

    const {
      data: suppliers,
      error: supplierError,
    } = await supabase
      .from("suppliers")
      .select("*")
      .eq("procurement_request_id", id)
      .order("created_at", { ascending: true });

    if (supplierError) {
      console.error(
        "Failed to load suppliers:",
        supplierError
      );

      return NextResponse.json(
        { error: "Suppliers could not be loaded." },
        { status: 500 }
      );
    }

    const supplier = suppliers?.[0];

    if (!supplier?.phone) {
      return NextResponse.json(
        {
          error:
            "No supplier phone number is attached to this request. Add a supplier before call.",
        },
        { status: 400 }
      );
    }

    const task = [
      "You are ProcureCall, an AI procurement assistant calling a supplier on behalf of a buyer.",
      `The buyer needs: ${procurementRequest.product_or_service}.`,
      procurementRequest.quantity
        ? `Required quantity: ${procurementRequest.quantity}.`
        : "",
      procurementRequest.target_budget
        ? `The buyer's target budget is: ${procurementRequest.target_budget}.`
        : "",
      procurementRequest.delivery_location
        ? `Delivery location: ${procurementRequest.delivery_location}.`
        : "",
      procurementRequest.instructions
        ? `Buyer instructions: ${procurementRequest.instructions}.`
        : "",
      "Politely ask whether the supplier can fulfill the request.",
      "Ask for the supplier's best available price and currency.",
      "Ask about availability, minimum order quantity, delivery time, payment terms, and additional fees.",
      "Do not invent or assume any commercial terms.",
      "If the supplier cannot provide a value, record it as unknown.",
      "Confirm important numbers and terms before ending the call.",
      "Thank the supplier and end the call professionally.",
    ]
      .filter(Boolean)
      .join("\n");

    const resultSchema = {
      type: "object",
      required: [
        "supplier_can_fulfill",
        "price",
        "currency",
        "availability",
        "minimum_order",
        "delivery_time",
        "payment_terms",
        "additional_fees",
        "notes",
      ],
      properties: {
        supplier_can_fulfill: {
          type: "string",
          enum: ["yes", "no", "unknown"],
        },
        price: {
          type: "string",
        },
        currency: {
          type: "string",
        },
        availability: {
          type: "string",
        },
        minimum_order: {
          type: "string",
        },
        delivery_time: {
          type: "string",
        },
        payment_terms: {
          type: "string",
        },
        additional_fees: {
          type: "string",
        },
        notes: {
          type: "string",
        },
      },
    };

    const webhookUrl =
      `${new URL(request.url).origin}/api/calle/webhook`;

    /*
     * One outbound request only.
     * We deliberately do NOT use createAndWait()
     * because waiting/polling inside a Cloudflare Worker
     * can exceed the Worker subrequest limit.
     */
    const response = await fetch(
      "https://api.heycall-e.com/v1/calls",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `procurecall:${id}:${supplier.id}:${Date.now()}`,
        },
        body: JSON.stringify({
          task,
          recipients: [
            {
              phones: [supplier.phone],
            },
          ],
          result_schema: resultSchema,
          metadata: {
            procurement_request_id: id,
            supplier_id: supplier.id,
          },
          webhook_url: webhookUrl,
        }),
      }
    );

    const body = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      console.error(
        "CALL-E API error:",
        response.status,
        body
      );

      return NextResponse.json(
        {
          error:
            body?.error ??
            body?.message ??
            "CALL-E request failed.",
          details: body ?? null,
        },
        {
          status:
            response.status >= 400 &&
            response.status < 600
              ? response.status
              : 502,
        }
      );
    }

    const callId =
      body?.id ??
      body?.call_id ??
      body?.call?.id ??
      null;

    if (!callId) {
      console.error(
        "CALL-E returned no call ID:",
        body
      );

      return NextResponse.json(
        {
          error:
            "CALL-E started an unexpected response without a call ID.",
          response: body,
        },
        { status: 502 }
      );
    }

    console.log(
      "CALL-E call started:",
      callId
    );

    return NextResponse.json({
      success: true,
      callId,
      status: body?.status ?? "queued",
      message:
        "Supplier call started. CALL-E will send the completed result to ProcureCall.",
    });
  } catch (error) {
    console.error(
      "ProcureCall supplier call failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Supplier call failed.",
      },
      { status: 500 }
    );
  }
}