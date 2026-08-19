// Single source of truth for severity/status/personnel-status color mapping.
// Previously duplicated between data/incidentData.ts and utils/securityHelpers.ts.

export interface ToneStyle {
  bg: string;
  border: string;
  text: string;
  dot: string;
  label: string;
}

export const SEVERITY_STYLE = (severity: string): ToneStyle => {
  switch (severity) {
    case "critical":
      return { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", text: "#f87171", dot: "#ef4444", label: "CRITICAL" };
    case "high":
      return { bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.28)", text: "#fb923c", dot: "#f97316", label: "HIGH" };
    case "medium":
      return { bg: "rgba(234,179,8,0.08)", border: "rgba(234,179,8,0.22)", text: "#fbbf24", dot: "#eab308", label: "MEDIUM" };
    default:
      return { bg: "rgba(34,211,165,0.07)", border: "rgba(34,211,165,0.18)", text: "#22d3a5", dot: "#22d3a5", label: "LOW" };
  }
};

export const INCIDENT_STATUS_STYLE = (status: string): { color: string; bg: string; label: string } => {
  switch (status) {
    case "active":
      return { color: "#f87171", bg: "rgba(239,68,68,0.1)", label: "ACTIVE" };
    case "monitoring":
      return { color: "#fbbf24", bg: "rgba(234,179,8,0.1)", label: "MONITORING" };
    default:
      return { color: "#22d3a5", bg: "rgba(34,211,165,0.08)", label: "RESOLVED" };
  }
};

export const NOTE_KIND_STYLE = (kind: string): { color: string; bg: string; label: string } => {
  switch (kind) {
    case "auto":
      return { color: "#818cf8", bg: "rgba(99,102,241,0.12)", label: "AUTO" };
    case "status":
      return { color: "#22d3a5", bg: "rgba(34,211,165,0.1)", label: "STATUS" };
    case "dispatch":
      return { color: "#38bdf8", bg: "rgba(56,189,248,0.12)", label: "DISPATCH" };
    default:
      return { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", label: "NOTE" };
  }
};

export const PERSONNEL_STATUS_COLOR = (status: string): string => {
  switch (status) {
    case "on-duty":
      return "#22d3a5";
    case "responding":
      return "#f59e0b";
    case "break":
      return "#94a3b8";
    case "inactive":
      return "#ef4444";
    default:
      return "#475569"; // off-duty
  }
};

export const ZONE_DENSITY_COLOR = (pct: number): string => {
  if (pct >= 85) return "#ef4444";
  if (pct >= 65) return "#eab308";
  return "#22d3a5";
};
