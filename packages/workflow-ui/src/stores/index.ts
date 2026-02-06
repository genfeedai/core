/**
 * Store re-exports for @genfeedai/workflow-ui
 *
 * These are the actual Zustand stores used by workflow-ui components.
 * The consuming app can override behavior by:
 * - Configuring bundler aliases to point to app-specific stores
 * - Extending stores via the slice pattern
 *
 * The components in this package import from './workflowStore', './uiStore', etc.
 * which are re-exported here for consumers that need them.
 */

// Store hooks
export { useWorkflowStore } from './workflowStore';
export { useUIStore } from './uiStore';
export { useExecutionStore } from './executionStore';
export { useSettingsStore } from './settingsStore';

// Store types
export type { WorkflowData, WorkflowState, WorkflowStore } from './workflow';
export type { ExecutionStore, Job, DebugPayload } from './execution';

// Workflow selectors
export {
  selectNodes,
  selectEdges,
  selectGroups,
  selectSelectedNodeIds,
  selectWorkflowName,
  selectWorkflowId,
  selectIsDirty,
  selectIsSaving,
  selectIsLoading,
  selectEdgeStyle,
  selectNavigationTargetId,
  selectUpdateNodeData,
  selectAddNode,
  selectRemoveNode,
  selectDuplicateNode,
  selectOnNodesChange,
  selectOnEdgesChange,
  selectOnConnect,
  selectSetSelectedNodeIds,
  selectToggleNodeLock,
  selectCreateGroup,
  selectDeleteGroup,
  selectUnlockAllNodes,
  selectSetDirty,
  selectRemoveEdge,
  selectAddNodesAndEdges,
  selectGetNodeById,
  selectGetConnectedNodeIds,
  selectIsValidConnection,
  selectFindCompatibleHandle,
  createSelectNodeById,
  createSelectIsNodeSelected,
  createSelectGroupByNodeId,
} from './workflow/selectors';

// Settings types
export type {
  ProviderConfig,
  ProviderSettings,
  DefaultModelSettings,
  RecentModel,
} from './settingsStore';
export { PROVIDER_INFO } from './settingsStore';

// UI types
export type { ModalType, NodeDetailTab } from './uiStore';

// Embedded stores (moved from core app)
export { usePromptEditorStore } from './promptEditorStore';
export { useAnnotationStore } from './annotationStore';
export type {
  AnnotationTool,
  ToolOptions,
  BaseShape,
  RectangleShape,
  CircleShape,
  ArrowShape,
  FreehandShape,
  TextShape,
  AnnotationShape,
} from './annotationStore';
export { usePromptLibraryStore, configurePromptLibrary } from './promptLibraryStore';
