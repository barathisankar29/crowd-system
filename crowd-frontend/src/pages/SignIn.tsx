import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { useSession } from "../state/SessionContext";
import type { RoleKey } from "../state/session";

export default function SignIn() {
  const { roles, loadingRoles, signIn } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState("");
  const [roleKey, setRoleKey] = useState<RoleKey | "">("");

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !roleKey) return;
    signIn({ name: name.trim(), roleKey: roleKey as RoleKey });
    navigate(from, { replace: true });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b0f1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
      <form
        onSubmit={handleSubmit}
        style={{ width: 380, background: "#0f1420", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "32px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #22d3a5, #0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={20} color="#0b1120" strokeWidth={2.4} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>Crowd Intelligence System</div>
            <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.04em" }}>SIGN IN TO CONTINUE</div>
          </div>
        </div>

        <label style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
          YOUR NAME
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Arjun Mehta"
          autoFocus
          style={{
            width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 12px",
            color: "#e2e8f0", fontSize: 14, outline: "none", marginBottom: 18,
          }}
        />

        <label style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.06em", display: "block", marginBottom: 10 }}>
          SIGN IN AS
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
          {loadingRoles ? (
            <div style={{ fontSize: 13, color: "#475569" }}>Loading roles…</div>
          ) : roles.length === 0 ? (
            <div style={{ fontSize: 13, color: "#f87171" }}>
              Couldn't reach the backend to load roles. Start the backend and reload.
            </div>
          ) : (
            roles.map((role) => (
              <label
                key={role.key}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8,
                  border: `1px solid ${roleKey === role.key ? "rgba(34,211,165,0.4)" : "rgba(255,255,255,0.07)"}`,
                  background: roleKey === role.key ? "rgba(34,211,165,0.08)" : "transparent",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="role"
                  value={role.key}
                  checked={roleKey === role.key}
                  onChange={() => setRoleKey(role.key as RoleKey)}
                />
                <span style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 500 }}>{role.label}</span>
              </label>
            ))
          )}
        </div>

        <button
          type="submit"
          disabled={!name.trim() || !roleKey}
          style={{
            width: "100%", padding: "11px 0", borderRadius: 8, border: "none",
            background: name.trim() && roleKey ? "linear-gradient(135deg, #22d3a5, #0ea5e9)" : "rgba(255,255,255,0.06)",
            color: name.trim() && roleKey ? "#0b1120" : "#334155",
            fontSize: 13, fontWeight: 700, letterSpacing: "0.03em",
            cursor: name.trim() && roleKey ? "pointer" : "not-allowed",
          }}
        >
          Continue
        </button>

        <p style={{ fontSize: 11, color: "#475569", marginTop: 14, lineHeight: 1.5 }}>
          This identifies you to the system for permissions and dispatch attribution.
          It is not a secure login — password-based authentication is a planned follow-up.
        </p>
      </form>
    </div>
  );
}
