export type ZoneStatus = "SAFE" | "MODERATE" | "HIGH";
export type AlertSeverity = ZoneStatus | "INFO";

export interface ZoneMetric {
  id: string;
  name: string;
  count: number | null;
  capacity: number | null;
  status: ZoneStatus | null;
  message: string | null;
}

export interface AlertItem {
  id: string;
  title: string;
  severity: AlertSeverity | null;
  timestamp: string | null;
}

export interface PredictionInfo {
  predictedCount: number;
  predictedDensity: number;
  horizonSeconds: number;
  riskLevel: "safe" | "moderate" | "high";
  method: string;
}

export interface MetricsResponse {
  totalCount: number;
  density: number;
  overallStatus: string;
  zones: ZoneMetric[];
  source?: string;
  sourceLabel?: string;
  sourceName?: string;
  cameraMode?: string;
  anomalyScore?: number;
  monitoring: boolean;
  prediction: PredictionInfo | null;
}

export interface ChartPoint {
  time: string;
  count: number;
  density: number;
}

export interface ZoneCoverage {
  zone: string;
  capacity: number;
  current: number;
  density: number;
  status: "critical" | "medium" | "low";
  officers: number;
}

export interface MonitoringStatus {
  running: boolean;
  source: string | null;
  sourceLabel: string | null;
  sourceName: string | null;
  cameraMode: string | null;
  cameraConnected: boolean;
  startedAt: string | null;
  uptimeSeconds: number | null;
  totalCount: number;
  density: number;
  overallStatus: string;
  anomalyScore: number;
  prediction: PredictionInfo | null;
}

export interface CameraSource {
  id: string;
  label: string;
  name: string;
  type: string;
  zoneScale: number;
}

export interface CameraTestResult {
  connected: boolean;
  message: string;
}
