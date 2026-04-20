import "./App.css";
import { useEffect, useMemo, useRef, useState } from "react";
import writeXlsxFile from "write-excel-file/browser";
import {
  Bell,
  MapPin,
  LayoutGrid,
  Camera,
  BarChart3,
  OctagonAlert,
  Settings,
  Play,
  Square,
  Download,
  FileSpreadsheet,
  Activity,
  Server,
  Waves,
  ChevronRight,
  ShieldCheck,
  TriangleAlert,
  Siren,
  X,
  ArrowUpRight,
  Gauge,
  Brain,
  Shield,
  ChevronDown,
  Users,
  ClipboardList,
  Lock,
  Radio,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type ZoneStatus = "SAFE" | "MODERATE" | "HIGH";
type AlertSeverity = ZoneStatus | "INFO";
type TabId = "overview" | "camera" | "analytics" | "alerts" | "settings";

interface ZoneMetric {
  id: string;
  name: string;
  count: number | null;
  capacity: number | null;
  status: ZoneStatus | null;
  message: string | null;
}

interface AlertItem {
  id: string;
  title: string;
  severity: AlertSeverity | null;
  timestamp: string | null;
}

interface MetricsResponse {
  totalCount?: number;
  density?: number;
  overallStatus?: string;
  zones: ZoneMetric[];
  locationName?: string;
}

interface ChartPoint {
  time: string;
  count: number;
  density: number;
}

const API_BASE = "http://localhost:5000";

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

const navItems: { id: TabId; label: string; icon: typeof LayoutGrid }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "camera", label: "Live Feed", icon: Camera },
  { id: "analytics", label: "Statistics", icon: BarChart3 },
  { id: "alerts", label: "Alerts", icon: OctagonAlert },
  { id: "settings", label: "Control Room", icon: Settings },
];

function getSeverityIcon(severity: AlertSeverity | null) {
  if (severity === "HIGH") return <Siren size={17} />;
  if (severity === "MODERATE") return <TriangleAlert size={17} />;
  if (severity === "SAFE") return <ShieldCheck size={17} />;
  return <Activity size={17} />;
}

function getZoneFill(zone: ZoneMetric) {
  if (zone.count === null || zone.capacity === null || zone.capacity <= 0) return 0;
  return Math.max(0, Math.min(100, (zone.count / zone.capacity) * 100));
}

function getZoneOccupancy(zone: ZoneMetric) {
  if (zone.count === null || zone.capacity === null || zone.capacity <= 0) return null;
  return (zone.count / zone.capacity) * 100;
}

function getInsight(zone: ZoneMetric | null) {
  if (!zone) {
    return {
      headline: "Pick any zone",
      body: "Click a zone card to see actionable crowd-management insights.",
      action: "Select a zone",
      tone: "neutral",
      capacityLeft: null as number | null,
    };
  }

  const fill = getZoneFill(zone);
  const capacityLeft =
    zone.count !== null && zone.capacity !== null ? Math.max(zone.capacity - zone.count, 0) : null;

  if (zone.status === "HIGH" || fill >= 85) {
    return {
      headline: "Critical pressure building",
      body: "This zone is near capacity. Restrict inflow, redirect movement, and keep security alerts active.",
      action: "Redirect traffic now",
      tone: "high",
      capacityLeft,
    };
  }

  if (zone.status === "MODERATE" || fill >= 55) {
    return {
      headline: "Crowd load rising",
      body: "This zone is stable for now, but density is increasing. Security staff should monitor entry flow closely.",
      action: "Monitor closely",
      tone: "moderate",
      capacityLeft,
    };
  }

  return {
    headline: "Zone remains healthy",
    body: "This zone has safe headroom and can handle normal movement without immediate intervention.",
    action: "Normal operations",
    tone: "safe",
    capacityLeft,
  };
}

function ZoneCard({
  zone,
  isActive,
  onClick,
}: {
  zone: ZoneMetric;
  isActive: boolean;
  onClick: () => void;
}) {
  const tone = zone.status ? zone.status.toLowerCase() : "neutral";
  const fill = getZoneFill(zone);

  return (
    <button
      type="button"
      className={`zone-card ${tone} ${isActive ? "selected" : ""}`}
      onClick={onClick}
      aria-pressed={isActive}
    >
      <div className="zone-card-top">
        <h3>{zone.name}</h3>
        <span className={`status-badge ${tone}`}>{zone.status ?? "Waiting..."}</span>
      </div>

      <div className="zone-value">{zone.count === null ? "--" : zone.count}</div>
      <div className="zone-capacity">/ {zone.capacity === null ? "--" : zone.capacity} capacity</div>
      <div className="zone-meter">
        <div className="zone-meter-bar" style={{ width: `${fill}%` }} />
      </div>
      <div className="zone-message">{zone.message ?? "Waiting for backend data"}</div>
    </button>
  );
}

function ZoneDetails({
  zone,
  onClose,
}: {
  zone: ZoneMetric | null;
  onClose: () => void;
}) {
  const insight = getInsight(zone);

  if (!zone) {
    return (
      <section className="panel zone-details-panel">
        <div className="zone-details-empty">
          <div className="zone-details-title">Zone Insights</div>
          <p>Select any zone card to view detailed stats and operational guidance.</p>
        </div>
      </section>
    );
  }

  const ratio = getZoneOccupancy(zone);
  const tone = zone.status ? zone.status.toLowerCase() : "neutral";

  return (
    <section className="panel zone-details-panel">
      <div className="zone-details-head">
        <div>
          <div className="zone-details-kicker">Zone Insights</div>
          <h3>{zone.name}</h3>
        </div>
        <button type="button" className="mini-close" onClick={onClose} aria-label="Close zone details">
          <X size={16} />
        </button>
      </div>

      <div className={`insight-highlight tone-${tone}`}>
        <div className="insight-icon">
          <Brain size={18} />
        </div>
        <div>
          <div className="insight-title">{insight.headline}</div>
          <p>{insight.body}</p>
        </div>
      </div>

      <div className="zone-details-grid">
        <article className="detail-stat">
          <span>People Count</span>
          <strong>{zone.count ?? "--"}</strong>
        </article>
        <article className="detail-stat">
          <span>Capacity</span>
          <strong>{zone.capacity ?? "--"}</strong>
        </article>
        <article className="detail-stat">
          <span>Occupancy</span>
          <strong>{ratio === null ? "--" : `${ratio.toFixed(1)}%`}</strong>
        </article>
        <article className={`detail-stat tone-${tone}`}>
          <span>Status</span>
          <strong>{zone.status ?? "UNKNOWN"}</strong>
        </article>
      </div>

      <div className="detail-message-box">
        <div className="detail-message-label">Live Note</div>
        <p>{zone.message ?? "No message available for this zone yet."}</p>
      </div>

      <div className="zone-action-row">
        <div className="zone-action-pill">
          <Gauge size={14} />
          <span>{insight.action}</span>
        </div>
        {insight.capacityLeft !== null && (
          <div className="zone-action-pill">
            <ArrowUpRight size={14} />
            <span>{insight.capacityLeft} slots left</span>
          </div>
        )}
      </div>
    </section>
  );
}

function AlertsPanel({ alerts }: { alerts: AlertItem[] }) {
  return (
    <section className="panel alerts-panel">
      <div className="panel-title-row">
        <h2 className="panel-heading">Live Incident Feed</h2>
        <span className="panel-pill">{alerts.length} Active</span>
      </div>

      <div className="alerts-list">
        {alerts.length === 0 ? (
          <div className="alerts-empty">Waiting for live alerts from backend...</div>
        ) : (
          alerts.map((alert) => (
            <article
              key={`${alert.id}-${alert.timestamp ?? "live"}`}
              className={`alert-row ${(alert.severity ?? "INFO").toLowerCase()}`}
            >
              <div className="alert-icon">{getSeverityIcon(alert.severity ?? "INFO")}</div>
              <div className="alert-content">
                <div className="alert-title">{alert.title}</div>
                <div className="alert-time">
                  {alert.severity ?? "INFO"} • {alert.timestamp ?? "Live"}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function AnalyticsChart({ data, running }: { data: ChartPoint[]; running: boolean }) {
  return (
    <section className="panel prediction-panel">
      <div className="panel-title-row">
        <h2 className="panel-heading">Crowd Analytics</h2>
        <div className="chart-meta">
          <span className="chart-chip cyan">People Count</span>
          <span className="chart-chip green">Density</span>
        </div>
      </div>

      <div className="prediction-chart-shell real-chart">
        {!running ? (
          <div className="prediction-empty">Start monitoring to view analytics</div>
        ) : data.length < 2 ? (
          <div className="prediction-empty">Collecting live data...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fill: "#8f95a3", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: "#8f95a3", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: "#8f95a3", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: "#0f131a",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "14px",
                  color: "#fff",
                }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="count"
                stroke="#28d7ff"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="density"
                stroke="#19e39a"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function HeatmapPanel({
  running,
  heatmapUrl,
}: {
  running: boolean;
  heatmapUrl: string | null;
}) {
  return (
    <section className="panel heatmap-shell">
      <div className="panel-title-row">
        <h2 className="panel-heading">Density Heatmap</h2>
        <span className="panel-pill subtle">Zone Spread</span>
      </div>

      <div className="heatmap-panel real-heatmap">
        {running && heatmapUrl ? (
          <img
            src={heatmapUrl}
            alt="Live density heatmap"
            className="heatmap-image"
          />
        ) : (
          <div className="heatmap-empty">No heatmap data yet</div>
        )}
        <div className="heatmap-legend">
          <div>
            <span className="legend-dot green" />
            Low
          </div>
          <div>
            <span className="legend-dot yellow" />
            Medium
          </div>
          <div>
            <span className="legend-dot red" />
            High
          </div>
        </div>
      </div>
    </section>
  );
}

function OverviewView(props: {
  running: boolean;
  backendConnected: boolean;
  videoUrl: string | null;
  heatmapUrl: string | null;
  zones: ZoneMetric[];
  chartData: ChartPoint[];
  alerts: AlertItem[];
  selectedZone: ZoneMetric | null;
  setSelectedZone: (zone: ZoneMetric) => void;
  clearSelectedZone: () => void;
}) {
  const {
    running,
    backendConnected,
    videoUrl,
    heatmapUrl,
    zones,
    chartData,
    alerts,
    selectedZone,
    setSelectedZone,
    clearSelectedZone,
  } = props;

  return (
    <>
      <section className="hero-grid">
        <section className="panel video-panel">
          <div className="camera-tag">
            <span className={`camera-dot ${running && backendConnected ? "live" : ""}`} />
            <span>CAMERA 1</span>
          </div>

          {running && videoUrl ? (
            <img src={videoUrl} alt="Live camera feed" className="video-feed" />
          ) : (
            <div className="video-placeholder">
              <span className="video-placeholder-dot" />
              <p>{running ? "Waiting for backend stream..." : "System Stopped"}</p>
            </div>
          )}
        </section>

        <HeatmapPanel running={running} heatmapUrl={heatmapUrl} />
      </section>

      <section className="zones-and-detail-grid">
        <section className="zones-grid">
          {zones.map((zone) => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              isActive={selectedZone?.id === zone.id}
              onClick={() => setSelectedZone(zone)}
            />
          ))}
        </section>

        <ZoneDetails zone={selectedZone} onClose={clearSelectedZone} />
      </section>

      <section className="lower-grid">
        <AnalyticsChart data={chartData} running={running && backendConnected} />
        <AlertsPanel alerts={alerts} />
      </section>
    </>
  );
}

function CameraView(props: {
  running: boolean;
  backendConnected: boolean;
  videoUrl: string | null;
  heatmapUrl: string | null;
}) {
  const { running, backendConnected, videoUrl, heatmapUrl } = props;

  return (
    <section className="camera-layout">
      <section className="panel camera-large-panel">
        <div className="camera-tag">
          <span className={`camera-dot ${running && backendConnected ? "live" : ""}`} />
          <span>CAMERA 1 — PRIMARY VIEW</span>
        </div>

        {running && videoUrl ? (
          <img src={videoUrl} alt="Expanded live camera feed" className="video-feed" />
        ) : (
          <div className="video-placeholder">
            <span className="video-placeholder-dot" />
            <p>{running ? "Waiting for backend stream..." : "System Stopped"}</p>
          </div>
        )}
      </section>

      <HeatmapPanel running={running} heatmapUrl={heatmapUrl} />
    </section>
  );
}

function AnalyticsView(props: {
  running: boolean;
  backendConnected: boolean;
  chartData: ChartPoint[];
  totalCount: number;
  density: number;
  overallStatus: string;
}) {
  const { running, backendConnected, chartData, totalCount, density, overallStatus } = props;

  return (
    <div className="stack-layout">
      <section className="stats-cards-grid">
        <article className="panel stat-card">
          <div className="stat-icon cyan">
            <Activity size={18} />
          </div>
          <div className="stat-card-label">Total People</div>
          <div className="stat-card-value">{totalCount}</div>
        </article>

        <article className="panel stat-card">
          <div className="stat-icon green">
            <Waves size={18} />
          </div>
          <div className="stat-card-label">Density</div>
          <div className="stat-card-value">{density.toFixed(2)}</div>
        </article>

        <article className="panel stat-card">
          <div className="stat-icon red">
            <Server size={18} />
          </div>
          <div className="stat-card-label">System Status</div>
          <div className="stat-card-value small">{overallStatus}</div>
        </article>
      </section>

      <AnalyticsChart data={chartData} running={running && backendConnected} />
    </div>
  );
}

function AlertsView({ alerts }: { alerts: AlertItem[] }) {
  return <AlertsPanel alerts={alerts} />;
}

function SettingsView(props: {
  backendConnected: boolean;
  running: boolean;
  totalCount: number;
  density: number;
  overallStatus: string;
  operatorLabel: string;
  locationLabel: string;
}) {
  const { backendConnected, running, totalCount, density, overallStatus, operatorLabel, locationLabel } = props;

  return (
    <section className="settings-grid">
      <article className="panel settings-card">
        <h2 className="panel-heading">Security Operations</h2>
        <div className="settings-row">
          <span>Authority Access</span>
          <strong className="stat-green">Authorized</strong>
        </div>
        <div className="settings-row">
          <span>Operator</span>
          <strong>{operatorLabel}</strong>
        </div>
        <div className="settings-row">
          <span>Coverage Area</span>
          <strong>{locationLabel}</strong>
        </div>
      </article>

      <article className="panel settings-card">
        <h2 className="panel-heading">System Health</h2>
        <div className="settings-row">
          <span>Backend</span>
          <strong className={backendConnected ? "stat-green" : "stat-red"}>
            {backendConnected ? "Connected" : "Disconnected"}
          </strong>
        </div>
        <div className="settings-row">
          <span>Monitoring</span>
          <strong>{running ? "Running" : "Stopped"}</strong>
        </div>
        <div className="settings-row">
          <span>Overall Status</span>
          <strong>{overallStatus}</strong>
        </div>
      </article>

      <article className="panel settings-card">
        <h2 className="panel-heading">Live Response Snapshot</h2>
        <div className="settings-row">
          <span>Total Count</span>
          <strong>{totalCount}</strong>
        </div>
        <div className="settings-row">
          <span>Density</span>
          <strong>{density.toFixed(2)}</strong>
        </div>
        <div className="settings-row">
          <span>Alert Mode</span>
          <strong>{overallStatus === "HIGH" ? "Escalated" : "Monitoring"}</strong>
        </div>
      </article>
    </section>
  );
}

export default function App() {
  const [running, setRunning] = useState(false);
  const [zones, setZones] = useState<ZoneMetric[]>(EMPTY_ZONES);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [heatmapUrl, setHeatmapUrl] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [density, setDensity] = useState<number>(0);
  const [overallStatus, setOverallStatus] = useState<string>("SAFE");
  const [backendConnected, setBackendConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState("Locating...");
  const [operatorLabel] = useState("Security Command");
  const [profileOpen, setProfileOpen] = useState(false);
  const videoInitializedRef = useRef(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationLabel("Location unavailable");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(4);
        const lon = position.coords.longitude.toFixed(4);
        setLocationLabel(`Lat ${lat}, Lon ${lon}`);
      },
      () => {
        setLocationLabel("Location access denied");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  }, []);

  useEffect(() => {
    if (!running) {
      setZones(EMPTY_ZONES);
      setAlerts([]);
      setVideoUrl(null);
      setHeatmapUrl(null);
      setBackendConnected(false);
      setTotalCount(0);
      setDensity(0);
      setOverallStatus("SAFE");
      setChartData([]);
      setSelectedZoneId(null);
      videoInitializedRef.current = false;
      return;
    }

    let mounted = true;

    const fetchAll = async () => {
      try {
        const stamp = Date.now();
        const [metricsRes, alertsRes] = await Promise.all([
          fetch(`${API_BASE}/metrics?ts=${stamp}`, { cache: "no-store" }),
          fetch(`${API_BASE}/alerts?ts=${stamp}`, { cache: "no-store" }),
        ]);

        if (!metricsRes.ok || !alertsRes.ok) {
          throw new Error("Backend request failed");
        }

        const metricsData: MetricsResponse = await metricsRes.json();
        const alertsData: AlertItem[] = await alertsRes.json();

        if (!mounted) return;

        const nextCount = metricsData.totalCount ?? 0;
        const nextDensity = metricsData.density ?? 0;
        const timeLabel = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        const nextZones = metricsData.zones?.length ? metricsData.zones : EMPTY_ZONES;
        const nextAlerts = Array.isArray(alertsData)
          ? alertsData.filter((a) => a?.id).slice(0, 20)
          : [];

        setBackendConnected(true);
        setZones(nextZones);
        setAlerts((prev) => [...nextAlerts, ...prev].slice(0, 30));
        setTotalCount(nextCount);
        setDensity(nextDensity);
        setOverallStatus(metricsData.overallStatus ?? "SAFE");

        if (metricsData.locationName?.trim()) {
          setLocationLabel(metricsData.locationName);
        }

        if (!videoInitializedRef.current) {
          setVideoUrl(`${API_BASE}/video_feed`);
          videoInitializedRef.current = true;
        }

        setHeatmapUrl(`${API_BASE}/heatmap?ts=${stamp}`);

        setSelectedZoneId((prev) => {
          if (!prev) return nextZones[0]?.id ?? null;
          return nextZones.some((zone) => zone.id === prev) ? prev : nextZones[0]?.id ?? null;
        });

        setChartData((prev) => {
          const updated = [...prev, { time: timeLabel, count: nextCount, density: nextDensity }];
          return updated.slice(-20);
        });
      } catch (error) {
        console.error("Polling failed:", error);
        if (!mounted) return;
        setBackendConnected(false);
      }
    };

    fetchAll();
    const interval = window.setInterval(fetchAll, 1000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [running]);

  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === selectedZoneId) ?? null,
    [zones, selectedZoneId]
  );

  const monitoringLabel = running ? "Stop Monitoring" : "Start Monitoring";
  const notificationCount = alerts.filter(
    (alert) => alert.severity === "HIGH" || alert.severity === "MODERATE"
  ).length;

  const exportCSV = () => {
    const rows = [
      ["Section", "Value"],
      ["Running", running ? "Yes" : "No"],
      ["Backend Connected", backendConnected ? "Yes" : "No"],
      ["Location", locationLabel],
      ["Operator", operatorLabel],
      ["Total Count", String(totalCount)],
      ["Density", String(density)],
      ["Overall Status", overallStatus],
      [],
      ["Zones"],
      ["Zone", "Count", "Capacity", "Status", "Message"],
      ...zones.map((z) => [z.name, z.count ?? "", z.capacity ?? "", z.status ?? "", z.message ?? ""]),
      [],
      ["Alerts"],
      ["Title", "Severity", "Timestamp"],
      ...alerts.map((a) => [a.title, a.severity ?? "", a.timestamp ?? ""]),
      [],
      ["Chart Data"],
      ["Time", "Count", "Density"],
      ...chartData.map((p) => [p.time, p.count, p.density]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "crowd-intelligence-data.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = async () => {
    type ExcelCell = {
      value?: string | number;
      fontWeight?: "bold";
    };

    const rows: ExcelCell[][] = [
      [{ value: "Section", fontWeight: "bold" }, { value: "Value", fontWeight: "bold" }],
      [{ value: "Running" }, { value: running ? "Yes" : "No" }],
      [{ value: "Backend Connected" }, { value: backendConnected ? "Yes" : "No" }],
      [{ value: "Location" }, { value: locationLabel }],
      [{ value: "Operator" }, { value: operatorLabel }],
      [{ value: "Total Count" }, { value: totalCount }],
      [{ value: "Density" }, { value: density }],
      [{ value: "Overall Status" }, { value: overallStatus }],
      [],
      [{ value: "Zones", fontWeight: "bold" }],
      [
        { value: "Zone", fontWeight: "bold" },
        { value: "Count", fontWeight: "bold" },
        { value: "Capacity", fontWeight: "bold" },
        { value: "Status", fontWeight: "bold" },
        { value: "Message", fontWeight: "bold" },
      ],
      ...zones.map((z) => [
        { value: z.name },
        { value: z.count ?? "" },
        { value: z.capacity ?? "" },
        { value: z.status ?? "" },
        { value: z.message ?? "" },
      ]),
      [],
      [{ value: "Alerts", fontWeight: "bold" }],
      [
        { value: "Title", fontWeight: "bold" },
        { value: "Severity", fontWeight: "bold" },
        { value: "Timestamp", fontWeight: "bold" },
      ],
      ...alerts.map((a) => [{ value: a.title }, { value: a.severity ?? "" }, { value: a.timestamp ?? "" }]),
      [],
      [{ value: "Chart Data", fontWeight: "bold" }],
      [
        { value: "Time", fontWeight: "bold" },
        { value: "Count", fontWeight: "bold" },
        { value: "Density", fontWeight: "bold" },
      ],
      ...chartData.map((p) => [{ value: p.time }, { value: p.count }, { value: p.density }]),
    ];

    await writeXlsxFile(rows as any, {
      fileName: "crowd-intelligence-data.xlsx",
    });
  };

  const renderTab = () => {
    if (activeTab === "camera") {
      return (
        <CameraView
          running={running}
          backendConnected={backendConnected}
          videoUrl={videoUrl}
          heatmapUrl={heatmapUrl}
        />
      );
    }

    if (activeTab === "analytics") {
      return (
        <AnalyticsView
          running={running}
          backendConnected={backendConnected}
          chartData={chartData}
          totalCount={totalCount}
          density={density}
          overallStatus={overallStatus}
        />
      );
    }

    if (activeTab === "alerts") {
      return <AlertsView alerts={alerts} />;
    }

    if (activeTab === "settings") {
      return (
        <SettingsView
          backendConnected={backendConnected}
          running={running}
          totalCount={totalCount}
          density={density}
          overallStatus={overallStatus}
          operatorLabel={operatorLabel}
          locationLabel={locationLabel}
        />
      );
    }

    return (
      <OverviewView
        running={running}
        backendConnected={backendConnected}
        videoUrl={videoUrl}
        heatmapUrl={heatmapUrl}
        zones={zones}
        chartData={chartData}
        alerts={alerts}
        selectedZone={selectedZone}
        setSelectedZone={(zone) => setSelectedZoneId(zone.id)}
        clearSelectedZone={() => setSelectedZoneId(null)}
      />
    );
  };

  return (
    <div className="app-shell">
      <header className="navbar">
        <div className="navbar-title-wrap">
          <div className="brand-mark" aria-hidden="true">
            <span />
          </div>
          <div className="brand-copy">
            <h1 className="brand-title">Crowd Intelligence System</h1>
            <div className="brand-sub">AI-assisted real-time monitoring for security authorities</div>
          </div>
        </div>

        <div className="navbar-right">
          <div className="topbar-chip location-time">
            <MapPin size={14} strokeWidth={1.8} className="location-icon" />
            <div className="location-copy">
              <span className="location-label">{locationLabel}</span>
              <span className="time-divider">•</span>
              <span className="location-clock">
                {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>

          <div className="topbar-chip live-indicator">
            <span className={`live-dot ${running && backendConnected ? "on" : ""}`} />
            <span>{running && backendConnected ? "LIVE" : "OFFLINE"}</span>
          </div>

          <button className="icon-button notif-button" type="button" aria-label="Incident notifications">
            <Bell size={19} strokeWidth={1.8} />
            {notificationCount > 0 ? (
              <span className="notif-badge">{Math.min(notificationCount, 9)}+</span>
            ) : null}
          </button>

          <div className="profile-wrap">
            <button
              className="avatar-button profile-trigger"
              type="button"
              aria-label="Security authority menu"
              onClick={() => setProfileOpen((prev) => !prev)}
            >
              <div className="avatar-ring">
                <Shield size={13} strokeWidth={2.2} />
              </div>
              <div className="avatar-meta">
                <span className="avatar-name">Security Command</span>
                <span className="avatar-role">Authority Access</span>
              </div>
              <ChevronDown size={15} className={`profile-caret ${profileOpen ? "open" : ""}`} />
            </button>

            {profileOpen && (
              <div className="profile-menu">
                <div className="profile-menu-head">
                  <div className="profile-menu-title">Authorized Control</div>
                  <div className="profile-menu-sub">Admin / Security / Authorities</div>
                </div>

                <button type="button" className="profile-menu-item">
                  <Users size={16} />
                  <span>Security Team</span>
                </button>
                <button type="button" className="profile-menu-item">
                  <ClipboardList size={16} />
                  <span>Incident Log</span>
                </button>
                <button type="button" className="profile-menu-item">
                  <Radio size={16} />
                  <span>Dispatch Control</span>
                </button>
                <button type="button" className="profile-menu-item">
                  <Lock size={16} />
                  <span>Authority Permissions</span>
                </button>
                <button type="button" className="profile-menu-item danger">
                  <Shield size={16} />
                  <span>Secure Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="body-shell">
        <aside className="sidebar">
          <div className="sidebar-nav-label">Control Workspace</div>
          <nav className="sidebar-nav" aria-label="Primary">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`sidebar-item ${activeTab === id ? "active" : ""}`}
                type="button"
                onClick={() => setActiveTab(id)}
                title={label}
              >
                <div className="sidebar-item-icon">
                  <Icon size={18} strokeWidth={1.9} />
                </div>
                <span className="sidebar-item-text">{label}</span>
                <ChevronRight size={15} className="sidebar-item-arrow" />
              </button>
            ))}
          </nav>
        </aside>

        <main className="content-area">
          <section className="page-heading-row">
            <div>
              <h2 className="page-heading">
                {activeTab === "overview" && "System Overview"}
                {activeTab === "camera" && "Live Feed"}
                {activeTab === "analytics" && "Statistics"}
                {activeTab === "alerts" && "Incident Alerts"}
                {activeTab === "settings" && "Control Room"}
              </h2>
              <p className="page-subheading">
                Real-time crowd monitoring, escalation alerts, and zone-based response
              </p>
            </div>

            <div className="action-group">
              <button
                type="button"
                className={`action-button primary ${running ? "danger" : ""}`}
                onClick={() => setRunning((prev) => !prev)}
              >
                {running ? <Square size={17} strokeWidth={2} /> : <Play size={17} strokeWidth={2} />}
                <span>{monitoringLabel}</span>
              </button>

              <button type="button" className="action-button secondary" onClick={exportCSV}>
                <Download size={17} strokeWidth={2} />
                <span>Export CSV</span>
              </button>

              <button type="button" className="action-button secondary" onClick={exportExcel}>
                <FileSpreadsheet size={17} strokeWidth={2} />
                <span>Export Excel</span>
              </button>
            </div>
          </section>

          {renderTab()}
        </main>
      </div>
    </div>
  );
}