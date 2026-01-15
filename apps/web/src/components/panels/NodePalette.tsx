'use client';

import { getNodesByCategory, type NodeCategory, type NodeType } from '@genfeedai/types';
import {
  Brain,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Eye,
  FileText,
  Image,
  Layers,
  MessageSquare,
  Sparkles,
  Video,
  Wand2,
} from 'lucide-react';
import { useCallback, useState } from 'react';

// Icon mapping
const ICONS: Record<string, typeof Image> = {
  Image,
  MessageSquare,
  FileText,
  Sparkles,
  Video,
  Brain,
  Maximize2: Sparkles,
  Wand2,
  Layers,
  CheckCircle,
  Eye,
  Download: CheckCircle,
};

const CATEGORY_LABELS: Record<NodeCategory, string> = {
  input: 'Input',
  ai: 'AI Generation',
  processing: 'Processing',
  output: 'Output',
};

const CATEGORY_COLORS: Record<NodeCategory, { icon: string; hover: string; cssVar: string }> = {
  input: {
    icon: 'bg-[var(--category-input)]/20 text-[var(--category-input)]',
    hover: 'hover:border-[var(--category-input)]',
    cssVar: 'var(--category-input)',
  },
  ai: {
    icon: 'bg-[var(--category-ai)]/20 text-[var(--category-ai)]',
    hover: 'hover:border-[var(--category-ai)]',
    cssVar: 'var(--category-ai)',
  },
  processing: {
    icon: 'bg-[var(--category-processing)]/20 text-[var(--category-processing)]',
    hover: 'hover:border-[var(--category-processing)]',
    cssVar: 'var(--category-processing)',
  },
  output: {
    icon: 'bg-[var(--category-output)]/20 text-[var(--category-output)]',
    hover: 'hover:border-[var(--category-output)]',
    cssVar: 'var(--category-output)',
  },
};

interface NodeCardProps {
  type: NodeType;
  label: string;
  description: string;
  icon: string;
  category: NodeCategory;
}

function NodeCard({ type, label, description, icon, category }: NodeCardProps) {
  const Icon = ICONS[icon] ?? Sparkles;

  const handleDragStart = useCallback(
    (event: React.DragEvent) => {
      event.dataTransfer.setData('nodeType', type);
      event.dataTransfer.effectAllowed = 'move';
    },
    [type]
  );

  const colors = CATEGORY_COLORS[category];

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`p-3 bg-[var(--card)] border border-[var(--border)] rounded-lg cursor-grab transition-colors group ${colors.hover}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded ${colors.icon}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-[var(--foreground)] truncate">{label}</div>
          <div className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-2">
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}

interface CategorySectionProps {
  category: NodeCategory;
  isExpanded: boolean;
  onToggle: () => void;
}

function CategorySection({ category, isExpanded, onToggle }: CategorySectionProps) {
  const nodes = getNodesByCategory()[category];

  return (
    <div className="border-b border-[var(--border)] last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-[var(--secondary)] transition cursor-pointer"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)]" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]" />
        )}
        <span className="font-medium text-sm text-[var(--foreground)]">
          {CATEGORY_LABELS[category]}
        </span>
        <span className="text-xs text-[var(--muted-foreground)] ml-auto">{nodes.length}</span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {nodes.map((node) => (
            <NodeCard
              key={node.type}
              type={node.type}
              label={node.label}
              description={node.description}
              icon={node.icon}
              category={node.category}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function NodePalette() {
  const [expandedCategories, setExpandedCategories] = useState<Set<NodeCategory>>(
    new Set(['input', 'ai'])
  );

  const toggleCategory = useCallback((category: NodeCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const categories: NodeCategory[] = ['input', 'ai', 'processing', 'output'];

  return (
    <div className="w-64 h-full bg-[var(--background)] border-r border-[var(--border)] flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <h2 className="font-semibold text-sm text-[var(--foreground)]">Nodes</h2>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">Drag nodes onto the canvas</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {categories.map((category) => (
          <CategorySection
            key={category}
            category={category}
            isExpanded={expandedCategories.has(category)}
            onToggle={() => toggleCategory(category)}
          />
        ))}
      </div>
    </div>
  );
}
