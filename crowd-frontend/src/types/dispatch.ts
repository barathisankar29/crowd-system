export type DispatchTargetType = "officer" | "zone" | "all";

export interface DispatchRecord {
  id: number;
  incidentId: string | null;
  targetType: DispatchTargetType;
  target: string;
  message: string;
  createdBy: string;
  createdAt: string;
}

export interface DispatchDraft {
  incidentId?: string;
  targetType: DispatchTargetType;
  targetPersonnelId?: string;
  targetZone?: string;
  message: string;
}
