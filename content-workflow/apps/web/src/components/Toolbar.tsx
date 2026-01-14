"use client";

import { useCallback } from "react";
import {
  Play,
  Square,
  Save,
  FolderOpen,
  PanelLeftClose,
  PanelRightClose,
  LayoutTemplate,
} from "lucide-react";
import { useWorkflowStore } from "@/store/workflowStore";
import { useExecutionStore } from "@/store/executionStore";
import { useUIStore } from "@/store/uiStore";

export function Toolbar() {
  const { workflowName, isDirty, exportWorkflow, clearWorkflow } = useWorkflowStore();
  const { isRunning, executeWorkflow, stopExecution } = useExecutionStore();
  const { showPalette, showConfigPanel, togglePalette, toggleConfigPanel, openModal } =
    useUIStore();

  const handleSave = useCallback(() => {
    const workflow = exportWorkflow();
    const blob = new Blob([JSON.stringify(workflow, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${workflow.name.toLowerCase().replace(/\s+/g, "-")}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [exportWorkflow]);

  const handleLoad = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const workflow = JSON.parse(event.target?.result as string);
          useWorkflowStore.getState().loadWorkflow(workflow);
        } catch (error) {
          console.error("Failed to load workflow:", error);
        }
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
    <div className="h-14 bg-[var(--card)] border-b border-[var(--border)] flex items-center px-4 gap-4">
      {/* Logo / Title */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">CW</span>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-[var(--foreground)]">
            {workflowName}
            {isDirty && <span className="text-[var(--muted-foreground)]">*</span>}
          </h1>
          <p className="text-xs text-[var(--muted-foreground)]">Content Workflow</p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-8 w-px bg-[var(--border)]" />

      {/* Panel Toggles */}
      <div className="flex items-center gap-1">
        <button
          onClick={togglePalette}
          className={`p-2 rounded transition ${
            showPalette
              ? "bg-[var(--primary)] text-white"
              : "hover:bg-[var(--secondary)] text-[var(--foreground)]"
          }`}
          title="Toggle Node Palette"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
        <button
          onClick={toggleConfigPanel}
          className={`p-2 rounded transition ${
            showConfigPanel
              ? "bg-[var(--primary)] text-white"
              : "hover:bg-[var(--secondary)] text-[var(--foreground)]"
          }`}
          title="Toggle Config Panel"
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      {/* Divider */}
      <div className="h-8 w-px bg-[var(--border)]" />

      {/* File Operations */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleSave}
          className="p-2 hover:bg-[var(--secondary)] rounded transition text-[var(--foreground)]"
          title="Save Workflow"
        >
          <Save className="w-4 h-4" />
        </button>
        <button
          onClick={handleLoad}
          className="p-2 hover:bg-[var(--secondary)] rounded transition text-[var(--foreground)]"
          title="Load Workflow"
        >
          <FolderOpen className="w-4 h-4" />
        </button>
        <button
          onClick={() => openModal("templates")}
          className="p-2 hover:bg-[var(--secondary)] rounded transition text-[var(--foreground)]"
          title="Templates"
        >
          <LayoutTemplate className="w-4 h-4" />
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Run Controls */}
      <button
        onClick={handleRunStop}
        className={`px-4 py-2 rounded font-medium text-sm flex items-center gap-2 transition ${
          isRunning
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-[var(--accent)] hover:opacity-90 text-white"
        }`}
      >
        {isRunning ? (
          <>
            <Square className="w-4 h-4" />
            Stop
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Run Workflow
          </>
        )}
      </button>

      {/* New Workflow */}
      <button
        onClick={clearWorkflow}
        className="px-4 py-2 bg-[var(--secondary)] hover:bg-[var(--border)] rounded font-medium text-sm text-[var(--foreground)] transition"
      >
        New
      </button>
    </div>
  );
}
