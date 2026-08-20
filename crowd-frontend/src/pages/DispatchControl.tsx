import { useEffect, useMemo, useState } from "react";
import { Radio, Send } from "lucide-react";

import { createDispatch, listDispatch } from "../api/dispatch";
import { listIncidents } from "../api/incidents";
import { listPersonnel } from "../api/personnel";
import { listZoneCoverage } from "../api/zones";
import { useApiResource } from "../hooks/useApiResource";
import { useSession } from "../state/SessionContext";
import { useToast } from "../components/ui/ToastContext";
import { ApiError } from "../api/client";
import { PageHeader } from "../components/ui/PageHeader";
import { Select } from "../components/ui/Select";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingState, ErrorState } from "../components/ui/ResourceState";
import { Badge } from "../components/ui/Badge";
import type { DispatchTargetType } from "../types/dispatch";
import type { Incident } from "../types/incident";
import type { Personnel } from "../types/personnel";

export default function DispatchControl() {
  const { hasPermission, currentUser } = useSession();
  const toast = useToast();
  const canDispatch = hasPermission("dispatch");

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [zones, setZones] = useState<string[]>([]);

  const [incidentId, setIncidentId] = useState("");
  const [targetType, setTargetType] = useState<DispatchTargetType>("all");
  const [targetPersonnelId, setTargetPersonnelId] = useState("");
  const [targetZone, setTargetZone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const historyResource = useApiResource(() => listDispatch(), [], { pollMs: 4000 });

  useEffect(() => {
    listIncidents({ status: "active" }).then(setIncidents).catch(() => {});
    listPersonnel({ status: "on-duty" }).then(setPersonnel).catch(() => {});
    listZoneCoverage().then((z) => setZones(z.map((zone) => zone.zone))).catch(() => {});
  }, []);

  const selectedIncident = useMemo(() => incidents.find((i) => i.id === incidentId) ?? null, [incidents, incidentId]);

  const canSubmit =
    message.trim().length > 0 &&
    (targetType === "all" || (targetType === "officer" && targetPersonnelId) || (targetType === "zone" && targetZone));

  const handleDispatch = async () => {
    setSending(true);
    try {
      await createDispatch({
        incidentId: incidentId || undefined,
        targetType,
        targetPersonnelId: targetType === "officer" ? targetPersonnelId : undefined,
        targetZone: targetType === "zone" ? targetZone : undefined,
        message: message.trim(),
      });
      toast.show("Dispatch sent", "success");
      setMessage("");
      historyResource.reload();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Could not send dispatch", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="ui-page">
      <PageHeader title="Dispatch Control" subtitle="Send instructions to units and track dispatch history" backTo="/" />

      {!canDispatch && (
        <div
          style={{
            marginBottom: 16, fontSize: 13, color: "var(--moderate)", background: "rgba(243,207,56,0.08)",
            border: "1px solid rgba(243,207,56,0.25)", borderRadius: "var(--radius-sm)", padding: "10px 14px",
          }}
        >
          Your role ({currentUser?.roleKey}) doesn't have dispatch permission — you can view history below but not send.
        </div>
      )}

      <div className="split-layout-content-side">
        <div className="ui-card">
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>Dispatch History</div>
          {historyResource.status === "loading" && <LoadingState label="Loading dispatch history…" />}
          {historyResource.status === "error" && (
            <ErrorState message={historyResource.error ?? "Unknown error"} onRetry={historyResource.reload} />
          )}
          {historyResource.status === "empty" && (
            <EmptyState
              icon={<Radio size={22} />}
              title="No dispatch records yet"
              description="Sent instructions will appear here as soon as you dispatch a unit."
            />
          )}
          {historyResource.status === "ready" && historyResource.data && (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>From</th>
                    <th>Target</th>
                    <th>Incident</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {historyResource.data.map((d) => (
                    <tr key={d.id}>
                      <td className="mono" style={{ fontSize: 11 }}>{new Date(d.createdAt).toLocaleTimeString()}</td>
                      <td>{d.createdBy}</td>
                      <td>
                        <Badge tone={d.targetType === "all" ? "info" : "neutral"}>{d.target}</Badge>
                      </td>
                      <td className="mono" style={{ fontSize: 11 }}>{d.incidentId ?? "—"}</td>
                      <td style={{ maxWidth: 320 }}>{d.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="ui-card" style={{ position: "sticky", top: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>Send Dispatch</div>

          <div className="form-field">
            <label className="form-label">Related Incident (optional)</label>
            <Select
              value={incidentId}
              onChange={setIncidentId}
              options={[
                { value: "", label: "No specific incident" },
                ...incidents.map((i) => ({ value: i.id, label: `${i.id} — ${i.alertType} (Zone ${i.zone})` })),
              ]}
            />
          </div>

          {selectedIncident && (
            <div style={{ background: "var(--chip-bg)", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 12, color: "var(--muted)" }}>
              <Badge tone={selectedIncident.severity === "critical" || selectedIncident.severity === "high" ? "high" : "medium"}>
                {selectedIncident.severity}
              </Badge>{" "}
              {selectedIncident.description}
            </div>
          )}

          <div className="form-field">
            <label className="form-label">Target</label>
            <Select
              value={targetType}
              onChange={(value) => setTargetType(value as DispatchTargetType)}
              options={[
                { value: "all", label: "All Units (broadcast)" },
                { value: "officer", label: "Specific Officer" },
                { value: "zone", label: "Zone" },
              ]}
            />
          </div>

          {targetType === "officer" && (
            <div className="form-field">
              <label className="form-label">Officer</label>
              <Select
                value={targetPersonnelId}
                onChange={setTargetPersonnelId}
                placeholder="Select an officer…"
                options={personnel.map((p) => ({ value: p.id, label: `${p.id} — ${p.name}` }))}
              />
              {personnel.length === 0 && <div className="form-error">No on-duty personnel available to select.</div>}
            </div>
          )}

          {targetType === "zone" && (
            <div className="form-field">
              <label className="form-label">Zone</label>
              <Select
                value={targetZone}
                onChange={setTargetZone}
                placeholder="Select a zone…"
                options={zones.map((z) => ({ value: z, label: z }))}
              />
            </div>
          )}

          <div className="form-field">
            <label className="form-label">Instructions</label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Type dispatch instructions…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {["Evacuate zone", "Lock down", "Standby alert"].map((preset) => (
              <button
                key={preset}
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1 }}
                onClick={() => setMessage(`${preset} — immediate action required.`)}
              >
                {preset}
              </button>
            ))}
          </div>

          <button type="button" className="btn btn-primary" style={{ width: "100%" }} disabled={!canSubmit || sending || !canDispatch} onClick={handleDispatch}>
            <Send size={14} /> {sending ? "Sending…" : "Dispatch"}
          </button>
        </div>
      </div>
    </div>
  );
}
