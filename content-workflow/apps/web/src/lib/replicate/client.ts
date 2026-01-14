import Replicate from "replicate";

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Model identifiers
export const MODELS = {
  nanoBanana: "google/nano-banana",
  nanoBananaPro: "google/nano-banana-pro",
  veoFast: "google/veo-3.1-fast",
  veo: "google/veo-3.1",
  llama: "meta/meta-llama-3.1-405b-instruct",
} as const;

// Pricing per unit
export const PRICING = {
  "nano-banana": 0.039, // per image
  "nano-banana-pro": {
    "1K": 0.15,
    "2K": 0.2,
    "4K": 0.3,
  },
  "veo-3.1-fast": {
    withAudio: 0.15, // per second
    withoutAudio: 0.1,
  },
  "veo-3.1": {
    withAudio: 0.4,
    withoutAudio: 0.2,
  },
  llama: 0.0001, // per 1K tokens
} as const;

// Type definitions
export interface ImageGenInput {
  prompt: string;
  image_input?: string[];
  aspect_ratio?: string;
  resolution?: string;
  output_format?: string;
  safety_filter_level?: string;
}

export interface VideoGenInput {
  prompt: string;
  image?: string;
  last_frame?: string;
  reference_images?: string[];
  duration?: number;
  aspect_ratio?: string;
  resolution?: string;
  generate_audio?: boolean;
  negative_prompt?: string;
  seed?: number;
}

export interface LLMInput {
  prompt: string;
  system_prompt?: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
}

export interface PredictionResult {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: unknown;
  error?: string;
  metrics?: {
    predict_time?: number;
  };
}

/**
 * Generate an image using nano-banana models
 */
export async function generateImage(
  model: "nano-banana" | "nano-banana-pro",
  input: ImageGenInput,
  webhookUrl?: string
): Promise<PredictionResult> {
  const modelId = model === "nano-banana" ? MODELS.nanoBanana : MODELS.nanoBananaPro;

  const prediction = await replicate.predictions.create({
    model: modelId,
    input: {
      prompt: input.prompt,
      image_input: input.image_input ?? [],
      aspect_ratio: input.aspect_ratio ?? "1:1",
      output_format: input.output_format ?? "jpg",
      ...(model === "nano-banana-pro" && {
        resolution: input.resolution ?? "2K",
      }),
    },
    ...(webhookUrl && {
      webhook: webhookUrl,
      webhook_events_filter: ["completed"],
    }),
  });

  return prediction as PredictionResult;
}

/**
 * Generate a video using veo-3.1 models
 */
export async function generateVideo(
  model: "veo-3.1-fast" | "veo-3.1",
  input: VideoGenInput,
  webhookUrl?: string
): Promise<PredictionResult> {
  const modelId = model === "veo-3.1-fast" ? MODELS.veoFast : MODELS.veo;

  const prediction = await replicate.predictions.create({
    model: modelId,
    input: {
      prompt: input.prompt,
      image: input.image,
      last_frame: input.last_frame,
      reference_images: input.reference_images,
      duration: input.duration ?? 8,
      aspect_ratio: input.aspect_ratio ?? "16:9",
      resolution: input.resolution ?? "1080p",
      generate_audio: input.generate_audio ?? true,
      negative_prompt: input.negative_prompt,
      seed: input.seed,
    },
    ...(webhookUrl && {
      webhook: webhookUrl,
      webhook_events_filter: ["completed"],
    }),
  });

  return prediction as PredictionResult;
}

/**
 * Generate text using meta-llama
 */
export async function generateText(input: LLMInput): Promise<string> {
  const output = await replicate.run(MODELS.llama, {
    input: {
      prompt: input.prompt,
      system_prompt: input.system_prompt ?? "You are a helpful assistant.",
      max_tokens: input.max_tokens ?? 1024,
      temperature: input.temperature ?? 0.7,
      top_p: input.top_p ?? 0.9,
    },
  });

  // Output is typically an array of strings
  if (Array.isArray(output)) {
    return output.join("");
  }

  return String(output);
}

/**
 * Get prediction status
 */
export async function getPredictionStatus(
  predictionId: string
): Promise<PredictionResult> {
  const prediction = await replicate.predictions.get(predictionId);
  return prediction as PredictionResult;
}

/**
 * Cancel a prediction
 */
export async function cancelPrediction(predictionId: string): Promise<void> {
  await replicate.predictions.cancel(predictionId);
}

/**
 * Calculate cost estimate for a workflow
 */
export function calculateCost(
  imageCount: number,
  imageModel: "nano-banana" | "nano-banana-pro",
  imageResolution: string,
  videoSeconds: number,
  videoModel: "veo-3.1-fast" | "veo-3.1",
  withAudio: boolean
): number {
  let cost = 0;

  // Image cost
  if (imageModel === "nano-banana") {
    cost += imageCount * PRICING["nano-banana"];
  } else {
    const res = imageResolution as keyof typeof PRICING["nano-banana-pro"];
    cost += imageCount * (PRICING["nano-banana-pro"][res] ?? 0.2);
  }

  // Video cost
  const videoKey = withAudio ? "withAudio" : "withoutAudio";
  cost += videoSeconds * PRICING[videoModel][videoKey];

  return cost;
}
