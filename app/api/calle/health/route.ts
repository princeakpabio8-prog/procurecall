import { NextResponse } from "next/server";
import { calleClient } from "@/lib/calle/client";

export async function GET() {
  try {
    // The import and client construction succeed only when the
    // CALL-E SDK is installed and CALLE_API_KEY is available.
    void calleClient;

    return NextResponse.json({
      configured: true,
      provider: "CALL-E",
      status: "ready",
    });
  } catch {
    return NextResponse.json(
      {
        configured: false,
        provider: "CALL-E",
        status: "not_configured",
      },
      { status: 500 },
    );
  }
}
