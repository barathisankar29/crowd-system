export type PersonnelStatus = "on-duty" | "responding" | "break" | "off-duty" | "inactive";

export interface Personnel {
  id: string;
  name: string;
  rank: string;
  phone: string;
  email: string;
  department: string;
  zone: string;
  shift: string;
  status: PersonnelStatus;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string | null;
}

export interface PersonnelDraft {
  id?: string;
  name?: string;
  rank?: string;
  phone?: string;
  email?: string;
  department?: string;
  zone?: string;
  shift?: string;
  status?: PersonnelStatus;
}

export interface ImportRowResult {
  rowNumber: number;
  data: Required<Pick<PersonnelDraft, "id" | "name" | "status">> & PersonnelDraft;
  errors: string[];
  warnings: string[];
  action: "create" | "update";
}

export interface ImportPreviewResult {
  fileError: string | null;
  rows: ImportRowResult[];
}

export interface ImportSummary {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
}
