import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Users, UserPlus, FileSpreadsheet, Radio, ShieldAlert } from "lucide-react";

import { deactivatePersonnel, listPersonnel } from "../api/personnel";
import { listZoneCoverage } from "../api/zones";
import { listDispatch } from "../api/dispatch";
import { useApiResource } from "../hooks/useApiResource";
import { useSession } from "../state/SessionContext";
import { useToast } from "../components/ui/ToastContext";
import { PageHeader } from "../components/ui/PageHeader";
import { Tabs } from "../components/ui/Tabs";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingState, ErrorState } from "../components/ui/ResourceState";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { PersonnelFormModal } from "../components/personnel/PersonnelFormModal";
import { ImportPersonnelModal } from "../components/personnel/ImportPersonnelModal";
import { PERSONNEL_STATUS_COLOR, ZONE_DENSITY_COLOR } from "../design/severity";
import type { Personnel, PersonnelStatus } from "../types/personnel";

type Tab = "personnel" | "zones" | "dispatch";

const STATUS_FILTERS: Array<PersonnelStatus | "all"> = ["all", "on-duty", "responding", "break", "off-duty", "inactive"];

export default function SecurityTeam() {
  const { hasPermission } = useSession();
  const toast = useToast();
  const canManage = hasPermission("manage_security_team");
  const canImport = hasPermission("import_personnel");

  const [activeTab, setActiveTab] = useState<Tab>("personnel");
  const [filterStatus, setFilterStatus] = useState<PersonnelStatus | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Personnel | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Personnel | null>(null);

  const personnelResource = useApiResource(() => listPersonnel(), [], { pollMs: 5000 });
  const zonesResource = useApiResource(() => listZoneCoverage(), [], { pollMs: 5000, isEmpty: () => false });
  const dispatchResource = useApiResource(() => listDispatch(), [], { pollMs: 5000 });

  const personnel = personnelResource.data ?? [];
  const filtered = useMemo(
    () => (filterStatus === "all" ? personnel : personnel.filter((p) => p.status === filterStatus)),
    [personnel, filterStatus]
  );
  const onDuty = personnel.filter((p) => p.status === "on-duty" || p.status === "responding").length;

  const reload = () => personnelResource.reload();

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await deactivatePersonnel(deactivateTarget.id);
      toast.show(`${deactivateTarget.name} marked inactive`, "success");
      reload();
    } catch {
      toast.show("Could not deactivate this record", "error");
    } finally {
      setDeactivateTarget(null);
    }
  };

  const tabs = [
    { key: "personnel" as Tab, label: "Personnel", count: personnel.length },
    { key: "zones" as Tab, label: "Zone Coverage" },
    { key: "dispatch" as Tab, label: "Dispatch History" },
  ];

  return (
    <div className="ui-page">
      <PageHeader
        title="Security Team"
        subtitle="Personnel roster, zone coverage, and dispatch history"
        backTo="/"
        actions={
          activeTab === "personnel" ? (
            <>
              {canImport && (
                <button type="button" className="btn btn-secondary" onClick={() => setImportOpen(true)}>
                  <FileSpreadsheet size={15} /> Import Excel
                </button>
              )}
              {canManage && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  <UserPlus size={15} /> Add Personnel
                </button>
              )}
            </>
          ) : undefined
        }
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          <strong style={{ color: "var(--safe)" }}>{onDuty}</strong> on duty of {personnel.length}
        </div>
      </div>

      {activeTab === "personnel" && (
        <div className="ui-card">
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                className={`btn btn-sm ${filterStatus === s ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setFilterStatus(s)}
                style={{ textTransform: "capitalize" }}
              >
                {s === "all" ? "All Personnel" : s.replace("-", " ")}
              </button>
            ))}
          </div>

          {personnelResource.status === "loading" && <LoadingState label="Loading personnel…" />}
          {personnelResource.status === "error" && (
            <ErrorState message={personnelResource.error ?? "Unknown error"} onRetry={reload} />
          )}
          {personnelResource.status === "empty" && (
            <EmptyState
              icon={<Users size={22} />}
              title="No security personnel have been added yet"
              description="Add officers one at a time, or import a roster from an Excel spreadsheet."
              actions={
                <>
                  {canManage && (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setFormOpen(true)}>
                      <UserPlus size={14} /> Add Personnel
                    </button>
                  )}
                  {canImport && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setImportOpen(true)}>
                      <FileSpreadsheet size={14} /> Import Excel
                    </button>
                  )}
                </>
              }
            />
          )}
          {personnelResource.status === "ready" && (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Officer</th>
                    <th>Rank</th>
                    <th>Zone</th>
                    <th>Shift</th>
                    <th>Status</th>
                    <th>Contact</th>
                    <th>Last Activity</th>
                    {canManage && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{p.id}</div>
                      </td>
                      <td>{p.rank || "—"}</td>
                      <td>{p.zone || "—"}</td>
                      <td>{p.shift || "—"}</td>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, color: PERSONNEL_STATUS_COLOR(p.status), textTransform: "capitalize", fontSize: 12, fontWeight: 500 }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: PERSONNEL_STATUS_COLOR(p.status) }} />
                          {p.status.replace("-", " ")}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--muted)" }}>{p.phone || p.email || "—"}</td>
                      <td style={{ fontSize: 12, color: "var(--muted)" }}>
                        {p.lastActivityAt ? new Date(p.lastActivityAt).toLocaleString() : "—"}
                      </td>
                      {canManage && (
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => {
                                setEditing(p);
                                setFormOpen(true);
                              }}
                            >
                              Edit
                            </button>
                            {p.status !== "inactive" && (
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDeactivateTarget(p)}>
                                Deactivate
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "zones" && (
        <>
          {zonesResource.status === "loading" && <LoadingState label="Loading zone coverage…" />}
          {zonesResource.status === "error" && <ErrorState message={zonesResource.error ?? "Unknown error"} onRetry={zonesResource.reload} />}
          {zonesResource.status === "ready" && zonesResource.data && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {zonesResource.data.map((z) => {
                const officers = personnel.filter((p) => p.zone === z.zone && p.status !== "off-duty" && p.status !== "inactive");
                return (
                  <div key={z.zone} className="ui-card ui-card-tight">
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ fontWeight: 700, color: "var(--text)" }}>{z.zone}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>Capacity {z.capacity}</div>
                    </div>
                    <div style={{ height: 6, background: "var(--panel-3)", borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
                      <div style={{ height: "100%", width: `${z.density}%`, background: ZONE_DENSITY_COLOR(z.density) }} />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12 }}>
                      {z.current} present · {z.density}% of capacity
                    </div>
                    <div style={{ fontSize: 10, color: "var(--muted-2)", letterSpacing: "0.06em", marginBottom: 6 }}>
                      ASSIGNED OFFICERS ({officers.length})
                    </div>
                    {officers.length === 0 ? (
                      <div style={{ fontSize: 12, color: "var(--high)" }}>No officer assigned</div>
                    ) : (
                      officers.map((o) => (
                        <div key={o.id} style={{ fontSize: 12, color: "var(--text)", padding: "3px 0" }}>
                          {o.name} <span style={{ color: "var(--muted)" }}>· {o.rank || "Officer"}</span>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === "dispatch" && (
        <div className="ui-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>Read-only history — compose new dispatches from Dispatch Control.</div>
            <Link to="/dispatch-control" className="btn btn-primary btn-sm">
              <Radio size={14} /> Open Dispatch Control
            </Link>
          </div>

          {dispatchResource.status === "loading" && <LoadingState label="Loading dispatch history…" />}
          {dispatchResource.status === "error" && (
            <ErrorState message={dispatchResource.error ?? "Unknown error"} onRetry={dispatchResource.reload} />
          )}
          {dispatchResource.status === "empty" && (
            <EmptyState
              icon={<ShieldAlert size={22} />}
              title="No dispatch records yet"
              description="Messages sent from Dispatch Control will show up here."
              actions={
                <Link to="/dispatch-control" className="btn btn-primary btn-sm">
                  Open Dispatch Control
                </Link>
              }
            />
          )}
          {dispatchResource.status === "ready" && dispatchResource.data && (
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
                  {dispatchResource.data.map((d) => (
                    <tr key={d.id}>
                      <td className="mono" style={{ fontSize: 11 }}>{new Date(d.createdAt).toLocaleTimeString()}</td>
                      <td>{d.createdBy}</td>
                      <td style={{ textTransform: "capitalize" }}>{d.target}</td>
                      <td className="mono" style={{ fontSize: 11 }}>{d.incidentId ?? "—"}</td>
                      <td>{d.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <PersonnelFormModal
        open={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          toast.show(editing ? "Personnel updated" : "Personnel added", "success");
          reload();
        }}
      />

      <ImportPersonnelModal open={importOpen} onClose={() => setImportOpen(false)} onImported={reload} />

      <ConfirmDialog
        open={!!deactivateTarget}
        title="Deactivate personnel"
        message={`Mark ${deactivateTarget?.name ?? ""} as inactive? They'll stay in the roster but drop out of on-duty counts and zone coverage.`}
        confirmLabel="Deactivate"
        danger
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
