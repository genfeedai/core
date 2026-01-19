'use client';

import type { WorkflowFile } from '@genfeedai/types';
import {
  AlertCircle,
  BookMarked,
  Check,
  Cloud,
  CloudOff,
  DollarSign,
  FolderOpen,
  Home,
  LayoutGrid,
  LayoutTemplate,
  Loader2,
  PanelLeftClose,
  PanelRightClose,
  Play,
  Plus,
  Save,
  Settings,
  Sparkles,
  Square,
  Store,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePaneActions } from '@/hooks/usePaneActions';
import { logger } from '@/lib/logger';
import { useExecutionStore } from '@/store/executionStore';
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
 * Auto-save status indicator
 */
function SaveIndicator() {
  const isDirty = useWorkflowStore((state) => state.isDirty);
  const isSaving = useWorkflowStore((state) => state.isSaving);
  const autoSaveEnabled = useUIStore((state) => state.autoSaveEnabled);
  const toggleAutoSave = useUIStore((state) => state.toggleAutoSave);

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
  const { workflowName, isDirty, exportWorkflow } = useWorkflowStore();
  const {
    isRunning,
    executeWorkflow,
    stopExecution,
    validationErrors,
    clearValidationErrors,
    estimatedCost,
    actualCost,
  } = useExecutionStore();
  const {
    showPalette,
    showConfigPanel,
    showAIGenerator,
    togglePalette,
    toggleConfigPanel,
    toggleAIGenerator,
    openModal,
  } = useUIStore();
  const { autoLayout } = usePaneActions();

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

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-14 items-center gap-4 border-b border-border bg-card px-4">
        {/* Logo / Home Link */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-chart-4 hover:opacity-90 transition"
            >
              <Home className="h-4 w-4 text-primary-foreground" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Go to Dashboard</p>
          </TooltipContent>
        </Tooltip>

        {/* Workflow Title */}
        <div>
          <h1 className="text-sm font-semibold text-foreground">
            {workflowName}
            {isDirty && <span className="text-muted-foreground">*</span>}
          </h1>
          <p className="text-xs text-muted-foreground">Genfeed</p>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-border" />

        {/* Panel Toggles */}
        <div className="flex items-center gap-1">
          <IconButton
            icon={<PanelLeftClose className="h-4 w-4" />}
            tooltip="Toggle Node Palette"
            onClick={togglePalette}
            active={showPalette}
          />
          <IconButton
            icon={<PanelRightClose className="h-4 w-4" />}
            tooltip="Toggle Config Panel"
            onClick={toggleConfigPanel}
            active={showConfigPanel}
          />
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

        {/* Spacer */}
        <div className="flex-1" />

        {/* Run Controls */}
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
            <Link href="/w/new">
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
