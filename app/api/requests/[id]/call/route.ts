import { NextResponse } from "next/server";
import { calleClient } from "@/lib/calle/client";
import { createAdminClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const maxDuration = 300;

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Request ID is required." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: procurementRequest, error: requestError } = await supabase
      .from("procurement_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (requestError || !procurementRequest) {
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
        { error: "Suppliers could not be loaded." },
        { status: 500 },
      );
    }

    const supplier = suppliers?.[0];

    if (!supplier?.phone) {
      return NextResponse.json(
        {
          error:
            "No supplier phone number is attached to this request. Add a supplier before starting the call.",
        },
        { status: 400 },
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
      .join(" ");

    const call = await calleClient.calls.createAndWait({
      task,
      recipient: {
        phone: supplier.phone,
      },
      resultSchema: {
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
          price: { type: "string" },
          currency: { type: "string" },
          availability: { type: "string" },
          minimum_order: { type: "string" },
          delivery_time: { type: "string" },
          payment_terms: { type: "string" },
          additional_fees: { type: "string" },
          notes: { type: "string" },
        },
      },
      metadata: {
        procurement_request_id: id,
        supplier_id: supplier.id,
      },
    });
    const { error: saveError } = await supabase
  .from("call_results")
  .insert({
    procurement_request_id: id,
    supplier_id: supplier.id,
    call_id: call.id,
    status: call.status,
    task_completed: call.taskCompleted,
    completion_confidence:
      typeof call.completionConfidence === "object"
        ? call.completionConfidence?.score ?? null
        : call.completionConfidence ?? null,
    summary: call.summary ?? null,
    structured_result: call.structuredResult ?? null,
    evidence: call.evidence ?? null,
  });

if (saveError) {
  console.error("Failed to save CALL-E result:", saveError);

  return NextResponse.json(
    {
      error: "Call completed, but the result could not be saved.",
      callId: call.id,
    },
    { status: 500 },
  );
}

console.log("CALL-E result saved:", call.id);

    return NextResponse.json({
      success: true,
      callId: call.id,
      status: call.status,
      taskCompleted: call.taskCompleted,
      completionConfidence: call.completionConfidence,
      structuredResult: call.structuredResult,
      summary: call.summary,
      evidence: call.evidence,
      failureCode: call.failureCode,
      failureMessage: call.failureMessage,
    });
  } catch (error) {
    console.error("ProcureCall supplier call failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Supplier call failed.",
      },
      { status: 500 },
    );
  }
}
