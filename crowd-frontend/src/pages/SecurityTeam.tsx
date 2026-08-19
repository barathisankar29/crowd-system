import { useState, useEffect } from 'react'
import type { Tab } from "../types/security";

import {
  TEAM_MEMBERS,
  ACTIVE_ALERTS,
  DISPATCH_LOG,
  ZONE_STATUS,
} from "../data/securityData";

import {
  statusColor,
  severityConfig,
  densityBar,
} from "../utils/securityHelpers";


export default function SecurityTeam() {
  const [activeTab, setActiveTab] = useState<Tab>('personnel')
  const [selectedMember, setSelectedMember] = useState<number | null>(null)
  const [dispatchMsg, setDispatchMsg] = useState('')
  const [dispatchTarget, setDispatchTarget] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('all')
  const [clock, setClock] = useState(new Date())
  const [teamMembers, setTeamMembers] = useState(TEAM_MEMBERS)
  const [activeAlerts, setActiveAlerts] = useState(ACTIVE_ALERTS)
  const [zoneStatus, setZoneStatus] = useState(ZONE_STATUS)
  const [dispatchLog, setDispatchLog] = useState(DISPATCH_LOG);



  const fetchSecurityData = async () => {
  try {

    const [
      teamRes,
      alertsRes,
      zonesRes,
      dispatchRes,
    ] = await Promise.all([
      fetch("http://localhost:5000/security/team"),
      fetch("http://localhost:5000/security/alerts"),
      fetch("http://localhost:5000/security/zones"),
      fetch("http://localhost:5000/security/dispatch"),
    ]);

    setTeamMembers(await teamRes.json());
    setActiveAlerts(await alertsRes.json());
    setZoneStatus(await zonesRes.json());
    setDispatchLog(await dispatchRes.json());

  } catch (err) {
    console.error("Failed to refresh security data", err);
  }
  };


  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {

    fetchSecurityData();

    const timer = setInterval(() => {
        fetchSecurityData();
    }, 1000);

    return () => clearInterval(timer);

  }, []);

  const filtered = filterStatus === 'all' ? teamMembers : teamMembers.filter(m => m.status === filterStatus)
  const onDuty = teamMembers.filter(m => m.status === 'on-duty' || m.status === 'responding').length
  const critical = activeAlerts.filter(a => a.severity === 'critical').length

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'personnel', label: 'Personnel', count: teamMembers.length },
    { key: 'alerts', label: 'Active Alerts', count: activeAlerts.length },
    { key: 'dispatch', label: 'Dispatch Log' },
    { key: 'zones', label: 'Zone Coverage' },
  ]

  return (
    <div style={{ background: '#0b0f1a', minHeight: '100vh', fontFamily: "'Inter', sans-serif", color: '#e2e8f0' }}>
      {/* Header */}
      <div style={{ background: '#0f1420', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 28px', display: 'flex', alignItems: 'center', gap: 16, height: 64 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #22d3a5, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em' }}>Security Team</div>
            <div style={{ fontSize: 11, color: '#64748b', letterSpacing: '0.04em' }}>CROWD INTELLIGENCE SYSTEM</div>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          {[
            { label: 'On Duty', val: onDuty, color: '#22d3a5' },
            { label: 'Active Alerts', val: activeAlerts.length, color: critical > 0 ? '#ef4444' : '#f59e0b' },
            { label: 'Critical', val: critical, color: '#ef4444' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: '#475569', marginTop: 2, letterSpacing: '0.05em' }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Clock */}
        <div style={{ marginLeft: 8, textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
            {clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </div>
          <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.04em' }}>
            {clock.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
          </div>
        </div>

        {/* Alert pulse */}
        {critical > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '6px 14px' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.25)', animation: 'pulse 1.4s ease-in-out infinite', display: 'block' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#f87171', letterSpacing: '0.04em' }}>CRITICAL ALERT ACTIVE</span>
          </div>
        )}
      </div>

      <div style={{ padding: '24px 28px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: '#0f1420', borderRadius: 10, padding: 4, width: 'fit-content', marginBottom: 24 }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                background: activeTab === t.key ? 'rgba(34,211,165,0.12)' : 'transparent',
                color: activeTab === t.key ? '#22d3a5' : '#64748b',
                display: 'flex', alignItems: 'center', gap: 7, transition: 'all 0.15s',
              }}
            >
              {t.label}
              {t.count !== undefined && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20,
                  background: activeTab === t.key ? 'rgba(34,211,165,0.2)' : 'rgba(255,255,255,0.06)',
                  color: activeTab === t.key ? '#22d3a5' : '#475569',
                }}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* PERSONNEL TAB */}
        {activeTab === 'personnel' && (
          <div style={{ display: 'grid', gridTemplateColumns: selectedMember ? '1fr 340px' : '1fr', gap: 20 }}>
            <div>
              {/* Filter */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {['all', 'on-duty', 'responding', 'break', 'off-duty'].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)} style={{
                    padding: '5px 14px', borderRadius: 20, border: '1px solid',
                    borderColor: filterStatus === s ? 'rgba(34,211,165,0.4)' : 'rgba(255,255,255,0.07)',
                    background: filterStatus === s ? 'rgba(34,211,165,0.1)' : 'transparent',
                    color: filterStatus === s ? '#22d3a5' : '#64748b',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize',
                  }}>{s === 'all' ? 'All Personnel' : s.replace('-', ' ')}</button>
                ))}
              </div>

              {/* Table */}
              <div style={{ background: '#0f1420', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 1.2fr 100px 80px 80px', padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 10, color: '#475569', fontWeight: 600, letterSpacing: '0.08em' }}>
                  <div>OFFICER</div><div>ZONE</div><div>ROLE</div><div>STATUS</div><div>ALERTS</div><div>RADIO</div><div>LAST PING</div>
                </div>
                {filtered.map(m => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMember(selectedMember === m.id ? null : m.id)}
                    style={{
                      display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 1.2fr 100px 80px 80px',
                      padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                      cursor: 'pointer', transition: 'background 0.15s',
                      background: selectedMember === m.id ? 'rgba(34,211,165,0.06)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (selectedMember !== m.id) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)' }}
                    onMouseLeave={e => { if (selectedMember !== m.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: `linear-gradient(135deg, ${statusColor(m.status)}22, ${statusColor(m.status)}44)`,
                        border: `1.5px solid ${statusColor(m.status)}55`,
                        fontSize: 11, fontWeight: 700, color: statusColor(m.status),
                      }}>{m.avatar}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>{m.badge}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: '#94a3b8' }}>{m.zone}</div>
                    <div style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: '#64748b' }}>{m.role}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor(m.status), flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: statusColor(m.status), fontWeight: 500, textTransform: 'capitalize' }}>{m.status.replace('-', ' ')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {m.alerts > 0 ? (
                        <span style={{ fontSize: 12, fontWeight: 700, color: m.alerts >= 4 ? '#ef4444' : '#f59e0b', background: m.alerts >= 4 ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: 12 }}>{m.alerts} alert{m.alerts > 1 ? 's' : ''}</span>
                      ) : <span style={{ fontSize: 12, color: '#334155' }}>—</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: '#475569', fontFamily: 'monospace' }}>{m.radio}</div>
                    <div style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: '#475569' }}>{m.lastSeen}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detail panel */}
            {selectedMember && (() => {
              const m = teamMembers.find(x => x.id === selectedMember)!
              const memberAlerts = activeAlerts.filter(a => a.assigned === m.badge)
              return (
                <div style={{ background: '#0f1420', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', padding: 20, height: 'fit-content', position: 'sticky', top: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${statusColor(m.status)}22, ${statusColor(m.status)}44)`, border: `2px solid ${statusColor(m.status)}55`, fontSize: 15, fontWeight: 700, color: statusColor(m.status) }}>{m.avatar}</div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{m.badge} · {m.role}</div>
                      </div>
                    </div>
                    <button onClick={() => setSelectedMember(null)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    {[
                      { label: 'Zone', val: m.zone },
                      { label: 'Status', val: m.status.replace('-', ' '), color: statusColor(m.status) },
                      { label: 'Radio Channel', val: m.radio },
                      { label: 'Last Ping', val: m.lastSeen },
                    ].map(r => (
                      <div key={r.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.06em', marginBottom: 4 }}>{r.label.toUpperCase()}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: r.color || '#94a3b8', textTransform: 'capitalize' }}>{r.val}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.06em', marginBottom: 10 }}>ASSIGNED ALERTS ({memberAlerts.length})</div>
                  {memberAlerts.length === 0 ? (
                    <div style={{ fontSize: 13, color: '#334155', textAlign: 'center', padding: '16px 0' }}>No active alerts assigned</div>
                  ) : memberAlerts.map(a => {
                    const sev = severityConfig(a.severity)
                    return (
                      <div key={a.id} style={{ background: sev.bg, border: `1px solid ${sev.border}`, borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: sev.text, letterSpacing: '0.05em' }}>{sev.label} · {a.id}</span>
                          <span style={{ fontSize: 10, color: '#475569' }}>{a.time}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{a.type} — {a.zone}</div>
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>{a.desc}</div>
                      </div>
                    )
                  })}

                  <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                    <button style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid rgba(34,211,165,0.3)', background: 'rgba(34,211,165,0.1)', color: '#22d3a5', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Dispatch Message
                    </button>
                    <button style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Reassign Zone
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* ALERTS TAB */}
        {activeTab === 'alerts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{activeAlerts.length}</span> active alerts requiring security response
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['critical', 'high', 'medium', 'low'].map(sev => {
                  const c = severityConfig(sev)
                  const count = activeAlerts.filter(a => a.severity === sev).length
                  return count > 0 ? (
                    <span key={sev} style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12, background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
                      {count} {c.label}
                    </span>
                  ) : null
                })}
              </div>
            </div>

            {activeAlerts.map(a => {
              const sev = severityConfig(a.severity)
              const officer = teamMembers.find(m => m.badge === a.assigned)
              return (
                <div key={a.id} style={{ background: '#0f1420', border: `1px solid ${sev.border}`, borderLeft: `3px solid ${sev.dot}`, borderRadius: 12, padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>
                  <div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: sev.bg, color: sev.text, letterSpacing: '0.08em' }}>{sev.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{a.type}</span>
                      <span style={{ fontSize: 11, color: '#475569' }}>{a.id}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>{a.desc}</div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#475569' }}>
                      <span>Zone: <span style={{ color: '#64748b', fontWeight: 500 }}>{a.zone}</span></span>
                      {a.density !== '—' && <span>Density: <span style={{ color: sev.text, fontWeight: 600 }}>{a.density}</span></span>}
                      <span>Time: <span style={{ color: '#64748b' }}>{a.time}</span></span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                    {officer && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>{officer.name}</div>
                          <div style={{ fontSize: 10, color: '#475569' }}>{officer.badge} · {officer.zone}</div>
                        </div>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${statusColor(officer.status)}22`, border: `1.5px solid ${statusColor(officer.status)}44`, fontSize: 10, fontWeight: 700, color: statusColor(officer.status) }}>{officer.avatar}</div>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={{ padding: '6px 12px', borderRadius: 7, border: `1px solid ${sev.border}`, background: sev.bg, color: sev.text, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Escalate</button>
                      <button style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Resolve</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* DISPATCH TAB */}
        {activeTab === 'dispatch' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
            {/* Log */}
            <div style={{ background: '#0f1420', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>Dispatch Communications Log</span>
                <span style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>LIVE · {dispatchLog.length} entries</span>
              </div>
              <div style={{ padding: '8px 0' }}>
                {dispatchLog.map((entry, i) => (
                  <div key={i} style={{
                    padding: '12px 20px', borderBottom: i < dispatchLog.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                    display: 'grid', gridTemplateColumns: '60px auto 1fr', gap: 12, alignItems: 'start',
                  }}>
                    <span style={{ fontSize: 12, color: '#475569', fontFamily: 'monospace', paddingTop: 2 }}>{entry.time}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                        background: entry.type === 'order' ? 'rgba(34,211,165,0.12)' : entry.type === 'broadcast' ? 'rgba(99,102,241,0.12)' : 'rgba(245,158,11,0.1)',
                        color: entry.type === 'order' ? '#22d3a5' : entry.type === 'broadcast' ? '#818cf8' : '#f59e0b',
                        letterSpacing: '0.06em', whiteSpace: 'nowrap',
                      }}>{entry.type.toUpperCase()}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: '#64748b' }}>{entry.from}</span> → <span style={{ fontWeight: 600, color: '#64748b' }}>{entry.to}</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>{entry.msg}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Compose */}
            <div style={{ background: '#0f1420', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', padding: 20, height: 'fit-content', position: 'sticky', top: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 16 }}>Send Dispatch</div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, color: '#475569', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>TARGET RECIPIENT</label>
                <select
                  value={dispatchTarget}
                  onChange={e => setDispatchTarget(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 13, cursor: 'pointer', outline: 'none' }}
                >
                  <option value="ALL">ALL Units</option>
                  {teamMembers.filter(m => m.status !== 'off-duty').map(m => (
                    <option key={m.badge} value={m.badge}>{m.badge} — {m.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 10, color: '#475569', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>MESSAGE</label>
                <textarea
                  value={dispatchMsg}
                  onChange={e => setDispatchMsg(e.target.value)}
                  placeholder="Type dispatch message..."
                  rows={4}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Evacuate Zone', 'Lock Down', 'Standby Alert'].map(preset => (
                  <button key={preset} onClick={() => setDispatchMsg(preset + ' — immediate action required.')} style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', color: '#64748b', fontSize: 10, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.02em' }}>
                    {preset}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setDispatchMsg('')}
                disabled={!dispatchMsg.trim()}
                style={{ marginTop: 12, width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', background: dispatchMsg.trim() ? 'linear-gradient(135deg, #22d3a5, #0ea5e9)' : 'rgba(255,255,255,0.06)', color: dispatchMsg.trim() ? '#0b1120' : '#334155', fontSize: 13, fontWeight: 700, cursor: dispatchMsg.trim() ? 'pointer' : 'not-allowed', letterSpacing: '0.03em', transition: 'all 0.15s' }}
              >
                TRANSMIT DISPATCH
              </button>
            </div>
          </div>
        )}

        {/* ZONES TAB */}
        {activeTab === 'zones' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {zoneStatus.map(z => {
              const sev = severityConfig(z.status)
              const officers = teamMembers.filter(m => m.zone === z.zone && m.status !== 'off-duty')
              return (
                <div key={z.zone} style={{ background: '#0f1420', borderRadius: 12, border: `1px solid ${sev.border}`, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 3 }}>{z.zone}</div>
                      <div style={{ fontSize: 11, color: '#475569' }}>Max capacity: {z.capacity.toLocaleString()}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 6, background: sev.bg, color: sev.text, letterSpacing: '0.08em', border: `1px solid ${sev.border}` }}>{sev.label}</span>
                  </div>

                  {/* Density bar */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Crowd Density</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: densityBar(z.density) }}>{z.density}%</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${z.density}%`, background: densityBar(z.density), borderRadius: 3, transition: 'width 0.4s ease', boxShadow: `0 0 8px ${densityBar(z.density)}66` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 11, color: '#475569' }}>
                      <span>{z.current.toLocaleString()} present</span>
                      <span>{(z.capacity - z.current).toLocaleString()} remaining</span>
                    </div>
                  </div>

                  {/* Assigned officers */}
                  <div>
                    <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.06em', marginBottom: 8 }}>ASSIGNED OFFICERS ({officers.length})</div>
                    {officers.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#ef4444', background: 'rgba(239,68,68,0.08)', borderRadius: 6, padding: '7px 10px', border: '1px solid rgba(239,68,68,0.2)' }}>⚠ No officer assigned</div>
                    ) : officers.map(o => (
                      <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${statusColor(o.status)}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: statusColor(o.status) }}>{o.avatar}</div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>{o.name}</div>
                            <div style={{ fontSize: 10, color: '#475569' }}>{o.role}</div>
                          </div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: statusColor(o.status), textTransform: 'capitalize' }}>{o.status.replace('-', ' ')}</span>
                      </div>
                    ))}
                  </div>

                  {z.status === 'critical' && (
                    <button style={{ marginTop: 14, width: '100%', padding: '9px 0', borderRadius: 8, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' }}>
                      INITIATE EVACUATION PROTOCOL
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        select option { background: #0f1420; color: #e2e8f0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>
    </div>
  )
}
