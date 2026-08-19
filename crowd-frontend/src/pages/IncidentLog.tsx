/*export default function IncidentLog() {
  return (
    <div style={{ padding: "30px" }}>
      <h1>Incident Log</h1>
      <p>This page is under development.</p>
    </div>
  );
}*/
import { useState, useEffect } from 'react'

import {
  INCIDENTS,
  SEVERITY_CFG,
  STATUS_CFG,
  TIMELINE_TYPE,
} from "../data/incidentData";

type Filter = { severity: string; status: string; zone: string; search: string }

export default function IncidentLog() {
  const [incidents, setIncidents] = useState(INCIDENTS);

  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>({ severity: 'all', status: 'all', zone: 'all', search: '' })
  const [clock, setClock] = useState(new Date())
  const [exportPulse, setExportPulse] = useState(false)


  const fetchIncidentData = async () => {
  console.log("fetchIncidentData called");

  try {
    const response = await fetch("http://localhost:5000/incidents");

    console.log(response.status);

    const data = await response.json();

    setIncidents(data);

    if (data.length > 0 && !selected) {
      setSelected(data[0].id);
    }

  } catch (err) {
    console.error("Failed to fetch incident data", err);
  }
};


  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    fetchIncidentData();

    const timer = setInterval(() => {
        fetchIncidentData();
    }, 1000);

    return () => clearInterval(timer);
}, []);

  const zones = ['all', ...Array.from(new Set(incidents.map(i => i.zone)))]

  const filtered = incidents.filter(inc => {
    if (filter.severity !== 'all' && inc.severity !== filter.severity) return false
    if (filter.status !== 'all' && inc.status !== filter.status) return false
    if (filter.zone !== 'all' && inc.zone !== filter.zone) return false
    if (filter.search && !inc.id.toLowerCase().includes(filter.search.toLowerCase()) &&
      !inc.type.toLowerCase().includes(filter.search.toLowerCase()) &&
      !inc.zone.toLowerCase().includes(filter.search.toLowerCase())) return false
    return true
  })

  const activeCount = incidents.filter(i => i.status === 'active').length
  const criticalCount = incidents.filter(i => i.severity === 'critical').length
  const resolvedToday = incidents.filter(i => i.status === 'resolved' && i.date === '2026-08-03').length
  const totalEvacuated = incidents.reduce((acc, i) => acc + i.evacuated, 0)

  const detail = selected ? incidents.find(i => i.id === selected) : null

  return (
    <div style={{ background: '#0b0f1a', minHeight: '100vh', fontFamily: "'Inter', sans-serif", color: '#e2e8f0', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: '#0f1420', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 28px', display: 'flex', alignItems: 'center', gap: 20, height: 64, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #22d3a5, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em' }}>Incident Log</div>
            <div style={{ fontSize: 11, color: '#64748b', letterSpacing: '0.04em' }}>CROWD INTELLIGENCE SYSTEM</div>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ display: 'flex', gap: 24, marginLeft: 16 }}>
          {[
            { label: 'Active', val: activeCount, color: '#ef4444' },
            { label: 'Monitoring', val: incidents.filter(i => i.status === 'monitoring').length, color: '#fbbf24' },
            { label: 'Resolved Today', val: resolvedToday, color: '#22d3a5' },
            { label: 'Total Evacuated', val: totalEvacuated, color: '#94a3b8' },
          ].map(k => (
            <div key={k.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.val}</div>
              <div style={{ fontSize: 10, color: '#475569', marginTop: 2, letterSpacing: '0.05em' }}>{k.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Export button */}
        <button
          onClick={() => { setExportPulse(true); setTimeout(() => setExportPulse(false), 800) }}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.09)', background: exportPulse ? 'rgba(34,211,165,0.12)' : 'rgba(255,255,255,0.04)', color: exportPulse ? '#22d3a5' : '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Report
        </button>

        {/* Clock */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
            {clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </div>
          <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.04em' }}>
            {clock.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
          </div>
        </div>

        {activeCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.28)', borderRadius: 8, padding: '6px 14px' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', display: 'block', animation: 'pulse 1.4s ease-in-out infinite' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#f87171', letterSpacing: '0.04em' }}>{activeCount} ACTIVE INCIDENT{activeCount > 1 ? 'S' : ''}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel: list */}
        <div style={{ width: 400, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Filters */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={filter.search}
                onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
                placeholder="Search by ID, type, zone…"
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 12px 8px 30px', color: '#e2e8f0', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            {/* Filter row */}
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { key: 'severity', opts: ['all', 'critical', 'high', 'medium', 'low'] },
                { key: 'status', opts: ['all', 'active', 'monitoring', 'resolved'] },
              ].map(({ key, opts }) => (
                <select
                  key={key}
                  value={(filter as any)[key]}
                  onChange={e => setFilter(f => ({ ...f, [key]: e.target.value }))}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: '7px 10px', color: '#94a3b8', fontSize: 12, cursor: 'pointer', outline: 'none' }}
                >
                  {opts.map(o => <option key={o} value={o}>{o === 'all' ? (key === 'severity' ? 'All Severities' : 'All Statuses') : o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                </select>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#475569' }}>
              Showing <span style={{ color: '#94a3b8', fontWeight: 600 }}>{filtered.length}</span> of {incidents.length} incidents
            </div>
          </div>

          {/* Incident list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.map(inc => {
              const sev = SEVERITY_CFG(inc.severity)
              const sta = STATUS_CFG(inc.status)
              const isSelected = selected === inc.id
              return (
                <div
                  key={inc.id}
                  onClick={() => setSelected(inc.id)}
                  style={{
                    padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    cursor: 'pointer', background: isSelected ? 'rgba(34,211,165,0.06)' : 'transparent',
                    borderLeft: isSelected ? '2px solid #22d3a5' : '2px solid transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)' }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: sev.dot, flexShrink: 0, ...(inc.status === 'active' ? { animation: 'pulse 1.4s ease-in-out infinite' } : {}) }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', fontFamily: 'monospace' }}>{inc.id}</span>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: sta.bg, color: sta.color, letterSpacing: '0.06em' }}>{sta.label}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>{inc.type}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#475569' }}>{inc.zone} · {inc.time}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: sev.bg, color: sev.text, letterSpacing: '0.06em', border: `1px solid ${sev.border}` }}>{sev.label}</span>
                  </div>
                  {inc.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                      {inc.tags.slice(0, 3).map(tag => (
                        <span key={tag} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', color: '#475569', border: '1px solid rgba(255,255,255,0.06)', letterSpacing: '0.04em' }}>#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right panel: detail */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {!detail ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#334155' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              <div style={{ fontSize: 14 }}>Select an incident to view details</div>
            </div>
          ) : (() => {
            const sev = SEVERITY_CFG(detail.severity)
            const sta = STATUS_CFG(detail.status)
            return (
              <div>
                {/* Incident header */}
                <div style={{ background: '#0f1420', borderRadius: 12, border: `1px solid ${sev.border}`, borderTop: `3px solid ${sev.dot}`, padding: '20px 24px', marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#64748b', fontWeight: 600 }}>{detail.id}</span>
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 6, background: sev.bg, color: sev.text, letterSpacing: '0.08em', border: `1px solid ${sev.border}` }}>{sev.label}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: sta.bg, color: sta.color, letterSpacing: '0.06em' }}>{sta.label}</span>
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em' }}>{detail.type}</div>
                      <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{detail.date} · {detail.time} · {detail.zone}</div>
                    </div>
                    {detail.status === 'active' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(34,211,165,0.3)', background: 'rgba(34,211,165,0.1)', color: '#22d3a5', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Mark Resolved</button>
                        <button style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Escalate</button>
                      </div>
                    )}
                  </div>

                  <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.65, margin: 0 }}>{detail.description}</p>

                  {/* Metadata grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 16 }}>
                    {[
                      { label: 'Reported By', val: detail.reportedBy },
                      { label: 'Assigned To', val: detail.assignedTo },
                      { label: 'Density', val: detail.density },
                      { label: 'Evacuated', val: detail.evacuated > 0 ? detail.evacuated.toString() : '—' },
                    ].map(m => (
                      <div key={m.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.06em', marginBottom: 5 }}>{m.label.toUpperCase()}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>{m.val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Tags */}
                  {detail.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                      {detail.tags.map(tag => (
                        <span key={tag} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 5, background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.07)' }}>#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Timeline */}
                <div style={{ background: '#0f1420', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>Incident Timeline</span>
                    <span style={{ fontSize: 11, color: '#475569' }}>{detail.timeline.length} entries</span>
                  </div>
                  <div style={{ padding: '8px 24px 20px' }}>
                    {detail.timeline.map((entry, i) => {
                      const tc = TIMELINE_TYPE(entry.type)
                      const isLast = i === detail.timeline.length - 1
                      return (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 12px 1fr', gap: '0 16px', position: 'relative' }}>
                          {/* Time */}
                          <div style={{ paddingTop: 18, textAlign: 'right' }}>
                            <span style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>{entry.time}</span>
                          </div>
                          {/* Spine */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ marginTop: 20, width: 12, height: 12, borderRadius: '50%', background: tc.color, flexShrink: 0, boxShadow: `0 0 0 3px ${tc.bg}` }} />
                            {!isLast && <div style={{ flex: 1, width: 1.5, background: 'rgba(255,255,255,0.06)', minHeight: 24 }} />}
                          </div>
                          {/* Content */}
                          <div style={{ paddingTop: 14, paddingBottom: isLast ? 0 : 6 }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 5 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: tc.bg, color: tc.color, letterSpacing: '0.06em' }}>{tc.label}</span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>{entry.actor}</span>
                            </div>
                            <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.55 }}>{entry.action}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Add note */}
                <div style={{ background: '#0f1420', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', marginTop: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 10 }}>Add Field Note</div>
                  <textarea
                    placeholder="Add observation or update to this incident record…"
                    rows={3}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                    <button style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #22d3a5, #0ea5e9)', color: '#0b1120', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      Submit Note
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        select option { background: #0f1420; color: #e2e8f0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
      `}</style>
    </div>
  )
}