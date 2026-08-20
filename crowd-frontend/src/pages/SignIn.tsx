import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Shield, Activity, Radio, ShieldCheck, Check, WifiOff, RotateCw } from "lucide-react";
import { useSession } from "../state/SessionContext";
import type { RoleKey } from "../state/session";

const FEATURES = [
  { icon: Activity, label: "Real-time crowd density and zone-by-zone monitoring" },
  { icon: Radio, label: "Dispatch and coordinate response units from live incidents" },
  { icon: ShieldCheck, label: "Role-based access across every operations screen" },
];

export default function SignIn() {
  const { roles, loadingRoles, rolesUnavailable, retryRoles, signIn } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState("");
  const [roleKey, setRoleKey] = useState<RoleKey | "">("");
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !roleKey) return;
    setSubmitting(true);
    signIn({ name: name.trim(), roleKey: roleKey as RoleKey });
    navigate(from, { replace: true });
  };

  return (
    <div className="signin-shell">
      <div className="signin-backdrop" aria-hidden="true">
        <svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="signin-grid" width="42" height="42" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1.1" fill="rgba(160,200,255,0.16)" />
            </pattern>
            <radialGradient id="signin-glow-a" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(40,215,255,0.16)" />
              <stop offset="100%" stopColor="rgba(40,215,255,0)" />
            </radialGradient>
            <radialGradient id="signin-glow-b" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(26,227,154,0.13)" />
              <stop offset="100%" stopColor="rgba(26,227,154,0)" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#signin-grid)" />
          <ellipse cx="18%" cy="28%" rx="420" ry="340" fill="url(#signin-glow-a)" />
          <ellipse cx="82%" cy="72%" rx="460" ry="360" fill="url(#signin-glow-b)" />
        </svg>
        <div className="signin-scanlines" />
        <div className="signin-vignette" />
      </div>

      <div className="signin-content">
        <section className="signin-brand-panel">
          <div className="signin-brand-mark">
            <Shield size={22} strokeWidth={2.2} />
          </div>
          <h1 className="signin-brand-title">Crowd Intelligence System</h1>
          <p className="signin-brand-desc">
            AI-assisted crowd monitoring for security operations — live density detection, zone-based
            alerting, and coordinated dispatch in one operations console.
          </p>
          <ul className="signin-features">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label}>
                <span className="signin-feature-icon">
                  <Icon size={15} />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </section>

        <section className="signin-card">
          <div className="signin-card-head">
            <div className="signin-card-title">Sign in to continue</div>
            <p className="signin-card-sub">
              Identify yourself for permissions and dispatch attribution. Password-based authentication
              is a planned follow-up — this is not a secure login.
            </p>
            <div className="signin-status">
              <span className={`signin-status-dot ${loadingRoles ? "" : rolesUnavailable ? "offline" : "online"}`} />
              {loadingRoles ? "Connecting…" : rolesUnavailable ? "Backend unavailable" : "System connected"}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-field">
              <label className="form-label" htmlFor="signin-name">
                Your Name
              </label>
              <input
                id="signin-name"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Arjun Mehta"
                autoFocus
                autoComplete="name"
              />
            </div>

            <div className="form-field">
              <span className="form-label">Sign in as</span>

              {loadingRoles ? (
                <div className="signin-role-skeleton" aria-hidden="true">
                  <div className="signin-skeleton-row" />
                  <div className="signin-skeleton-row" />
                  <div className="signin-skeleton-row" />
                </div>
              ) : rolesUnavailable ? (
                <div className="signin-backend-unavailable">
                  <div className="signin-backend-unavailable-title">
                    <WifiOff size={15} />
                    Backend unavailable
                  </div>
                  <p>Check that the Crowd System backend is running.</p>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={retryRoles}>
                    <RotateCw size={13} /> Retry
                  </button>
                </div>
              ) : (
                <div className="signin-role-list" role="radiogroup" aria-label="Sign in as">
                  {roles.map((role) => (
                    <label
                      key={role.key}
                      className={`signin-role-option ${roleKey === role.key ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role.key}
                        checked={roleKey === role.key}
                        onChange={() => setRoleKey(role.key as RoleKey)}
                      />
                      <span>{role.label}</span>
                      {roleKey === role.key && <Check size={15} />}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary signin-submit"
              disabled={!name.trim() || !roleKey || loadingRoles || rolesUnavailable || submitting}
            >
              {submitting ? "Signing in…" : "Continue"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
