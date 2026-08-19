import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from "./client";
import type {
  ImportPreviewResult,
  ImportRowResult,
  ImportSummary,
  Personnel,
  PersonnelDraft,
} from "../types/personnel";

export const listPersonnel = (filters?: { status?: string; zone?: string }) => {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);
  if (filters?.zone && filters.zone !== "all") params.set("zone", filters.zone);
  const qs = params.toString();
  return apiGet<Personnel[]>(`/api/personnel${qs ? `?${qs}` : ""}`);
};

export const createPersonnel = (draft: PersonnelDraft) => apiPost<Personnel>("/api/personnel", draft);

export const updatePersonnel = (id: string, draft: PersonnelDraft) =>
  apiPatch<Personnel>(`/api/personnel/${encodeURIComponent(id)}`, draft);

export const deactivatePersonnel = (id: string) =>
  apiDelete<Personnel>(`/api/personnel/${encodeURIComponent(id)}`);

export const deletePersonnel = (id: string) =>
  apiDelete<{ success: boolean }>(`/api/personnel/${encodeURIComponent(id)}`, true);

export const previewPersonnelImport = (file: File) =>
  apiUpload<ImportPreviewResult>("/api/personnel/import/preview", file);

export const confirmPersonnelImport = (rows: ImportRowResult[]) =>
  apiPost<ImportSummary>("/api/personnel/import/confirm", { rows });
