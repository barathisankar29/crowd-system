import { apiGet, apiPatch, apiPost } from "./client";
import type { Incident } from "../types/incident";

export interface IncidentFilters {
  severity?: string;
  status?: string;
  zone?: string;
  q?: string;
}

export const listIncidents = (filters?: IncidentFilters) => {
  const params = new URLSearchParams();
  if (filters?.severity && filters.severity !== "all") params.set("severity", filters.severity);
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);
  if (filters?.zone && filters.zone !== "all") params.set("zone", filters.zone);
  if (filters?.q) params.set("q", filters.q);
  const qs = params.toString();
  return apiGet<Incident[]>(`/api/incidents${qs ? `?${qs}` : ""}`);
};

export const getIncident = (id: string) => apiGet<Incident>(`/api/incidents/${encodeURIComponent(id)}`);

export const setIncidentStatus = (id: string, status: string) =>
  apiPatch<Incident>(`/api/incidents/${encodeURIComponent(id)}`, { status });

export const assignIncident = (id: string, personnelId: string | null) =>
  apiPatch<Incident>(`/api/incidents/${encodeURIComponent(id)}/assign`, { personnelId });

export const addIncidentNote = (id: string, note: string, author?: string) =>
  apiPost<Incident>(`/api/incidents/${encodeURIComponent(id)}/notes`, { note, author });
