import { API_BASE, apiGet, apiPost } from "./client";
import type { AlertItem, MetricsResponse } from "../types/vision";

export const getMetrics = () => apiGet<MetricsResponse>(`/metrics?ts=${Date.now()}`);
export const getAlerts = () => apiGet<AlertItem[]>(`/alerts?ts=${Date.now()}`);

export const videoFeedUrl = () => `${API_BASE}/video_feed`;
export const heatmapUrl = () => `${API_BASE}/heatmap?ts=${Date.now()}`;

export const startMonitoring = () => apiPost<{ success: boolean; monitoring: boolean }>("/api/monitoring/start");
export const stopMonitoring = () => apiPost<{ success: boolean; monitoring: boolean }>("/api/monitoring/stop");
