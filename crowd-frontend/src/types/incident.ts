export interface TimelineEntry {
  time: string;
  actor: string;
  action: string;
  type: "auto" | "field" | "control";
}

export interface Incident {
  id: string;
  date: string;
  time: string;
  zone: string;
  type: string;

  severity: "critical" | "high" | "medium" | "low";
  status: "active" | "monitoring" | "resolved";

  reportedBy: string;
  assignedTo: string;

  density: string;
  casualties: number;
  evacuated: number;

  description: string;

  timeline: TimelineEntry[];

  tags: string[];
}