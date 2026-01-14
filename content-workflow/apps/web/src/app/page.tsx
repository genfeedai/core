"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { WorkflowCanvas } from "@/components/canvas/WorkflowCanvas";
import { NodePalette } from "@/components/panels/NodePalette";
import { ConfigPanel } from "@/components/panels/ConfigPanel";
import { Toolbar } from "@/components/Toolbar";
import { useUIStore } from "@/store/uiStore";

export default function Home() {
  const { showPalette, showConfigPanel } = useUIStore();

  return (
    <ReactFlowProvider>
      <main className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--background)]">
        <Toolbar />
        <div className="flex-1 flex overflow-hidden">
          {showPalette && <NodePalette />}
          <div className="flex-1 relative">
            <WorkflowCanvas />
          </div>
          {showConfigPanel && <ConfigPanel />}
        </div>
      </main>
    </ReactFlowProvider>
  );
}
