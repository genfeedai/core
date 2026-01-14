import { NextRequest, NextResponse } from "next/server";

// In-memory store for webhook results
// In production, use Redis or a database
const webhookResults = new Map<string, {
  status: string;
  output: unknown;
  error?: string;
  completedAt: string;
}>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, output, error } = body;

    // Store the result
    webhookResults.set(id, {
      status,
      output,
      error,
      completedAt: new Date().toISOString(),
    });

    // Clean up old results (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [key, value] of webhookResults.entries()) {
      if (new Date(value.completedAt).getTime() < oneHourAgo) {
        webhookResults.delete(key);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Export for use in status endpoint
export function getWebhookResult(predictionId: string) {
  return webhookResults.get(predictionId);
}
