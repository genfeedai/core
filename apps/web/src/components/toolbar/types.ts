/**
 * Toolbar Component Types
 */

export interface DropdownItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  external?: boolean;
}

export interface ToolbarDropdownProps {
  label: string;
  items: DropdownItem[];
}

export interface OverflowMenuProps {
  items: DropdownItem[];
}
