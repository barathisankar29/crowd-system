import { API_BASE, apiGet, apiPost } from "./client";
import type { AlertItem, CameraSource, CameraTestResult, MetricsResponse, MonitoringStatus } from "../types/vision";

export const getMetrics = () => apiGet<MetricsResponse>(`/metrics?ts=${Date.now()}`);
export const getAlerts = () => apiGet<AlertItem[]>(`/alerts?ts=${Date.now()}`);
export const getStatus = () => apiGet<MonitoringStatus>(`/status?ts=${Date.now()}`);
export const getSources = () => apiGet<CameraSource[]>("/sources");

export const videoFeedUrl = () => `${API_BASE}/video_feed`;
export const heatmapUrl = () => `${API_BASE}/heatmap?ts=${Date.now()}`;

export const startMonitoring = () => apiPost<{ success: boolean; monitoring: boolean }>("/api/monitoring/start");
export const stopMonitoring = () => apiPost<{ success: boolean; monitoring: boolean }>("/api/monitoring/stop");
export const switchSource = (source: string) =>
  apiPost<{ success: boolean; message: string }>("/switch_source", { source });
export const testCamera = (url?: string) =>
  apiPost<CameraTestResult>("/api/camera/test", url ? { url } : {});
