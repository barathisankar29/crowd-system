/*export default function Dashboard() {
  return (
    <div>
      Dashboard Page
    </div>
  );
}*/
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../state/SessionContext";
import { useMonitoring } from "../state/MonitoringContext";
import { Select } from "../components/ui/Select";
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
  TrendingUp,
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
import { ApiError } from "../api/client";
import type {
  AlertItem,
  AlertSeverity,
  CameraSource,
  CameraTestResult,
  ChartPoint,
  PredictionInfo,
  ZoneMetric,
} from "../types/vision";

type TabId = "overview" | "camera" | "analytics" | "alerts" | "settings";

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
          <span className="chart-chip green">Density Index</span>
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

function videoPlaceholderText(running: boolean, cameraConnected: boolean) {
  if (!running) return "System Stopped";
  if (!cameraConnected) return "CAMERA OFFLINE — retrying connection...";
  return "Waiting for backend stream...";
}

function cameraStatusWord(running: boolean, backendConnected: boolean, cameraConnected: boolean) {
  if (!backendConnected) return "BACKEND UNREACHABLE";
  if (!running) return "STOPPED";
  if (!cameraConnected) return "OFFLINE";
  return "LIVE";
}

function CameraTag({
  running,
  backendConnected,
  cameraConnected,
  sourceLabel,
  suffix,
}: {
  running: boolean;
  backendConnected: boolean;
  cameraConnected: boolean;
  sourceLabel: string | null;
  suffix?: string;
}) {
  const live = running && backendConnected && cameraConnected;
  return (
    <div className="camera-tag">
      <span className={`camera-dot ${live ? "live" : ""}`} />
      <span className="camera-tag-source">
        {sourceLabel ?? "Camera"}
        {suffix ? ` — ${suffix}` : ""}
      </span>
      <span className="camera-tag-sep" />
      <span className={`camera-tag-status ${live ? "live" : ""}`}>
        {cameraStatusWord(running, backendConnected, cameraConnected)}
      </span>
    </div>
  );
}

function OverviewView(props: {
  running: boolean;
  backendConnected: boolean;
  cameraConnected: boolean;
  sourceLabel: string | null;
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
    cameraConnected,
    sourceLabel,
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
          <CameraTag
            running={running}
            backendConnected={backendConnected}
            cameraConnected={cameraConnected}
            sourceLabel={sourceLabel}
          />

          {running && videoUrl && cameraConnected ? (
            <img src={videoUrl} alt="Live camera feed" className="video-feed" />
          ) : (
            <div className="video-placeholder">
              <span className="video-placeholder-dot" />
              <p>{videoPlaceholderText(running, cameraConnected)}</p>
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
  cameraConnected: boolean;
  sourceLabel: string | null;
  videoUrl: string | null;
  heatmapUrl: string | null;
}) {
  const { running, backendConnected, cameraConnected, sourceLabel, videoUrl, heatmapUrl } = props;

  return (
    <section className="camera-layout">
      <section className="panel camera-large-panel">
        <CameraTag
          running={running}
          backendConnected={backendConnected}
          cameraConnected={cameraConnected}
          sourceLabel={sourceLabel}
          suffix="Primary View"
        />

        {running && videoUrl && cameraConnected ? (
          <img src={videoUrl} alt="Expanded live camera feed" className="video-feed" />
        ) : (
          <div className="video-placeholder">
            <span className="video-placeholder-dot" />
            <p>{videoPlaceholderText(running, cameraConnected)}</p>
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
  prediction: PredictionInfo | null;
}) {
  const { running, backendConnected, chartData, totalCount, density, overallStatus, prediction } = props;

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
          <div className="stat-card-label">Crowd Density Index</div>
          <div className="stat-card-value">{density.toFixed(2)}</div>
        </article>

        <article className="panel stat-card">
          <div className="stat-icon red">
            <Server size={18} />
          </div>
          <div className="stat-card-label">System Status</div>
          <div className="stat-card-value small">{overallStatus}</div>
        </article>

        <article className="panel stat-card">
          <div className="stat-icon" style={{ background: "rgba(99,168,255,0.14)", color: "#63a8ff" }}>
            <TrendingUp size={18} />
          </div>
          <div className="stat-card-label">Predicted Crowd ({prediction?.horizonSeconds ?? 30}s)</div>
          <div className="stat-card-value">{prediction ? prediction.predictedCount : "—"}</div>
        </article>
      </section>

      {prediction && (
        <p style={{ fontSize: 11, color: "var(--muted-2)", margin: "-8px 0 4px" }}>
          Prediction is a simple trend extrapolation from the last ~16s of readings ({prediction.method}), not a
          calibrated forecasting model — treat it as an early indicator, not a guarantee.
        </p>
      )}

      <AnalyticsChart data={chartData} running={running && backendConnected} />
    </div>
  );
}

function AlertsView({ alerts }: { alerts: AlertItem[] }) {
  return <AlertsPanel alerts={alerts} />;
}

function CameraSourceControl({
  sources,
  currentSource,
  sourceLabel,
  switchSource,
  testCamera,
}: {
  sources: CameraSource[];
  currentSource: string | null;
  sourceLabel: string | null;
  switchSource: (sourceKey: string) => Promise<{ success: boolean; message: string }>;
  testCamera: (url?: string) => Promise<CameraTestResult>;
}) {
  const [selected, setSelected] = useState(currentSource ?? "");
  const [switching, setSwitching] = useState(false);
  const [switchMessage, setSwitchMessage] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<CameraTestResult | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs the picker to the backend's current source without fighting the user's own in-progress selection
    setSelected((prev) => (prev ? prev : currentSource ?? ""));
  }, [currentSource]);

  const phoneSource = sources.find((s) => s.id === "phone");

  const handleSwitch = async () => {
    if (!selected) return;
    setSwitching(true);
    setSwitchMessage(null);
    try {
      const result = await switchSource(selected);
      setSwitchMessage(result.message);
    } catch (error) {
      setSwitchMessage(error instanceof ApiError ? error.message : "Failed to switch source.");
    } finally {
      setSwitching(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testCamera();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        connected: false,
        message: error instanceof ApiError ? error.message : "Test request failed.",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <article className="panel settings-card">
      <h2 className="panel-heading">Camera Source</h2>
      <div className="settings-row">
        <span>Active Source</span>
        <strong>{sourceLabel ?? "—"}</strong>
      </div>
      <div className="settings-row">
        <span>Select Source</span>
        <div style={{ width: 180 }}>
          <Select
            value={selected}
            onChange={setSelected}
            placeholder="Choose…"
            options={sources.map((option) => ({ value: option.id, label: option.label }))}
          />
        </div>
      </div>
      {phoneSource && selected === "phone" && (
        <div className="settings-row">
          <span>Phone Camera URL</span>
          <strong>{phoneSource.name}</strong>
        </div>
      )}

      <div className="action-group" style={{ marginTop: 10 }}>
        <button
          type="button"
          className="action-button secondary"
          onClick={handleSwitch}
          disabled={switching || !selected}
        >
          <span>{switching ? "Switching…" : "Switch"}</span>
        </button>
        {selected === "phone" && (
          <button type="button" className="action-button secondary" onClick={handleTest} disabled={testing}>
            <span>{testing ? "Testing…" : "Test Connection"}</span>
          </button>
        )}
      </div>

      {switchMessage && (
        <p style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 8 }}>{switchMessage}</p>
      )}
      {testResult && (
        <p
          style={{
            fontSize: 11,
            marginTop: 8,
            color: testResult.connected ? "#4ade80" : "#f87171",
          }}
        >
          {testResult.connected ? "Connected" : "Unable to connect"} — {testResult.message}
        </p>
      )}
    </article>
  );
}

function SettingsView(props: {
  backendConnected: boolean;
  cameraConnected: boolean;
  running: boolean;
  totalCount: number;
  density: number;
  overallStatus: string;
  operatorLabel: string;
  locationLabel: string;
  sources: CameraSource[];
  currentSource: string | null;
  sourceLabel: string | null;
  switchSource: (sourceKey: string) => Promise<{ success: boolean; message: string }>;
  testCamera: (url?: string) => Promise<CameraTestResult>;
}) {
  const {
    backendConnected,
    cameraConnected,
    running,
    totalCount,
    density,
    overallStatus,
    operatorLabel,
    locationLabel,
    sources,
    currentSource,
    sourceLabel,
    switchSource,
    testCamera,
  } = props;

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
          <span>Camera</span>
          <strong className={cameraConnected ? "stat-green" : "stat-red"}>
            {cameraConnected ? "Connected" : "Offline"}
          </strong>
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
          <span>Crowd Density Index</span>
          <strong>{density.toFixed(2)}</strong>
        </div>
        <div className="settings-row">
          <span>Alert Mode</span>
          <strong>{overallStatus === "HIGH" ? "Escalated" : "Monitoring"}</strong>
        </div>
      </article>

      <CameraSourceControl
        sources={sources}
        currentSource={currentSource}
        sourceLabel={sourceLabel}
        switchSource={switchSource}
        testCamera={testCamera}
      />
    </section>
  );
}

export default function Dashboard(){
  const navigate = useNavigate();
  const { currentUser, hasPermission, signOut } = useSession();
  const {
    running,
    backendConnected,
    cameraConnected,
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
    heatmapUrl,
    chartData,
    monitoringPending,
    startMonitoring,
    stopMonitoring,
    switchSource,
    testCamera,
  } = useMonitoring();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState("Locating...");
  const [operatorLabel] = useState("Security Command");
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reporting an unsupported browser API, not deriving state from props/state
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

  // Selection follows the live zone list; cleared when monitoring stops,
  // otherwise keeps the current pick valid as the polled list changes underneath it.
  // Keeps selection valid as the polled zone list changes underneath it; cleared when monitoring stops.
  useEffect(() => {
    if (!running) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedZoneId(null);
      return;
    }
    setSelectedZoneId((prev) => {
      if (!prev) return zones[0]?.id ?? null;
      return zones.some((zone) => zone.id === prev) ? prev : zones[0]?.id ?? null;
    });
  }, [running, zones]);

  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === selectedZoneId) ?? null,
    [zones, selectedZoneId]
  );

  const monitoringLabel = running ? "Stop Monitoring" : "Start Monitoring";

  const handleToggleMonitoring = async () => {
    try {
      if (running) {
        await stopMonitoring();
      } else {
        await startMonitoring();
      }
    } catch (error) {
      console.error("Could not toggle monitoring:", error instanceof ApiError ? error.message : error);
    }
  };
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

    await writeXlsxFile(rows, {
      fileName: "crowd-intelligence-data.xlsx",
    });
  };

  const renderTab = () => {
    if (activeTab === "camera") {
      return (
        <CameraView
          running={running}
          backendConnected={backendConnected}
          cameraConnected={cameraConnected}
          sourceLabel={sourceLabel}
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
          prediction={prediction}
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
          cameraConnected={cameraConnected}
          running={running}
          totalCount={totalCount}
          density={density}
          overallStatus={overallStatus}
          operatorLabel={operatorLabel}
          locationLabel={locationLabel}
          sources={sources}
          currentSource={source}
          sourceLabel={sourceLabel}
          switchSource={switchSource}
          testCamera={testCamera}
        />
      );
    }

    return (
      <OverviewView
        running={running}
        backendConnected={backendConnected}
        cameraConnected={cameraConnected}
        sourceLabel={sourceLabel}
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
            <span className={`live-dot ${running && backendConnected && cameraConnected ? "on" : ""}`} />
            <span>{running && backendConnected && cameraConnected ? "LIVE" : "OFFLINE"}</span>
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
                <span className="avatar-name">{currentUser?.name ?? "Security Command"}</span>
                <span className="avatar-role" style={{ textTransform: "capitalize" }}>
                  {currentUser?.roleKey.replace("_", " ") ?? "Authority Access"}
                </span>
              </div>
              <ChevronDown size={15} className={`profile-caret ${profileOpen ? "open" : ""}`} />
            </button>

            {profileOpen && (
              <div className="profile-menu">
                <div className="profile-menu-head">
                  <div className="profile-menu-title">Authorized Control</div>
                  <div className="profile-menu-sub">Admin / Security / Authorities</div>
                </div>

                <button
                  type="button"
                  className="profile-menu-item"
                  onClick={() => navigate("/security-team")}
                >
                  <Users size={16} />
                  <span>Security Team</span>
                </button>


                <button
                  type="button"
                  className="profile-menu-item"
                  onClick={() => navigate("/incident-log")}
                >
                  <ClipboardList size={16} />
                  <span>Incident Log</span>
                </button>


                <button
                  type="button"
                  className="profile-menu-item"
                  onClick={() => navigate("/dispatch-control")}
                >
                  <Radio size={16} />
                  <span>Dispatch Control</span>
                </button>


                <button
                  type="button"
                  className="profile-menu-item"
                  title={!hasPermission("manage_authorities") ? "Your role can view this read-only" : undefined}
                  onClick={() => navigate("/authority-permissions")}
                >
                  <Lock size={16} />
                  <span>Authority Permissions</span>
                  {!hasPermission("manage_authorities") && (
                    <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--muted-2)" }}>view only</span>
                  )}
                </button>

                <button
                  type="button"
                  className="profile-menu-item danger"
                  onClick={() => {
                    signOut();
                    navigate("/sign-in", { replace: true });
                  }}
                >
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
                onClick={handleToggleMonitoring}
                disabled={monitoringPending}
              >
                {running ? <Square size={17} strokeWidth={2} /> : <Play size={17} strokeWidth={2} />}
                <span>{monitoringPending ? "Please wait…" : monitoringLabel}</span>
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