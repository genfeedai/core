import type { ProviderModel, SelectedModel } from '@genfeedai/types';
import { useEffect, useRef } from 'react';

interface UseAutoLoadModelSchemaOptions<TModel extends string> {
  /** Current model type from node data */
  currentModel: TModel | undefined;
  /** Selected model with full schema (if already loaded) */
  selectedModel: SelectedModel | undefined;
  /** Map from internal model type to API model ID */
  modelIdMap: Record<TModel, string>;
  /** Callback when model is loaded from API */
  onModelSelect: (model: ProviderModel) => void;
}

/**
 * Hook that auto-loads model schema for a node when the selectedModel is not set
 * but a model type is already selected.
 *
 * This handles the case where a node has a default model but hasn't loaded
 * the full schema yet.
 *
 * Shared between ImageGenNode, VideoGenNode, and other AI nodes.
 */
export function useAutoLoadModelSchema<TModel extends string>({
  currentModel,
  selectedModel,
  modelIdMap,
  onModelSelect,
}: UseAutoLoadModelSchemaOptions<TModel>): void {
  // Track if we've already attempted to load the default model schema
  const hasAttemptedSchemaLoad = useRef(false);

  useEffect(() => {
    // Only run once per node, and only if we have a model but no selectedModel
    if (hasAttemptedSchemaLoad.current || selectedModel || !currentModel) {
      return;
    }

    const modelId = modelIdMap[currentModel];
    if (!modelId) return;

    const controller = new AbortController();
    let isCancelled = false;

    const loadSchema = async () => {
      try {
        const response = await fetch(`/api/providers/models?query=${encodeURIComponent(modelId)}`, {
          signal: controller.signal,
        });

        if (!response.ok || isCancelled) return;

        const data = await response.json();
        const model = data.models?.find((m: { id: string }) => m.id === modelId);

        if (model && !isCancelled) {
          hasAttemptedSchemaLoad.current = true;
          onModelSelect(model);
        }
      } catch {
        // Ignore abort errors and other failures - allows retry on next effect run
      }
    };

    loadSchema();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [currentModel, selectedModel, modelIdMap, onModelSelect]);
}
