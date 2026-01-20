import type { NodeType } from '@genfeedai/types';
import type { LucideIcon } from 'lucide-react';
import {
  FileText,
  Image,
  LayoutTemplate,
  MessageSquare,
  Mic,
  Play,
  PlayCircle,
  Plus,
  Save,
  Settings,
  Sparkles,
  Square,
  Type,
  Video,
  Wand2,
} from 'lucide-react';

export type CommandCategory = 'actions' | 'nodes' | 'navigation' | 'recent';

export interface Command {
  id: string;
  label: string;
  category: CommandCategory;
  shortcut?: string;
  icon: LucideIcon;
  keywords?: string[];
  nodeType?: NodeType;
}

export const COMMANDS: Command[] = [
  // Actions
  {
    id: 'run-workflow',
    label: 'Run Workflow',
    category: 'actions',
    shortcut: '⌘+Enter',
    icon: Play,
    keywords: ['execute', 'start', 'run'],
  },
  {
    id: 'run-selected',
    label: 'Run Selected Nodes',
    category: 'actions',
    shortcut: '⌘+Shift+Enter',
    icon: PlayCircle,
    keywords: ['execute', 'partial', 'selection'],
  },
  {
    id: 'stop-execution',
    label: 'Stop Execution',
    category: 'actions',
    icon: Square,
    keywords: ['stop', 'cancel', 'halt'],
  },
  {
    id: 'save-workflow',
    label: 'Save Workflow',
    category: 'actions',
    shortcut: '⌘+S',
    icon: Save,
    keywords: ['export', 'download'],
  },

  // Node shortcuts - AI
  {
    id: 'add-image-gen',
    label: 'Add Image Generator',
    category: 'nodes',
    shortcut: 'Shift+I',
    icon: Image,
    keywords: ['flux', 'stable diffusion', 'generate', 'create'],
    nodeType: 'imageGen',
  },
  {
    id: 'add-video-gen',
    label: 'Add Video Generator',
    category: 'nodes',
    shortcut: 'Shift+V',
    icon: Video,
    keywords: ['video', 'generate', 'create', 'kling', 'runway'],
    nodeType: 'videoGen',
  },
  {
    id: 'add-prompt',
    label: 'Add Prompt',
    category: 'nodes',
    shortcut: 'Shift+P',
    icon: FileText,
    keywords: ['text', 'input', 'prompt'],
    nodeType: 'prompt',
  },
  {
    id: 'add-llm',
    label: 'Add LLM',
    category: 'nodes',
    shortcut: 'Shift+L',
    icon: MessageSquare,
    keywords: ['ai', 'chat', 'gpt', 'claude', 'language'],
    nodeType: 'llm',
  },
  {
    id: 'add-text-to-speech',
    label: 'Add Text to Speech',
    category: 'nodes',
    icon: Mic,
    keywords: ['tts', 'voice', 'audio', 'speak'],
    nodeType: 'textToSpeech',
  },
  {
    id: 'add-transcribe',
    label: 'Add Transcribe',
    category: 'nodes',
    icon: Type,
    keywords: ['whisper', 'speech to text', 'stt', 'audio'],
    nodeType: 'transcribe',
  },

  // Navigation
  {
    id: 'open-settings',
    label: 'Open Settings',
    category: 'navigation',
    shortcut: '⌘+,',
    icon: Settings,
    keywords: ['preferences', 'config', 'options'],
  },
  {
    id: 'open-templates',
    label: 'Browse Templates',
    category: 'navigation',
    icon: LayoutTemplate,
    keywords: ['starter', 'presets', 'workflows'],
  },
  {
    id: 'toggle-ai-generator',
    label: 'AI Workflow Generator',
    category: 'navigation',
    icon: Sparkles,
    keywords: ['generate', 'create', 'ai'],
  },
  {
    id: 'new-workflow',
    label: 'New Workflow',
    category: 'navigation',
    icon: Plus,
    keywords: ['create', 'fresh', 'blank'],
  },
  {
    id: 'toggle-palette',
    label: 'Toggle Command Palette',
    category: 'navigation',
    shortcut: '⌘+K',
    icon: Wand2,
    keywords: ['search', 'commands'],
  },
];

export const CATEGORY_LABELS: Record<CommandCategory, string> = {
  recent: 'Recent',
  actions: 'Actions',
  nodes: 'Add Nodes',
  navigation: 'Navigation',
};

export const CATEGORY_ORDER: CommandCategory[] = ['recent', 'actions', 'nodes', 'navigation'];

export function filterCommands(commands: Command[], query: string): Command[] {
  if (!query.trim()) return commands;

  const lowerQuery = query.toLowerCase();

  return commands.filter((cmd) => {
    const labelMatch = cmd.label.toLowerCase().includes(lowerQuery);
    const keywordMatch = cmd.keywords?.some((kw) => kw.toLowerCase().includes(lowerQuery));
    return labelMatch || keywordMatch;
  });
}

export function groupCommandsByCategory(
  commands: Command[],
  recentIds: string[]
): Map<CommandCategory, Command[]> {
  const groups = new Map<CommandCategory, Command[]>();

  // Add recent commands first if any match
  if (recentIds.length > 0) {
    const recentCommands = recentIds
      .map((id) => commands.find((cmd) => cmd.id === id))
      .filter((cmd): cmd is Command => cmd !== undefined);

    if (recentCommands.length > 0) {
      groups.set('recent', recentCommands);
    }
  }

  // Group remaining commands by category
  for (const category of CATEGORY_ORDER) {
    if (category === 'recent') continue;

    const categoryCommands = commands.filter((cmd) => cmd.category === category);
    if (categoryCommands.length > 0) {
      groups.set(category, categoryCommands);
    }
  }

  return groups;
}
