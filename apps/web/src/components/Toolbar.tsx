'use client';

import type { WorkflowFile } from '@genfeedai/types';
import {
  AlertCircle,
  BookMarked,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudOff,
  DollarSign,
  FolderOpen,
  LayoutGrid,
  LayoutTemplate,
  Loader2,
  MessageSquare,
  Play,
  PlayCircle,
  Plus,
  RotateCcw,
  Save,
  Settings,
  Sparkles,
  Square,
  Store,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useHeaderCommentNavigation } from '@/hooks/useCommentNavigation';
import { usePaneActions } from '@/hooks/usePaneActions';
import { logger } from '@/lib/logger';
import { useExecutionStore } from '@/store/executionStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useUIStore } from '@/store/uiStore';
import { useWorkflowStore } from '@/store/workflowStore';

/**
 * Icon button with tooltip
 */
interface IconButtonProps {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  active?: boolean;
  variant?: 'ghost' | 'secondary';
}

function IconButton({ icon, tooltip, onClick, active, variant = 'ghost' }: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={active ? 'secondary' : variant} size="icon-sm" onClick={onClick}>
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Discord icon SVG component
 */
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

/**
 * Auto-save status indicator
 */
function SaveIndicator() {
  const isDirty = useWorkflowStore((state) => state.isDirty);
  const isSaving = useWorkflowStore((state) => state.isSaving);
  const autoSaveEnabled = useSettingsStore((state) => state.autoSaveEnabled);
  const toggleAutoSave = useSettingsStore((state) => state.toggleAutoSave);

  if (!autoSaveEnabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggleAutoSave}
            className="flex items-center gap-1.5 text-muted-foreground text-xs hover:text-foreground transition-colors"
          >
            <CloudOff className="h-3.5 w-3.5" />
            <span>Auto-save off</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Click to enable auto-save</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (isSaving) {
    return (
      <div className="flex items-center gap-1.5 text-blue-500 text-xs">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Saving...</span>
      </div>
    );
  }

  if (isDirty) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Cloud className="h-3.5 w-3.5" />
        <span>Unsaved</span>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={toggleAutoSave}
          className="flex items-center gap-1.5 text-green-500 text-xs hover:text-green-400 transition-colors"
        >
          <Check className="h-3.5 w-3.5" />
          <span>Saved</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>Click to disable auto-save</p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Comment navigation indicator
 */
function CommentNavigator() {
  const { totalCount, unviewedCount, currentIndex, hasComments, goToPrevious, goToNext } =
    useHeaderCommentNavigation();

  if (!hasComments) return null;

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={goToPrevious}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Previous comment</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="tabular-nums text-muted-foreground">
              {currentIndex > 0 ? `${currentIndex}/${totalCount}` : totalCount}
            </span>
            {unviewedCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {unviewedCount}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>
            {unviewedCount > 0
              ? `${unviewedCount} unread comment${unviewedCount > 1 ? 's' : ''}`
              : `${totalCount} comment${totalCount > 1 ? 's' : ''}`}
          </p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={goToNext}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Next comment</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

/**
 * Validates workflow JSON structure before loading
 */
function isValidWorkflow(data: unknown): data is WorkflowFile {
  if (!data || typeof data !== 'object') return false;

  const workflow = data as Record<string, unknown>;

  // Check required fields
  if (typeof workflow.name !== 'string') return false;
  if (!Array.isArray(workflow.nodes)) return false;
  if (!Array.isArray(workflow.edges)) return false;

  // Validate nodes have required properties
  for (const node of workflow.nodes) {
    if (!node || typeof node !== 'object') return false;
    const n = node as Record<string, unknown>;
    if (typeof n.id !== 'string') return false;
    if (typeof n.type !== 'string') return false;
    if (!n.position || typeof n.position !== 'object') return false;
  }

  // Validate edges have required properties
  for (const edge of workflow.edges) {
    if (!edge || typeof edge !== 'object') return false;
    const e = edge as Record<string, unknown>;
    if (typeof e.id !== 'string') return false;
    if (typeof e.source !== 'string') return false;
    if (typeof e.target !== 'string') return false;
  }

  return true;
}

export function Toolbar() {
  const { workflowName, isDirty, exportWorkflow, selectedNodeIds, setWorkflowName, saveWorkflow } =
    useWorkflowStore();
  const {
    isRunning,
    executeWorkflow,
    executeSelectedNodes,
    resumeFromFailed,
    canResumeFromFailed,
    stopExecution,
    validationErrors,
    clearValidationErrors,
    estimatedCost,
    actualCost,
  } = useExecutionStore();
  const { showAIGenerator, toggleAIGenerator, openModal } = useUIStore();
  const { autoLayout } = usePaneActions();

  // Inline name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(workflowName);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Sync editedName when workflowName changes externally
  useEffect(() => {
    if (!isEditingName) setEditedName(workflowName);
  }, [workflowName, isEditingName]);

  // Focus and select input when entering edit mode
  useEffect(() => {
    if (isEditingName) nameInputRef.current?.select();
  }, [isEditingName]);

  const handleNameSave = useCallback(async () => {
    const trimmed = editedName.trim();
    if (trimmed && trimmed !== workflowName) {
      setWorkflowName(trimmed);
      await saveWorkflow();
    }
    setIsEditingName(false);
  }, [editedName, workflowName, setWorkflowName, saveWorkflow]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleNameSave();
      if (e.key === 'Escape') {
        setEditedName(workflowName);
        setIsEditingName(false);
      }
    },
    [handleNameSave, workflowName]
  );

  // Memoize deduped error messages
  const uniqueErrorMessages = useMemo(() => {
    if (!validationErrors?.errors.length) return [];
    return [...new Set(validationErrors.errors.map((e) => e.message))];
  }, [validationErrors]);

  const handleSave = useCallback(() => {
    const workflow = exportWorkflow();
    const blob = new Blob([JSON.stringify(workflow, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${workflow.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [exportWorkflow]);

  const handleLoad = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);

          if (!isValidWorkflow(data)) {
            logger.error('Invalid workflow file structure', null, { context: 'Toolbar' });
            return;
          }

          useWorkflowStore.getState().loadWorkflow(data);
        } catch (error) {
          logger.error('Failed to parse workflow file', error, { context: 'Toolbar' });
        }
      };
      reader.onerror = () => {
        logger.error('Failed to read workflow file', reader.error, { context: 'Toolbar' });
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const handleRunStop = useCallback(() => {
    if (isRunning) {
      stopExecution();
    } else {
      executeWorkflow();
    }
  }, [isRunning, executeWorkflow, stopExecution]);

  const handleRunSelected = useCallback(() => {
    if (!isRunning && selectedNodeIds.length > 0) {
      executeSelectedNodes();
    }
  }, [isRunning, selectedNodeIds.length, executeSelectedNodes]);

  const handleResume = useCallback(() => {
    if (canResumeFromFailed()) {
      resumeFromFailed();
    }
  }, [canResumeFromFailed, resumeFromFailed]);

  const hasSelection = selectedNodeIds.length > 0;
  const showResumeButton = canResumeFromFailed();

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-14 items-center gap-4 border-b border-border bg-card px-4">
        {/* Logo / Home Link */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/"
              className="flex h-8 w-8 items-center justify-center hover:opacity-90 transition"
            >
              <img
                src="https://cdn.genfeed.ai/assets/branding/logo-white.png"
                alt="Genfeed"
                className="h-8 w-8 object-contain"
              />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Go to Dashboard</p>
          </TooltipContent>
        </Tooltip>

        {/* Workflow Title */}
        <div>
          {isEditingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={handleNameKeyDown}
              className="text-sm font-semibold bg-transparent border-b border-primary outline-none text-foreground"
            />
          ) : (
            <h1
              className="text-sm font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
              onClick={() => setIsEditingName(true)}
            >
              {workflowName}
              {isDirty && <span className="text-muted-foreground">*</span>}
            </h1>
          )}
          <p className="text-xs text-muted-foreground">Genfeed</p>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-border" />

        {/* Layout */}
        <IconButton
          icon={<LayoutGrid className="h-4 w-4" />}
          tooltip="Auto-layout Nodes"
          onClick={() => autoLayout('LR')}
        />

        {/* Divider */}
        <div className="h-8 w-px bg-border" />

        {/* File Operations */}
        <div className="flex items-center gap-1">
          <IconButton
            icon={<Save className="h-4 w-4" />}
            tooltip="Export Workflow (JSON)"
            onClick={handleSave}
          />
          <IconButton
            icon={<FolderOpen className="h-4 w-4" />}
            tooltip="Import Workflow"
            onClick={handleLoad}
          />
          <IconButton
            icon={<LayoutTemplate className="h-4 w-4" />}
            tooltip="Templates"
            onClick={() => openModal('templates')}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href="https://marketplace.genfeed.ai/workflows"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="ghost" size="icon-sm">
                  <Store className="h-4 w-4" />
                </Button>
              </a>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Marketplace</p>
            </TooltipContent>
          </Tooltip>
          <IconButton
            icon={<BookMarked className="h-4 w-4" />}
            tooltip="Prompt Library"
            onClick={() => openModal('promptLibrary')}
          />
          <IconButton
            icon={<Sparkles className="h-4 w-4" />}
            tooltip="AI Workflow Generator"
            onClick={toggleAIGenerator}
            active={showAIGenerator}
          />
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-border" />

        {/* Settings */}
        <IconButton
          icon={<Settings className="h-4 w-4" />}
          tooltip="Settings"
          onClick={() => openModal('settings')}
        />

        {/* Discord */}
        <Tooltip>
          <TooltipTrigger asChild>
            <a href="https://discord.gg/Qy867n83Z4" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon-sm">
                <DiscordIcon className="h-4 w-4" />
              </Button>
            </a>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Join Discord</p>
          </TooltipContent>
        </Tooltip>

        {/* Divider */}
        <div className="h-8 w-px bg-border" />

        {/* Cost Indicator */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => openModal('cost')}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition hover:bg-secondary"
            >
              <DollarSign className="h-4 w-4 text-chart-2" />
              <span className="font-medium tabular-nums">
                {actualCost > 0 ? actualCost.toFixed(2) : estimatedCost.toFixed(2)}
              </span>
              {actualCost > 0 && estimatedCost > 0 && actualCost !== estimatedCost && (
                <span className="text-xs text-muted-foreground">
                  (est. {estimatedCost.toFixed(2)})
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>View cost breakdown</p>
          </TooltipContent>
        </Tooltip>

        {/* Divider */}
        <div className="h-8 w-px bg-border" />

        {/* Auto-Save Indicator */}
        <SaveIndicator />

        {/* Comment Navigator */}
        <CommentNavigator />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Run Controls */}
        {showResumeButton && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" onClick={handleResume} disabled={isRunning}>
                <RotateCcw className="h-4 w-4" />
                Resume
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Resume from failed node</p>
            </TooltipContent>
          </Tooltip>
        )}
        {hasSelection && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary" onClick={handleRunSelected} disabled={isRunning}>
                <PlayCircle className="h-4 w-4" />
                Run Selected ({selectedNodeIds.length})
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Execute only selected nodes</p>
            </TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={isRunning ? 'destructive' : 'default'} onClick={handleRunStop}>
              {isRunning ? (
                <>
                  <Square className="h-4 w-4" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  Run Workflow
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{isRunning ? 'Stop execution' : 'Execute all nodes'}</p>
          </TooltipContent>
        </Tooltip>

        {/* New Workflow */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/workflows/new">
              <Button variant="secondary">
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Create new workflow</p>
          </TooltipContent>
        </Tooltip>

        {/* Validation Errors Toast */}
        {uniqueErrorMessages.length > 0 && (
          <div className="fixed right-4 top-20 z-50 max-w-sm rounded-lg border border-destructive/30 bg-destructive/10 p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div className="min-w-0 flex-1">
                <h4 className="mb-2 text-sm font-medium text-destructive">Cannot run workflow</h4>
                <ul className="space-y-1">
                  {uniqueErrorMessages.slice(0, 5).map((message) => (
                    <li key={message} className="text-xs text-destructive/80">
                      {message}
                    </li>
                  ))}
                  {uniqueErrorMessages.length > 5 && (
                    <li className="text-xs text-destructive/60">
                      +{uniqueErrorMessages.length - 5} more errors
                    </li>
                  )}
                </ul>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={clearValidationErrors}>
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
