import type { WorkflowFile } from "@/types/workflow";
import { IMAGE_SERIES_TEMPLATE } from "./image-series";
import { IMAGE_TO_VIDEO_TEMPLATE } from "./image-to-video";
import { FULL_PIPELINE_TEMPLATE } from "./full-pipeline";

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  category: "images" | "video" | "full-pipeline";
  thumbnail?: string;
}

export const TEMPLATE_REGISTRY: Record<string, WorkflowFile> = {
  "image-series": IMAGE_SERIES_TEMPLATE,
  "image-to-video": IMAGE_TO_VIDEO_TEMPLATE,
  "full-pipeline": FULL_PIPELINE_TEMPLATE,
};

export const TEMPLATE_INFO: TemplateInfo[] = [
  {
    id: "image-series",
    name: "Image Series",
    description: "Generate a series of related images from a concept prompt using LLM expansion",
    category: "images",
  },
  {
    id: "image-to-video",
    name: "Image to Video",
    description: "Create interpolated video between two images with easing animation",
    category: "video",
  },
  {
    id: "full-pipeline",
    name: "Full Content Pipeline",
    description: "Complete workflow: concept → images → videos → animation → stitched output",
    category: "full-pipeline",
  },
];

export function getTemplate(id: string): WorkflowFile | undefined {
  return TEMPLATE_REGISTRY[id];
}

export function getTemplatesByCategory(category: string): TemplateInfo[] {
  if (category === "all") return TEMPLATE_INFO;
  return TEMPLATE_INFO.filter((t) => t.category === category);
}

export { IMAGE_SERIES_TEMPLATE, IMAGE_TO_VIDEO_TEMPLATE, FULL_PIPELINE_TEMPLATE };
