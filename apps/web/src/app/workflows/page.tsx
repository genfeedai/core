'use client';

import {
  Clock,
  Copy,
  ExternalLink,
  HelpCircle,
  Images,
  MoreHorizontal,
  Plus,
  Trash2,
  Workflow,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { WorkflowPreview } from '@/components/WorkflowPreview';
import type { WorkflowData } from '@/lib/api';
import { type ExecutionStats, executionsApi } from '@/lib/api/executions';
import { useWorkflowStore } from '@/store/workflowStore';

function formatRunTime(ms: number): string {
  if (ms === 0) return '0s';
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface WorkflowCardProps {
  workflow: WorkflowData;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

function WorkflowCard({ workflow, onDelete, onDuplicate }: WorkflowCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Link
      href={`/workflows/${workflow._id}`}
      className="group relative flex flex-col bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 hover:border-white transition-all duration-200"
    >
      {/* Workflow preview */}
      <div className="aspect-video bg-[var(--secondary)] rounded-md mb-3 overflow-hidden">
        <WorkflowPreview nodes={workflow.nodes ?? []} edges={workflow.edges ?? []} />
      </div>

      {/* Info */}
      <h3 className="font-medium text-[var(--foreground)] truncate">{workflow.name}</h3>
      <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] mt-1">
        <Clock className="w-3 h-3" />
        <span>{formatRelativeTime(new Date(workflow.updatedAt))}</span>
        <span className="mx-1">·</span>
        <span>{workflow.nodes?.length ?? 0} nodes</span>
      </div>

      {/* Menu button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="absolute top-3 right-3 p-1.5 rounded-md bg-[var(--background)] border border-[var(--border)] opacity-0 group-hover:opacity-100 hover:bg-[var(--secondary)] transition"
      >
        <MoreHorizontal className="w-4 h-4 text-[var(--muted-foreground)]" />
      </button>

      {/* Dropdown menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute top-12 right-3 z-20 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg py-1 min-w-[140px]">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDuplicate(workflow._id);
                setShowMenu(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--secondary)] transition"
            >
              <Copy className="w-4 h-4" />
              Duplicate
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(workflow._id);
                setShowMenu(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-[var(--secondary)] transition"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </Link>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { listWorkflows, deleteWorkflow, duplicateWorkflowApi } = useWorkflowStore();

  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
  const [stats, setStats] = useState<ExecutionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchWorkflows = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const data = await listWorkflows(signal);
        // Sort by most recently updated
        data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setWorkflows(data);
        setHasFetched(true);
      } catch (err) {
        if (signal?.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to load workflows');
      } finally {
        setIsLoading(false);
      }
    },
    [listWorkflows]
  );

  const fetchStats = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await executionsApi.getStats(signal);
      setStats(data);
    } catch (_err) {
      if (signal?.aborted) return;
      // Stats are optional, don't show error if they fail
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchWorkflows(controller.signal);
    fetchStats(controller.signal);
    return () => controller.abort();
  }, [fetchWorkflows, fetchStats]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Are you sure you want to delete this workflow?')) return;
      try {
        await deleteWorkflow(id);
        setWorkflows((prev) => prev.filter((w) => w._id !== id));
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete workflow');
      }
    },
    [deleteWorkflow]
  );

  const handleDuplicate = useCallback(
    async (id: string) => {
      try {
        const duplicated = await duplicateWorkflowApi(id);
        router.push(`/workflows/${duplicated._id}`);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to duplicate workflow');
      }
    },
    [duplicateWorkflowApi, router]
  );

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://cdn.genfeed.ai/assets/branding/logo-white.png"
              alt="Genfeed"
              className="h-8 w-auto"
            />
            <h1 className="text-xl font-semibold text-[var(--foreground)]">Genfeed</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/gallery"
              className="flex items-center gap-2 px-4 py-2 bg-[var(--secondary)] text-[var(--foreground)] rounded-lg text-sm font-medium hover:bg-[var(--secondary)]/80 transition"
            >
              <Images className="w-4 h-4" />
              Gallery
            </Link>
            <a
              href="https://marketplace.genfeed.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-[var(--secondary)] text-[var(--foreground)] rounded-lg text-sm font-medium hover:bg-[var(--secondary)]/80 transition"
            >
              <ExternalLink className="w-4 h-4" />
              Marketplace
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Overview</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            All the workflows, credentials and data tables you have access to
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-[var(--border)] rounded-lg overflow-hidden mt-6">
            <div className="bg-[var(--card)] p-4">
              <p className="text-xs text-[var(--muted-foreground)] mb-1">Prod. executions</p>
              <p className="text-2xl font-semibold text-[var(--foreground)]">
                {stats?.totalExecutions ?? 0}
              </p>
            </div>
            <div className="bg-[var(--card)] p-4">
              <p className="text-xs text-[var(--muted-foreground)] mb-1">Failed prod. executions</p>
              <p className="text-2xl font-semibold text-[var(--foreground)]">
                {stats?.failedExecutions ?? 0}
              </p>
            </div>
            <div className="bg-[var(--card)] p-4">
              <p className="text-xs text-[var(--muted-foreground)] mb-1">Failure rate</p>
              <p className="text-2xl font-semibold text-[var(--foreground)]">
                {stats?.failureRate ?? 0}%
              </p>
            </div>
            <div className="bg-[var(--card)] p-4">
              <p className="text-xs text-[var(--muted-foreground)] mb-1 flex items-center gap-1">
                Time saved
                <HelpCircle className="w-3 h-3" />
              </p>
              <p className="text-2xl font-semibold text-[var(--foreground)]">--</p>
            </div>
            <div className="bg-[var(--card)] p-4">
              <p className="text-xs text-[var(--muted-foreground)] mb-1">Run time (avg.)</p>
              <p className="text-2xl font-semibold text-[var(--foreground)]">
                {formatRunTime(stats?.avgRunTimeMs ?? 0)}
              </p>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-6">Your Workflows</h2>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[var(--muted-foreground)]">Loading workflows...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center py-20">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => fetchWorkflows()}
              className="px-4 py-2 bg-[var(--secondary)] text-[var(--foreground)] rounded-lg hover:opacity-90 transition"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && hasFetched && workflows.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--secondary)] flex items-center justify-center">
              <Workflow className="w-8 h-8 text-[var(--muted-foreground)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">No workflows yet</h3>
            <p className="text-[var(--muted-foreground)] mb-6">
              Create your first AI content workflow to get started
            </p>
            <Link
              href="/workflows/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90 transition"
            >
              <Plus className="w-4 h-4" />
              Create Workflow
            </Link>
          </div>
        )}

        {/* Workflow grid */}
        {!isLoading && !error && workflows.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 [&:hover>*]:opacity-60 [&:hover>*:hover]:opacity-100">
            {/* New workflow card */}
            <Link
              href="/workflows/new"
              className="group flex items-center justify-center bg-[var(--card)] border-2 border-dashed border-[var(--border)] rounded-lg p-4 hover:border-white hover:bg-[var(--secondary)] transition-all duration-200"
            >
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 group-hover:scale-110 transition-all duration-300">
                  <Plus className="w-7 h-7 text-white" />
                </div>
                <span className="text-sm font-medium text-[var(--foreground)]">New Workflow</span>
              </div>
            </Link>

            {/* Existing workflows */}
            {workflows.map((workflow) => (
              <WorkflowCard
                key={workflow._id}
                workflow={workflow}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
