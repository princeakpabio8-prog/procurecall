import { NextResponse } from "next/server";
import { calleClient } from "@/lib/calle/client";

type TestCallRequest = {
  phone: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TestCallRequest;

    if (!body.phone) {
      return NextResponse.json(
        { error: "A phone number is required." },
        { status: 400 },
      );
    }

    const call = await calleClient.calls.createAndWait({
      task: [
        `Call ${body.phone}.`,
        "Introduce yourself as ProcureCall.",
        "Say this is a short technical test of an AI phone agent.",
        "Ask: Can you hear me clearly?",
        "Thank the person and end the call.",
      ].join(" "),
      resultSchema: {
        type: "object",
        required: ["can_hear_clearly"],
        properties: {
          can_hear_clearly: {
            type: "string",
            enum: ["yes", "no", "unknown"],
          },
        },
      },
    });

    return NextResponse.json({
      status: call.status,
      taskCompleted: call.taskCompleted,
      completionConfidence: call.completionConfidence,
      structuredResult: call.structuredResult,
      evidence: call.evidence,
    });
  } catch (error) {
    console.error("CALL-E test call failed:", error);

    return NextResponse.json(
      {
        error: "CALL-E test call failed.",
      },
      { status: 500 },
    );
  }
}