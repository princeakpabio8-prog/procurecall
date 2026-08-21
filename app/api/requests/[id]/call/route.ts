import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Request ID is required." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const [{ data: procurementRequest, error: requestError }, { data: callResults, error: callResultError }] = await Promise.all([
      supabase
        .from("procurement_requests")
        .select("*")
        .eq("id", id)
        .single(),
      supabase
        .from("call_results")
        .select("*")
        .eq("procurement_request_id", id)
        .order("created_at", { ascending: false }),
    ]);

    if (requestError || !procurementRequest) {
      return NextResponse.json(
        { error: "Procurement request not found." },
        { status: 404 },
      );
    }

    if (callResultError) {
      console.error("Failed to load CALL-E result:", callResultError);
      return NextResponse.json(
        { error: "The CALL-E result could not be loaded." },
        { status: 500 },
      );
    }

    const apiKey = process.env.CALLE_API_KEY;
    const pendingResults = (callResults ?? []).filter((result) =>
      !["completed", "complete", "finished", "success", "successful", "failed", "failure", "error", "cancelled", "canceled", "no_answer", "no-answer"].includes(
        String(result.status ?? "").toLowerCase(),
      ),
    );

    if (apiKey && pendingResults.length > 0) {
      await Promise.all(
        pendingResults.map(async (result) => {
          try {
            const providerResponse = await fetch(
              `https://api.heycall-e.com/v1/calls/${result.call_id}`,
              { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store" },
            );
            const providerCall = await providerResponse.json().catch(() => null);

            if (!providerResponse.ok || !providerCall) return;

            const completionConfidence =
              typeof providerCall.completion_confidence === "object"
                ? providerCall.completion_confidence?.score ?? null
                : providerCall.completion_confidence ?? null;
            const update = {
              status: providerCall.status ?? result.status,
              task_completed: providerCall.task_completed ?? null,
              completion_confidence: completionConfidence,
              summary: providerCall.summary ?? null,
              structured_result: providerCall.structured_result ?? null,
              evidence: providerCall.evidence ?? null,
            };

            await supabase
              .from("call_results")
              .update(update)
              .eq("id", result.id);
            Object.assign(result, update);
          } catch (reconciliationError) {
            console.error("Failed to reconcile CALL-E result:", reconciliationError);
          }
        }),
      );
    }

    return NextResponse.json({
      request: procurementRequest,
      call: callResults?.[0] ?? null,
      callResult: callResults?.[0] ?? null,
      callResults: callResults ?? [],
    });
  } catch (error) {
    console.error("Unexpected call result API error:", error);
    return NextResponse.json(
      { error: "Failed to load call result." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const callInput = await request.json().catch(() => ({}));
    const supplierId =
      typeof callInput?.supplierId === "string" ? callInput.supplierId : null;

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

    const targetSuppliers = supplierId
      ? suppliers?.filter((candidate) => candidate.id === supplierId)
      : suppliers ?? [];

    if (targetSuppliers.length === 0 || targetSuppliers.some((supplier) => !supplier.phone)) {
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
    const { data: existingResults } = await supabase
      .from("call_results")
      .select("supplier_id, status")
      .eq("procurement_request_id", id)
      .in("supplier_id", targetSuppliers.map((supplier) => supplier.id));

    const completedSupplierIds = new Set(
      (existingResults ?? [])
        .filter((result) => ["completed", "complete", "finished", "success", "successful"].includes(String(result.status).toLowerCase()))
        .map((result) => result.supplier_id),
    );

    const activeSupplierIds = new Set(
      (existingResults ?? [])
        .filter((result) => !["failed", "failure", "error", "cancelled", "canceled", "no_answer", "no-answer"].includes(String(result.status).toLowerCase()))
        .map((result) => result.supplier_id),
    );

    const suppliersToCall = targetSuppliers.filter(
      (supplier) =>
        !completedSupplierIds.has(supplier.id) &&
        !activeSupplierIds.has(supplier.id),
    );

    const startedCalls = await Promise.all(
      suppliersToCall.map(async (supplier) => {
        const response = await fetch("https://api.heycall-e.com/v1/calls", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `procurecall:${id}:${supplier.id}:v1`,
          },
          body: JSON.stringify({
            task,
            recipients: [{ phones: [supplier.phone] }],
            result_schema: resultSchema,
            metadata: {
              procurement_request_id: id,
              supplier_id: supplier.id,
            },
            webhook_url: webhookUrl,
          }),
        });

        const body = await response.json().catch(() => null);

        if (!response.ok) {
          const providerError = body?.error;
          const errorMessage =
            typeof providerError === "string"
              ? providerError
              : typeof body?.message === "string"
                ? body.message
                : providerError
                  ? JSON.stringify(providerError)
                  : "CALL-E request failed.";

          throw new Error(`${supplier.phone}: ${errorMessage}`);
        }

        const callId = body?.id ?? body?.call_id ?? body?.call?.id ?? null;

        if (!callId) {
          throw new Error(`${supplier.phone}: CALL-E returned no call ID.`);
        }

        const { error: pendingResultError } = await supabase
          .from("call_results")
          .insert({
            procurement_request_id: id,
            supplier_id: supplier.id,
            call_id: callId,
            status: body?.status ?? "queued",
          });

        if (pendingResultError) {
          console.error("Failed to save pending CALL-E result:", pendingResultError);
        }

        return {
          callId,
          supplierId: supplier.id,
          status: body?.status ?? "queued",
        };
      }),
    );

    return NextResponse.json({
      success: true,
      startedCalls,
      skippedSupplierIds: [...completedSupplierIds],
      activeSupplierIds: [...activeSupplierIds],
      message:
        "Supplier calls started. CALL-E will send completed results to ProcureCall.",
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