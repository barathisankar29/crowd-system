import type { ReactNode } from "react";

export type BadgeTone = "critical" | "high" | "medium" | "low" | "safe" | "info" | "neutral";

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return <span className={`ui-badge tone-${tone}`}>{children}</span>;
}
