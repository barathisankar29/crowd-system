import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getAlerts,
  getMetrics,
  getSources,
  getStatus,
  heatmapUrl as buildHeatmapUrl,
  startMonitoring as apiStartMonitoring,
  stopMonitoring as apiStopMonitoring,
  switchSource as apiSwitchSource,
  testCamera as apiTestCamera,
  videoFeedUrl,
} from "../api/vision";
import type { AlertItem, CameraSource, CameraTestResult, ChartPoint, PredictionInfo, ZoneMetric } from "../types/vision";

// Backend truth is polled on this cadence and drives every page that reads
// from this context. Mounted once above the route tree (see AppRoutes.tsx)
// so navigating between pages never tears this down — only the interval
// gets cleared on a full app unmount, the backend monitoring process is
// controlled exclusively through startMonitoring()/stopMonitoring() below.
const POLL_MS = 1000;

const EMPTY_ZONES: ZoneMetric[] = [
  { id: "zone-a", name: "Zone A", count: null, capacity: null, status: null, message: null },
  { id: "zone-b", name: "Zone B", count: null, capacity: null, status: null, message: null },
  { id: "zone-c", name: "Zone C", count: null, capacity: null, status: null, message: null },
  { id: "zone-d", name: "Zone D", count: null, capacity: null, status: null, message: null },
  { id: "zone-e", name: "Zone E", count: null, capacity: null, status: null, message: null },
  { id: "zone-f", name: "Zone F", count: null, capacity: null, status: null, message: null },
  { id: "zone-g", name: "Zone G", count: null, capacity: null, status: null, message: null },
  { id: "zone-h", name: "Zone H", count: null, capacity: null, status: null, message: null },
  { id: "zone-i", name: "Zone I", count: null, capacity: null, status: null, message: null },
];

interface MonitoringContextValue {
  running: boolean;
  backendConnected: boolean;
  cameraConnected: boolean;
  startedAt: string | null;
  uptimeSeconds: number | null;
  source: string | null;
  sourceLabel: string | null;
  sources: CameraSource[];
  zones: ZoneMetric[];
  alerts: AlertItem[];
  totalCount: number;
  density: number;
  overallStatus: string;
  prediction: PredictionInfo | null;
  videoUrl: string | null;
  heatmapUrl: string | null;
  chartData: ChartPoint[];
  monitoringPending: boolean;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => Promise<void>;
  switchSource: (sourceKey: string) => Promise<{ success: boolean; message: string }>;
  testCamera: (url?: string) => Promise<CameraTestResult>;
}

const MonitoringContext = createContext<MonitoringContextValue | null>(null);

export function MonitoringProvider({ children }: { children: ReactNode }) {
  const [running, setRunning] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [cameraConnected, setCameraConnected] = useState(true);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [uptimeSeconds, setUptimeSeconds] = useState<number | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [sources, setSources] = useState<CameraSource[]>([]);
  const [zones, setZones] = useState<ZoneMetric[]>(EMPTY_ZONES);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [density, setDensity] = useState(0);
  const [overallStatus, setOverallStatus] = useState("SAFE");
  const [prediction, setPrediction] = useState<PredictionInfo | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [heatmapUrlState, setHeatmapUrlState] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [monitoringPending, setMonitoringPending] = useState(false);
  const videoInitializedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    getSources()
      .then((list) => mounted && setSources(list))
      .catch(() => {
        // Source list is a nice-to-have for the picker; leave it empty on failure.
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const pollStatus = async () => {
      try {
        const status = await getStatus();
        if (!mounted) return;

        setBackendConnected(true);
        setRunning(status.running);
        setCameraConnected(status.cameraConnected);
        setStartedAt(status.startedAt);
        setUptimeSeconds(status.uptimeSeconds);
        setSource(status.source);
        setSourceLabel(status.sourceLabel);

        if (!status.running) {
          setZones(EMPTY_ZONES);
          setAlerts([]);
          setVideoUrl(null);
          setHeatmapUrlState(null);
          setTotalCount(0);
          setDensity(0);
          setOverallStatus("SAFE");
          setPrediction(null);
          setChartData([]);
          videoInitializedRef.current = false;
          return;
        }

        const [metricsData, alertsData] = await Promise.all([getMetrics(), getAlerts()]);
        if (!mounted) return;

        const nextCount = metricsData.totalCount ?? 0;
        const nextDensity = metricsData.density ?? 0;
        const timeLabel = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        const nextZones = metricsData.zones?.length ? metricsData.zones : EMPTY_ZONES;
        const nextAlerts = Array.isArray(alertsData) ? alertsData.filter((a) => a?.id).slice(0, 20) : [];

        setZones(nextZones);
        setAlerts((prev) => {
          // /alerts returns the same "recent" incidents on every poll until
          // something changes, so a naive prepend re-adds the same id every
          // tick — dedupe by id (freshest poll wins) to avoid duplicate React
          // keys and a list that grows with copies of the same incident.
          const seen = new Set<string>();
          const deduped: AlertItem[] = [];
          for (const alert of [...nextAlerts, ...prev]) {
            if (seen.has(alert.id)) continue;
            seen.add(alert.id);
            deduped.push(alert);
          }
          return deduped.slice(0, 30);
        });
        setTotalCount(nextCount);
        setDensity(nextDensity);
        setOverallStatus(metricsData.overallStatus ?? "SAFE");
        setPrediction(metricsData.prediction ?? null);
        setChartData((prev) => [...prev, { time: timeLabel, count: nextCount, density: nextDensity }].slice(-20));

        if (!videoInitializedRef.current) {
          setVideoUrl(videoFeedUrl());
          videoInitializedRef.current = true;
        }
        setHeatmapUrlState(buildHeatmapUrl());
      } catch (error) {
        console.error("Monitoring status poll failed:", error);
        if (!mounted) return;
        setBackendConnected(false);
      }
    };

    pollStatus();
    const interval = window.setInterval(pollStatus, POLL_MS);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const startMonitoring = useCallback(async () => {
    setMonitoringPending(true);
    try {
      await apiStartMonitoring();
      setRunning(true);
    } finally {
      setMonitoringPending(false);
    }
  }, []);

  const stopMonitoring = useCallback(async () => {
    setMonitoringPending(true);
    try {
      await apiStopMonitoring();
      setRunning(false);
    } finally {
      setMonitoringPending(false);
    }
  }, []);

  const switchSource = useCallback((sourceKey: string) => apiSwitchSource(sourceKey), []);

  const testCamera = useCallback((url?: string) => apiTestCamera(url), []);

  const value = useMemo<MonitoringContextValue>(
    () => ({
      running,
      backendConnected,
      cameraConnected,
      startedAt,
      uptimeSeconds,
      source,
      sourceLabel,
      sources,
      zones,
      alerts,
      totalCount,
      density,
      overallStatus,
      prediction,
      videoUrl,
      heatmapUrl: heatmapUrlState,
      chartData,
      monitoringPending,
      startMonitoring,
      stopMonitoring,
      switchSource,
      testCamera,
    }),
    [
      running,
      backendConnected,
      cameraConnected,
      startedAt,
      uptimeSeconds,
      source,
      sourceLabel,
      sources,
      zones,
      alerts,
      totalCount,
      density,
      overallStatus,
      prediction,
      videoUrl,
      heatmapUrlState,
      chartData,
      monitoringPending,
      startMonitoring,
      stopMonitoring,
      switchSource,
      testCamera,
    ]
  );

  return <MonitoringContext.Provider value={value}>{children}</MonitoringContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook belongs with its provider
export function useMonitoring() {
  const ctx = useContext(MonitoringContext);
  if (!ctx) throw new Error("useMonitoring must be used within a MonitoringProvider");
  return ctx;
}
