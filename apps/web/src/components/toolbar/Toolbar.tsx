'use client';

import type { WorkflowFile } from '@genfeedai/types';
import {
  AlertCircle,
  BookMarked,
  DollarSign,
  FolderOpen,
  LayoutGrid,
  LayoutTemplate,
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
import { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WorkflowSwitcher } from '@/components/workflow/WorkflowSwitcher';
import { usePaneActions } from '@/hooks/usePaneActions';
import { logger } from '@/lib/logger';
import { useExecutionStore } from '@/store/executionStore';
import { useUIStore } from '@/store/uiStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { CommentNavigator } from './CommentNavigator';
import { DiscordIcon, XIcon } from './icons';
import { OverflowMenu } from './OverflowMenu';
import { SaveIndicator } from './SaveIndicator';
import { ToolbarDropdown } from './ToolbarDropdown';
import type { DropdownItem } from './types';

/**
 * Validates workflow JSON structure before loading
 */
function isValidWorkflow(data: unknown): data is WorkflowFile {
  if (!data || typeof data !== 'object') return false;

  const workflow = data as Record<string, unknown>;

  if (typeof workflow.name !== 'string') return false;
  if (!Array.isArray(workflow.nodes)) return false;
  if (!Array.isArray(workflow.edges)) return false;

  for (const node of workflow.nodes) {
    if (!node || typeof node !== 'object') return false;
    const n = node as Record<string, unknown>;
    if (typeof n.id !== 'string') return false;
    if (typeof n.type !== 'string') return false;
    if (!n.position || typeof n.position !== 'object') return false;
  }

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
  const { exportWorkflow, selectedNodeIds } = useWorkflowStore();
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
  const { toggleAIGenerator, openModal } = useUIStore();
  const { autoLayout } = usePaneActions();

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

  const fileMenuItems: DropdownItem[] = useMemo(
    () => [
      {
        id: 'export',
        label: 'Export Workflow',
        icon: <Save className="h-4 w-4" />,
        onClick: handleSave,
      },
      {
        id: 'import',
        label: 'Import Workflow',
        icon: <FolderOpen className="h-4 w-4" />,
        onClick: handleLoad,
      },
      {
        id: 'layout',
        label: 'Auto-layout',
        icon: <LayoutGrid className="h-4 w-4" />,
        onClick: () => autoLayout('LR'),
      },
    ],
    [handleSave, handleLoad, autoLayout]
  );

  const resourcesMenuItems: DropdownItem[] = useMemo(
    () => [
      {
        id: 'templates',
        label: 'Templates',
        icon: <LayoutTemplate className="h-4 w-4" />,
        onClick: () => openModal('templates'),
      },
      {
        id: 'promptLibrary',
        label: 'Prompt Library',
        icon: <BookMarked className="h-4 w-4" />,
        onClick: () => openModal('promptLibrary'),
      },
      {
        id: 'aiGenerator',
        label: 'AI Generator',
        icon: <Sparkles className="h-4 w-4" />,
        onClick: toggleAIGenerator,
      },
    ],
    [openModal, toggleAIGenerator]
  );

  const overflowMenuItems: DropdownItem[] = useMemo(
    () => [
      {
        id: 'settings',
        label: 'Settings',
        icon: <Settings className="h-4 w-4" />,
        onClick: () => openModal('settings'),
      },
      {
        id: 'marketplace',
        label: 'Marketplace',
        icon: <Store className="h-4 w-4" />,
        onClick: () => window.open('https://marketplace.genfeed.ai/workflows', '_blank'),
        external: true,
      },
      {
        id: 'discord',
        label: 'Discord',
        icon: <DiscordIcon className="h-4 w-4" />,
        onClick: () => window.open('https://discord.gg/Qy867n83Z4', '_blank'),
        external: true,
      },
      {
        id: 'twitter',
        label: 'X (Twitter)',
        icon: <XIcon className="h-4 w-4" />,
        onClick: () => window.open('https://x.com/genfeedai', '_blank'),
        external: true,
      },
    ],
    [openModal]
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-14 items-center gap-3 border-b border-border bg-card px-4">
        {/* Logo / Home Link */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/"
              className="flex h-6 w-6 items-center justify-center hover:opacity-90 transition"
            >
              <img
                src="https://cdn.genfeed.ai/assets/branding/logo-white.png"
                alt="Genfeed"
                className="h-6 w-6 object-contain"
              />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Go to Dashboard</p>
          </TooltipContent>
        </Tooltip>

        {/* Workflow Switcher */}
        <WorkflowSwitcher />

        {/* Divider */}
        <div className="h-8 w-px bg-border" />

        {/* File Menu */}
        <ToolbarDropdown label="File" items={fileMenuItems} />

        {/* Resources Menu */}
        <ToolbarDropdown label="Resources" items={resourcesMenuItems} />

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

        {/* Divider */}
        <div className="h-8 w-px bg-border" />

        {/* Overflow Menu */}
        <OverflowMenu items={overflowMenuItems} />

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
