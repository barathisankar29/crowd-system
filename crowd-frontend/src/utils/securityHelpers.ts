export const statusColor = (s: string) => {
  if (s === 'on-duty') return '#22d3a5'
  if (s === 'responding') return '#f59e0b'
  if (s === 'break') return '#94a3b8'
  return '#475569'
}

export const severityConfig = (sev: string) => {
  if (sev === 'critical') return { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', text: '#f87171', dot: '#ef4444', label: 'CRITICAL' }
  if (sev === 'high') return { bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)', text: '#fb923c', dot: '#f97316', label: 'HIGH' }
  if (sev === 'medium') return { bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.25)', text: '#fbbf24', dot: '#eab308', label: 'MEDIUM' }
  return { bg: 'rgba(34,211,165,0.07)', border: 'rgba(34,211,165,0.2)', text: '#22d3a5', dot: '#22d3a5', label: 'LOW' }
}

export const densityBar = (pct: number) => {
  if (pct >= 85) return '#ef4444'
  if (pct >= 65) return '#eab308'
  return '#22d3a5'
}