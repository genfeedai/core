import { NextRequest, NextResponse } from "next/server";
import { getPredictionStatus } from "@/lib/replicate/client";
import { getWebhookResult } from "../../replicate/webhook/route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // First check webhook results (faster if available)
    const webhookResult = getWebhookResult(id);
    if (webhookResult) {
      return NextResponse.json({
        id,
        status: webhookResult.status,
        output: webhookResult.output,
        error: webhookResult.error,
      });
    }

    // Fall back to polling Replicate API
    const prediction = await getPredictionStatus(id);

    return NextResponse.json({
      id,
      status: prediction.status,
      output: prediction.output,
      error: prediction.error,
      progress: prediction.status === "processing" ? 50 : undefined,
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}
