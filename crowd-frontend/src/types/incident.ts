import type { Personnel } from "./personnel";

export type IncidentSeverity = "critical" | "high" | "medium" | "low";
export type IncidentStatus = "active" | "monitoring" | "resolved";

export interface IncidentNote {
  id: number;
  author: string;
  note: string;
  kind: "note" | "status" | "dispatch" | "auto";
  createdAt: string;
}

export interface Incident {
  id: string; // e.g. "INC-000123"
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  severity: IncidentSeverity;
  zone: string;
  crowdCount: number;
  density: number;
  alertType: string;
  status: IncidentStatus;
  description: string;
  source: "auto" | "manual";
  assignedTo: Personnel | null;
  notes?: IncidentNote[];
}
