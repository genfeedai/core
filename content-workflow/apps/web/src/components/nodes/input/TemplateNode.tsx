"use client";

import { memo, useCallback } from "react";
import type { NodeProps } from "@xyflow/react";
import { BaseNode } from "../BaseNode";
import type { TemplateNodeData } from "@/types/nodes";
import { useWorkflowStore } from "@/store/workflowStore";

// Template presets
const TEMPLATES = [
  {
    id: "product-showcase",
    name: "Product Showcase",
    prompt:
      "Create a stunning product showcase image for {{product}}. The image should be high-quality, professional, with dramatic lighting on a clean background. Style: {{style}}.",
    variables: ["product", "style"],
  },
  {
    id: "social-media-post",
    name: "Social Media Post",
    prompt:
      "Design an engaging social media post about {{topic}}. Make it visually appealing with bold colors and clear messaging. Target audience: {{audience}}.",
    variables: ["topic", "audience"],
  },
  {
    id: "video-scene",
    name: "Video Scene",
    prompt:
      "Generate a cinematic video scene showing {{description}}. Camera movement: {{camera}}. Duration should be {{duration}} seconds with smooth transitions.",
    variables: ["description", "camera", "duration"],
  },
  {
    id: "character-animation",
    name: "Character Animation",
    prompt:
      "Create an animated character performing {{action}}. Style: {{style}}. Mood: {{mood}}. The animation should be smooth and expressive.",
    variables: ["action", "style", "mood"],
  },
];

function TemplateNodeComponent(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as TemplateNodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const selectedTemplate = TEMPLATES.find((t) => t.id === nodeData.templateId);

  const handleTemplateSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const template = TEMPLATES.find((t) => t.id === e.target.value);
      if (template) {
        updateNodeData<TemplateNodeData>(id, {
          templateId: template.id,
          templateName: template.name,
          variables: {},
          resolvedPrompt: null,
        });
      }
    },
    [id, updateNodeData]
  );

  const handleVariableChange = useCallback(
    (variable: string, value: string) => {
      const newVariables = { ...nodeData.variables, [variable]: value };
      let resolved = selectedTemplate?.prompt || "";

      for (const [key, val] of Object.entries(newVariables)) {
        resolved = resolved.replace(new RegExp(`{{${key}}}`, "g"), val);
      }

      updateNodeData<TemplateNodeData>(id, {
        variables: newVariables,
        resolvedPrompt: resolved,
      });
    },
    [id, nodeData.variables, selectedTemplate, updateNodeData]
  );

  return (
    <BaseNode {...props}>
      <div className="space-y-2">
        <select
          value={nodeData.templateId || ""}
          onChange={handleTemplateSelect}
          className="w-full px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
        >
          <option value="">Select template...</option>
          {TEMPLATES.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>

        {selectedTemplate && (
          <div className="space-y-2">
            {selectedTemplate.variables.map((variable) => (
              <div key={variable}>
                <label className="text-xs text-[var(--muted-foreground)] capitalize">
                  {variable}
                </label>
                <input
                  type="text"
                  value={nodeData.variables[variable] || ""}
                  onChange={(e) => handleVariableChange(variable, e.target.value)}
                  placeholder={`Enter ${variable}...`}
                  className="w-full px-2 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>
            ))}

            {nodeData.resolvedPrompt && (
              <div className="mt-2 p-2 bg-[var(--background)] rounded text-xs text-[var(--muted-foreground)] border border-[var(--border)]">
                <div className="text-[var(--foreground)] mb-1">Preview:</div>
                {nodeData.resolvedPrompt}
              </div>
            )}
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export const TemplateNode = memo(TemplateNodeComponent);
