import { apiGet, apiPost } from "./client";
import type { DispatchDraft, DispatchRecord } from "../types/dispatch";

export const listDispatch = (incidentId?: string) => {
  const qs = incidentId ? `?incidentId=${encodeURIComponent(incidentId)}` : "";
  return apiGet<DispatchRecord[]>(`/api/dispatch${qs}`);
};

export const createDispatch = (draft: DispatchDraft) => apiPost<DispatchRecord>("/api/dispatch", draft);
