// Web-app-specific hooks
export { useAutoSave } from './useAutoSave';
export { useCommentNavigation, useHeaderCommentNavigation } from './useCommentNavigation';
export { useContextMenu } from './useContextMenu';
export { useGlobalShortcuts } from './useGlobalShortcuts';
export { useNodeActions } from './useNodeActions';
export { useNodeFieldUpdater } from './useNodeFieldUpdater';
export { useOptimalHandleOrder } from './useOptimalHandleOrder';
export { usePaneActions } from './usePaneActions';

// Re-export shared hooks from workflow-ui
export {
  useAIGenNode,
  useAIGenNodeHeader,
  useAutoLoadModelSchema,
  useCanGenerate,
  useCanvasKeyboardShortcuts,
  useMediaUpload,
  useModelSelection,
  useNodeExecution,
  usePromptAutocomplete,
  useRequiredInputs,
} from '@genfeedai/workflow-ui/hooks';
