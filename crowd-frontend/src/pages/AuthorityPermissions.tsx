import { useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";

import { getPermissionMatrix, setRolePermission } from "../api/permissions";
import { useApiResource } from "../hooks/useApiResource";
import { useSession } from "../state/SessionContext";
import { useToast } from "../components/ui/ToastContext";
import { ApiError } from "../api/client";
import { PageHeader } from "../components/ui/PageHeader";
import { LoadingState, ErrorState } from "../components/ui/ResourceState";
import type { PermissionMatrix } from "../types/permissions";

export default function AuthorityPermissions() {
  const { currentUser, hasPermission } = useSession();
  const toast = useToast();
  const canEdit = hasPermission("manage_authorities");

  const resource = useApiResource<PermissionMatrix>(() => getPermissionMatrix(), [], { isEmpty: () => false });
  const [pending, setPending] = useState<string | null>(null);

  const toggle = async (roleKey: string, permissionKey: string, enabled: boolean) => {
    if (!canEdit) return;
    const cellKey = `${roleKey}:${permissionKey}`;
    setPending(cellKey);
    try {
      await setRolePermission(roleKey, permissionKey, enabled);
      resource.reload();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Could not update this permission", "error");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="ui-page">
      <PageHeader
        title="Authority Permissions"
        subtitle="Role-based access across the Crowd Intelligence System"
        backTo="/"
      />

      <div
        style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 20, fontSize: 13, color: "var(--muted)",
          background: "var(--chip-bg)", borderRadius: "var(--radius-sm)", padding: "10px 14px", width: "fit-content",
        }}
      >
        <ShieldCheck size={16} color="var(--safe)" />
        Signed in as <strong style={{ color: "var(--text)" }}>{currentUser?.name}</strong>
        <span style={{ color: "var(--muted-2)" }}>·</span>
        <span style={{ textTransform: "capitalize" }}>{currentUser?.roleKey.replace("_", " ")}</span>
        {!canEdit && (
          <>
            <span style={{ color: "var(--muted-2)" }}>·</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Lock size={12} /> read-only
            </span>
          </>
        )}
      </div>

      {resource.status === "loading" && <LoadingState label="Loading permission matrix…" />}
      {resource.status === "error" && <ErrorState message={resource.error ?? "Unknown error"} onRetry={resource.reload} />}

      {resource.status === "ready" && resource.data && (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Permission</th>
                {resource.data.roles.map((role) => (
                  <th key={role.key} style={{ textAlign: "center" }}>{role.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resource.data.permissions.map((permission) => (
                <tr key={permission.key}>
                  <td style={{ fontWeight: 500 }}>{permission.label}</td>
                  {resource.data!.roles.map((role) => {
                    const enabled = resource.data!.matrix[role.key]?.includes(permission.key) ?? false;
                    const cellKey = `${role.key}:${permission.key}`;
                    return (
                      <td key={role.key} style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={enabled}
                          disabled={!canEdit || pending === cellKey}
                          onChange={(e) => toggle(role.key, permission.key, e.target.checked)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: 12, color: "var(--muted-2)", marginTop: 16, maxWidth: 640, lineHeight: 1.6 }}>
        Access is granted per role based on the sign-in picked on the sign-in screen — this is a lightweight,
        password-free identity, not a secure login. Every mutating request the app makes carries the current
        role and is checked against this matrix on the backend, so this table has a real effect, not just a
        visual one. Only the Admin role can edit it.
      </p>
    </div>
  );
}
