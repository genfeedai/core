'use client';

import { ReactFlowProvider } from '@xyflow/react';
import { AnnotationModal } from '@/components/annotation/AnnotationModal';
import { WorkflowCanvas } from '@/components/canvas/WorkflowCanvas';
import { AIGeneratorPanel } from '@/components/panels/AIGeneratorPanel';
import { ConfigPanel } from '@/components/panels/ConfigPanel';
import { NodePalette } from '@/components/panels/NodePalette';
import { PromptLibraryModal } from '@/components/prompt-library';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { Toolbar } from '@/components/Toolbar';
import { GenerateWorkflowModal } from '@/components/workflow/GenerateWorkflowModal';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useUIStore } from '@/store/uiStore';

export default function Home() {
  const { showPalette, showConfigPanel, showAIGenerator, autoSaveEnabled } = useUIStore();

  // Initialize auto-save (triggers 5s after last change)
  useAutoSave(autoSaveEnabled);

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
          {showAIGenerator && <AIGeneratorPanel />}
        </div>
      </main>
      <PromptLibraryModal />
      <SettingsModal />
      <AnnotationModal />
      <GenerateWorkflowModal />
    </ReactFlowProvider>
  );
}
