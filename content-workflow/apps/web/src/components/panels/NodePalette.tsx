"use client";

import { useCallback } from "react";
import {
  Image,
  MessageSquare,
  FileText,
  Sparkles,
  Video,
  Brain,
  Wand2,
  Layers,
  CheckCircle,
  Eye,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { getNodesByCategory, type NodeType, type NodeCategory } from "@/types/nodes";

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
  input: "Input",
  ai: "AI Generation",
  processing: "Processing",
  output: "Output",
};

const CATEGORY_COLORS: Record<NodeCategory, string> = {
  input: "bg-emerald-500/20 text-emerald-400",
  ai: "bg-purple-500/20 text-purple-400",
  processing: "bg-blue-500/20 text-blue-400",
  output: "bg-amber-500/20 text-amber-400",
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
      event.dataTransfer.setData("nodeType", type);
      event.dataTransfer.effectAllowed = "move";
    },
    [type]
  );

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-lg cursor-grab hover:border-[var(--primary)] transition-colors group"
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded ${CATEGORY_COLORS[category]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-[var(--foreground)] truncate">
            {label}
          </div>
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
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-[var(--secondary)] transition"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)]" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]" />
        )}
        <span className="font-medium text-sm text-[var(--foreground)]">
          {CATEGORY_LABELS[category]}
        </span>
        <span className="text-xs text-[var(--muted-foreground)] ml-auto">
          {nodes.length}
        </span>
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
    new Set(["input", "ai"])
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

  const categories: NodeCategory[] = ["input", "ai", "processing", "output"];

  return (
    <div className="w-64 h-full bg-[var(--background)] border-r border-[var(--border)] flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <h2 className="font-semibold text-sm text-[var(--foreground)]">Nodes</h2>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">
          Drag nodes onto the canvas
        </p>
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
