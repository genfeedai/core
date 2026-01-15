'use client';

import type { AnimationNodeData, CubicBezier, NodeStatus } from '@genfeedai/types';
import { NODE_DEFINITIONS, type NodeType } from '@genfeedai/types';
import { X } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { BezierCurveEditor } from './BezierCurveEditor';

const STATUS_COLORS: Record<NodeStatus, string> = {
  idle: 'bg-gray-500',
  pending: 'bg-gray-500',
  processing: 'bg-blue-500 animate-pulse',
  complete: 'bg-green-500',
  error: 'bg-red-500',
};

const HANDLE_TYPE_COLORS: Record<string, string> = {
  image: 'bg-amber-500',
  video: 'bg-purple-500',
  text: 'bg-emerald-500',
  audio: 'bg-blue-500',
};

export function ConfigPanel() {
  const { selectedNodeId, toggleConfigPanel } = useUIStore();
  const { getNodeById, updateNodeData } = useWorkflowStore();

  const selectedNode = selectedNodeId ? getNodeById(selectedNodeId) : null;
  const nodeDef = selectedNode ? NODE_DEFINITIONS[selectedNode.type as NodeType] : null;

  if (!selectedNode || !nodeDef) {
    return (
      <div className="w-80 h-full bg-[var(--background)] border-l border-[var(--border)] flex flex-col">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-semibold text-sm text-[var(--foreground)]">Configuration</h2>
          <button
            onClick={toggleConfigPanel}
            className="p-1 hover:bg-[var(--secondary)] rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-[var(--muted-foreground)] text-sm">
          Select a node to configure
        </div>
      </div>
    );
  }

  const nodeData = selectedNode.data;

  return (
    <div className="w-80 h-full bg-[var(--background)] border-l border-[var(--border)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm text-[var(--foreground)]">{nodeDef.label}</h2>
          <p className="text-xs text-[var(--muted-foreground)]">{nodeDef.description}</p>
        </div>
        <button
          onClick={toggleConfigPanel}
          className="p-1 hover:bg-[var(--secondary)] rounded transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Node Label */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)] block mb-1">Node Label</label>
          <input
            type="text"
            value={nodeData.label}
            onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-[var(--card)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>

        {/* Status */}
        <div>
          <label className="text-xs text-[var(--muted-foreground)] block mb-1">Status</label>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${STATUS_COLORS[nodeData.status] ?? 'bg-gray-500'}`}
            />
            <span className="text-sm capitalize">{nodeData.status}</span>
          </div>
        </div>

        {/* Animation Node - Bezier Editor */}
        {selectedNode.type === 'animation' && (
          <div>
            <label className="text-xs text-[var(--muted-foreground)] block mb-2">
              Custom Bezier Curve
            </label>
            <BezierCurveEditor
              value={(nodeData as AnimationNodeData).customCurve}
              onChange={(curve: CubicBezier) =>
                updateNodeData<AnimationNodeData>(selectedNode.id, {
                  customCurve: curve,
                  curveType: 'custom',
                })
              }
            />
          </div>
        )}

        {/* Node Info */}
        <div className="pt-4 border-t border-[var(--border)]">
          <h3 className="text-xs font-medium text-[var(--foreground)] mb-2">Connections</h3>

          {nodeDef.inputs.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-[var(--muted-foreground)] mb-1">Inputs</div>
              {nodeDef.inputs.map((input) => (
                <div key={input.id} className="flex items-center gap-2 text-xs py-1">
                  <div
                    className={`w-2 h-2 rounded-full ${HANDLE_TYPE_COLORS[input.type] ?? 'bg-blue-500'}`}
                  />
                  <span className="text-[var(--foreground)]">{input.label}</span>
                  <span className="text-[var(--muted-foreground)]">({input.type})</span>
                  {input.required && <span className="text-red-400">*</span>}
                </div>
              ))}
            </div>
          )}

          {nodeDef.outputs.length > 0 && (
            <div>
              <div className="text-xs text-[var(--muted-foreground)] mb-1">Outputs</div>
              {nodeDef.outputs.map((output) => (
                <div key={output.id} className="flex items-center gap-2 text-xs py-1">
                  <div
                    className={`w-2 h-2 rounded-full ${HANDLE_TYPE_COLORS[output.type] ?? 'bg-blue-500'}`}
                  />
                  <span className="text-[var(--foreground)]">{output.label}</span>
                  <span className="text-[var(--muted-foreground)]">({output.type})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
