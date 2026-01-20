'use client';

import type { ReactNode } from 'react';

export interface ContextMenuItemProps {
  id: string;
  label?: string;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  isSelected?: boolean;
}

export function ContextMenuItem({
  label,
  icon,
  shortcut,
  disabled,
  danger,
  onClick,
  isSelected,
}: ContextMenuItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-3 px-3 py-2 text-left text-sm rounded-md
        transition-colors outline-none
        ${isSelected ? 'bg-[var(--secondary)]' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--secondary)] cursor-pointer'}
        ${danger && !disabled ? 'text-red-400 hover:text-red-300' : 'text-[var(--foreground)]'}
      `}
    >
      {icon && (
        <span
          className={`w-4 h-4 flex items-center justify-center ${danger ? 'text-red-400' : 'text-[var(--muted-foreground)]'}`}
        >
          {icon}
        </span>
      )}
      {label && <span className="flex-1">{label}</span>}
      {shortcut && <span className="text-xs text-[var(--muted-foreground)] ml-4">{shortcut}</span>}
    </button>
  );
}
