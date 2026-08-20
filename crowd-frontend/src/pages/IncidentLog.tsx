import { useEffect, useMemo, useState } from "react";
import { Download, FileWarning, Search, Send } from "lucide-react";

import { addIncidentNote, assignIncident, getIncident, listIncidents, setIncidentStatus } from "../api/incidents";
import { listPersonnel } from "../api/personnel";
import { useApiResource } from "../hooks/useApiResource";
import { useSession } from "../state/SessionContext";
import { useToast } from "../components/ui/ToastContext";
import { PageHeader } from "../components/ui/PageHeader";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Select } from "../components/ui/Select";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingState, ErrorState } from "../components/ui/ResourceState";
import { Badge } from "../components/ui/Badge";
import { SEVERITY_STYLE, INCIDENT_STATUS_STYLE, NOTE_KIND_STYLE } from "../design/severity";
import type { Incident, IncidentSeverity } from "../types/incident";
import type { Personnel } from "../types/personnel";
import { ApiError } from "../api/client";

type Filter = { severity: string; status: string; zone: string; search: string };

const toneFor = (severity: IncidentSeverity) => (severity === "critical" || severity === "high" ? severity : severity === "medium" ? "medium" : "low");

function exportCsv(incidents: Incident[]) {
  const rows = [
    ["ID", "Created", "Severity", "Zone", "Status", "Crowd Count", "Density Index", "Alert Type", "Assigned To", "Description"],
    ...incidents.map((i) => [
      i.id, i.createdAt, i.severity, i.zone, i.status, String(i.crowdCount), String(i.density),
      i.alertType, i.assignedTo?.name ?? "", i.description,
    ]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "incident-log.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function IncidentLog() {
  const { hasPermission } = useSession();
  const toast = useToast();
  const canManage = hasPermission("manage_incidents");

  const [filter, setFilter] = useState<Filter>({ severity: "all", status: "all", zone: "all", search: "" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Incident | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [personnel, setPersonnel] = useState<Personnel[]>([]);

  const listResource = useApiResource(() => listIncidents(), [], { pollMs: 3000 });
  const incidents = useMemo(() => listResource.data ?? [], [listResource.data]);

  useEffect(() => {
    listPersonnel().then(setPersonnel).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing detail when selection is cleared, not deriving it
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    getIncident(selectedId)
      .then((result) => !cancelled && setDetail(result))
      .catch(() => !cancelled && setDetail(null))
      .finally(() => !cancelled && setDetailLoading(false));
    return () => {
      cancelled = true;
    };
  }, [selectedId, listResource.data]);

  // Keeps selection valid as the polled list changes underneath it.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!selectedId && incidents.length > 0) setSelectedId(incidents[0].id);
    if (selectedId && !incidents.some((i) => i.id === selectedId)) setSelectedId(incidents[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidents]);

  const zones = useMemo(() => ["all", ...Array.from(new Set(incidents.map((i) => i.zone).filter(Boolean)))], [incidents]);

  const filtered = incidents.filter((inc) => {
    if (filter.severity !== "all" && inc.severity !== filter.severity) return false;
    if (filter.status !== "all" && inc.status !== filter.status) return false;
    if (filter.zone !== "all" && inc.zone !== filter.zone) return false;
    if (filter.search) {
      const q = filter.search.toLowerCase();
      if (![inc.id, inc.alertType, inc.zone].some((v) => v.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const activeCount = incidents.filter((i) => i.status === "active").length;
  const monitoringCount = incidents.filter((i) => i.status === "monitoring").length;
  const todayStr = new Date().toDateString();
  const resolvedToday = incidents.filter((i) => i.resolvedAt && new Date(i.resolvedAt).toDateString() === todayStr).length;

  const runAction = async (fn: () => Promise<Incident>, successMessage: string) => {
    try {
      const updated = await fn();
      setDetail(updated);
      listResource.reload();
      toast.show(successMessage, "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Action failed", "error");
    }
  };

  const handleResolve = () => detail && runAction(() => setIncidentStatus(detail.id, "resolved"), "Incident resolved");
  const handleEscalate = () => detail && runAction(() => setIncidentStatus(detail.id, "active"), "Incident escalated");
  const handleAssign = (personnelId: string) =>
    detail && runAction(() => assignIncident(detail.id, personnelId || null), personnelId ? "Assigned" : "Unassigned");
  const handleAddNote = () => {
    if (!detail || !noteText.trim()) return;
    runAction(() => addIncidentNote(detail.id, noteText.trim()), "Note added").then(() => setNoteText(""));
  };

  return (
    <div className="ui-page">
      <PageHeader
        title="Incident Log"
        subtitle="Every crowd-safety incident, auto-detected or manually logged"
        backTo="/"
        actions={
          <button type="button" className="btn btn-secondary" onClick={() => exportCsv(filtered)} disabled={filtered.length === 0}>
            <Download size={15} /> Export CSV
          </button>
        }
      />

      <div style={{ display: "flex", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Active", value: activeCount, tone: "high" as const },
          { label: "Monitoring", value: monitoringCount, tone: "medium" as const },
          { label: "Resolved Today", value: resolvedToday, tone: "safe" as const },
          { label: "Total Logged", value: incidents.length, tone: "neutral" as const },
        ].map((kpi) => (
          <div key={kpi.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: kpi.tone === "neutral" ? "var(--text)" : `var(--${kpi.tone === "high" ? "high" : kpi.tone === "medium" ? "moderate" : "safe"})` }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {listResource.status === "loading" && <LoadingState label="Loading incidents…" />}
      {listResource.status === "error" && <ErrorState message={listResource.error ?? "Unknown error"} onRetry={listResource.reload} />}
      {listResource.status === "empty" && (
        <EmptyState
          icon={<FileWarning size={22} />}
          title="No incidents logged"
          description="Incidents open automatically when a zone crosses a crowd-density threshold, or can be reviewed here once detection is running."
        />
      )}

      {listResource.status === "ready" && (
        <div className="split-layout-list-detail">
          <div className="ui-card ui-card-tight">
            <div style={{ position: "relative", marginBottom: 10 }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-2)" }} />
              <input
                className="form-input"
                style={{ paddingLeft: 30 }}
                placeholder="Search by ID, type, zone…"
                value={filter.search}
                onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
              />
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <Select
                value={filter.severity}
                onChange={(value) => setFilter((f) => ({ ...f, severity: value }))}
                options={["all", "critical", "high", "medium", "low"].map((s) => ({
                  value: s,
                  label: s === "all" ? "All Severities" : s,
                }))}
              />
              <Select
                value={filter.status}
                onChange={(value) => setFilter((f) => ({ ...f, status: value }))}
                options={["all", "active", "monitoring", "resolved"].map((s) => ({
                  value: s,
                  label: s === "all" ? "All Statuses" : s,
                }))}
              />
            </div>
            {zones.length > 1 && (
              <div style={{ marginBottom: 12 }}>
                <Select
                  value={filter.zone}
                  onChange={(value) => setFilter((f) => ({ ...f, zone: value }))}
                  options={zones.map((z) => ({ value: z, label: z === "all" ? "All Zones" : `Zone ${z}` }))}
                />
              </div>
            )}
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>
              Showing <strong style={{ color: "var(--text)" }}>{filtered.length}</strong> of {incidents.length}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 560, overflowY: "auto" }}>
              {filtered.map((inc) => {
                const sev = SEVERITY_STYLE(inc.severity);
                const isSelected = selectedId === inc.id;
                return (
                  <button
                    key={inc.id}
                    type="button"
                    onClick={() => setSelectedId(inc.id)}
                    style={{
                      textAlign: "left",
                      borderTop: `1px solid ${isSelected ? sev.border : "var(--border)"}`,
                      borderRight: `1px solid ${isSelected ? sev.border : "var(--border)"}`,
                      borderBottom: `1px solid ${isSelected ? sev.border : "var(--border)"}`,
                      borderLeft: `3px solid ${sev.dot}`,
                      borderRadius: 10, padding: "10px 12px",
                      background: isSelected ? "rgba(26,227,154,0.06)" : "var(--panel-2)", cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{inc.id}</span>
                      <Badge tone={toneFor(inc.severity)}>{inc.severity}</Badge>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{inc.alertType}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                      Zone {inc.zone} · {new Date(inc.updatedAt).toLocaleTimeString()} · {inc.status}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            {!detail && !detailLoading && (
              <div className="ui-card">
                <EmptyState title="Select an incident" description="Choose an incident from the list to see its details and history." />
              </div>
            )}
            {detailLoading && <div className="ui-card"><LoadingState /></div>}

            {detail && !detailLoading && (
              <>
                <Breadcrumbs items={[{ label: "Security Command", to: "/" }, { label: "Incident Log" }, { label: detail.id }]} />
                <div className="ui-card" style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                        <Badge tone={toneFor(detail.severity)}>{detail.severity}</Badge>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, ...INCIDENT_STATUS_STYLE(detail.status) }}>
                          {INCIDENT_STATUS_STYLE(detail.status).label}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--muted-2)" }}>{detail.source === "auto" ? "AI-detected" : "Manual"}</span>
                      </div>
                      <div style={{ fontSize: 19, fontWeight: 700, color: "var(--text)" }}>{detail.alertType}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                        {new Date(detail.createdAt).toLocaleString()} · Zone {detail.zone}
                      </div>
                    </div>
                    {canManage && detail.status !== "resolved" && (
                      <div style={{ display: "flex", gap: 8 }}>
                        {detail.status === "monitoring" && (
                          <button type="button" className="btn btn-secondary btn-sm" onClick={handleEscalate}>Escalate</button>
                        )}
                        <button type="button" className="btn btn-primary btn-sm" onClick={handleResolve}>Mark Resolved</button>
                      </div>
                    )}
                  </div>

                  <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>{detail.description}</p>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 14 }}>
                    {[
                      { label: "Crowd Count", value: detail.crowdCount },
                      { label: "Density Index", value: detail.density.toFixed(2) },
                      { label: "Zone", value: detail.zone },
                      { label: "Resolved", value: detail.resolvedAt ? new Date(detail.resolvedAt).toLocaleTimeString() : "—" },
                    ].map((m) => (
                      <div key={m.label} style={{ background: "var(--chip-bg)", borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 10, color: "var(--muted-2)", letterSpacing: "0.06em" }}>{m.label.toUpperCase()}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{m.value}</div>
                      </div>
                    ))}
                  </div>

                  {canManage && (
                    <div style={{ marginTop: 14 }}>
                      <label className="form-label">Assigned To</label>
                      <Select
                        value={detail.assignedTo?.id ?? ""}
                        onChange={handleAssign}
                        options={[
                          { value: "", label: "Unassigned" },
                          ...personnel
                            .filter((p) => p.status !== "inactive")
                            .map((p) => ({ value: p.id, label: `${p.name} — ${p.id}` })),
                        ]}
                      />
                    </div>
                  )}
                </div>

                <div className="ui-card">
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 12 }}>
                    Timeline ({detail.notes?.length ?? 0})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: canManage ? 16 : 0 }}>
                    {(detail.notes ?? []).map((note) => {
                      const style = NOTE_KIND_STYLE(note.kind);
                      return (
                        <div key={note.id} style={{ display: "flex", gap: 10 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: style.bg, color: style.color, height: "fit-content", whiteSpace: "nowrap" }}>
                            {style.label}
                          </span>
                          <div>
                            <div style={{ fontSize: 12, color: "var(--muted)" }}>
                              {note.author} · {new Date(note.createdAt).toLocaleTimeString()}
                            </div>
                            <div style={{ fontSize: 13, color: "var(--text)" }}>{note.note}</div>
                          </div>
                        </div>
                      );
                    })}
                    {(detail.notes?.length ?? 0) === 0 && (
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>No activity recorded yet.</div>
                    )}
                  </div>

                  {canManage && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        className="form-input"
                        placeholder="Add a field note…"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                      />
                      <button type="button" className="btn btn-primary btn-sm" onClick={handleAddNote} disabled={!noteText.trim()}>
                        <Send size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
