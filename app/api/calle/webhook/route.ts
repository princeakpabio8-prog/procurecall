import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

type AnyObject = Record<string, unknown>;

function asObject(value: unknown): AnyObject {
  return value && typeof value === "object"
    ? (value as AnyObject)
    : {};
}

export async function POST(request: Request) {
  try {
    const eventId = request.headers.get("CALL-E-Event-Id");
    const payload = (await request.json()) as AnyObject;

   const bodyEventId = payload?.id ?? null;

    if (eventId && bodyEventId && eventId !== bodyEventId) {
      return NextResponse.json(
        { error: "Webhook event ID mismatch." },
        { status: 400 },
      );
    }

    const event = asObject(payload.call ?? payload.data ?? payload);
    const call = asObject(event.call ?? event);

    const callId =
      call?.id ??
      call?.call_id ??
      payload?.call_id ??
      payload?.callId ??
      null;

    const status = call?.status ?? event?.status ?? payload?.status ?? null;

    const metadata = asObject(
      call?.metadata ??
        event?.metadata ??
        payload?.metadata ??
        asObject(call.call).metadata,
    );

    const procurementRequestId =
      metadata?.procurement_request_id ??
      metadata?.procurementRequestId ??
      null;

    const supplierId =
      metadata?.supplier_id ??
      metadata?.supplierId ??
      null;

    if (!callId) {
      console.error("CALL-E webhook has no call ID:", payload);

      return NextResponse.json(
        { error: "Missing CALL-E call ID." },
        { status: 400 },
      );
    }

    if (!procurementRequestId || !supplierId) {
      console.error(
        "CALL-E webhook has no ProcureCall metadata:",
        payload,
      );

      return NextResponse.json(
        { error: "Missing ProcureCall metadata." },
        { status: 400 },
      );
    }

    const completionConfidence =
      typeof call?.completion_confidence === "object"
        ? asObject(call.completion_confidence).score ?? null
        : call?.completion_confidence ??
          call?.completionConfidence ??
          null;

    const summary =
      call?.summary ??
      call?.post_call_summary ??
      call?.postCallSummary ??
      null;

    const structuredResult =
      call?.structured_result ??
      call?.structuredResult ??
      null;

    const evidence = call?.evidence ?? null;

    const taskCompleted =
      call?.task_completed ??
      call?.taskCompleted ??
      null;

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from("call_results")
      .select("id")
      .eq("call_id", callId)
      .maybeSingle();

    const resultRow = {
      procurement_request_id: procurementRequestId,
      supplier_id: supplierId,
      call_id: callId,
      status,
      task_completed: taskCompleted,
      completion_confidence: completionConfidence,
      summary,
      structured_result: structuredResult,
      evidence,
    };

    if (existing?.id) {
      const { error } = await supabase
        .from("call_results")
        .update(resultRow)
        .eq("id", existing.id);

      if (error) {
        console.error("Failed to update CALL-E result:", error);

        return NextResponse.json(
          { error: "Failed to save CALL-E result." },
          { status: 500 },
        );
      }
    } else {
      const { error } = await supabase
        .from("call_results")
        .insert(resultRow);

      if (error) {
        console.error("Failed to insert CALL-E result:", error);

        return NextResponse.json(
          { error: "Failed to save CALL-E result." },
          { status: 500 },
        );
      }
    }

    console.log("CALL-E result saved:", {
      callId,
      procurementRequestId,
      supplierId,
      status,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("CALL-E webhook failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Webhook processing failed.",
      },
      { status: 500 },
    );
  }
}