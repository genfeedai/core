import { NextRequest, NextResponse } from "next/server";
import { generateVideo } from "@/lib/replicate/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nodeId, inputs, config } = body;

    // Build input for Replicate
    const prompt = inputs.prompt || config.inputPrompt || "";

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Get webhook URL for async notification
    const webhookUrl = process.env.NEXT_PUBLIC_URL
      ? `${process.env.NEXT_PUBLIC_URL}/api/replicate/webhook`
      : undefined;

    const prediction = await generateVideo(
      config.model || "veo-3.1-fast",
      {
        prompt,
        image: inputs.image || config.inputImage,
        last_frame: inputs.lastFrame || config.lastFrame,
        reference_images: config.referenceImages,
        duration: config.duration || 8,
        aspect_ratio: config.aspectRatio || "16:9",
        resolution: config.resolution || "1080p",
        generate_audio: config.generateAudio ?? true,
        negative_prompt: config.negativePrompt,
      },
      webhookUrl
    );

    return NextResponse.json({
      nodeId,
      predictionId: prediction.id,
      status: prediction.status,
    });
  } catch (error) {
    console.error("Video generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
