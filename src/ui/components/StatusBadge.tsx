import type { ReactNode } from "react";

export type StatusBadgeTone = "success" | "warning" | "danger" | "info" | "muted";

interface StatusBadgeProps {
  children: ReactNode;
  tone?: StatusBadgeTone;
}

export function StatusBadge({ children, tone = "muted" }: StatusBadgeProps) {
  return <span className={`status-badge status-${tone}`}>{children}</span>;
}
