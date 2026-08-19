import type { Incident } from "../types/incident";

export const INCIDENTS: Incident[] = [
  {
    id: 'INC-2026-0047', date: '2026-08-03', time: '10:04 AM', zone: 'Zone C', type: 'Crowd Surge',
    severity: 'critical', status: 'active', reportedBy: 'SC-003', assignedTo: 'Cpt. Arjun Mehta',
    density: '94%', casualties: 0, evacuated: 0,
    description: 'Rapid crowd build-up beyond safe capacity threshold at Zone C north sector. AI model flagged density spike of 18% within 4 minutes. Evacuation via Gate 7 and 8 initiated.',
    timeline: [
      { time: '10:04 AM', actor: 'AI System', action: 'Density threshold breach detected — Zone C north at 94%', type: 'auto' },
      { time: '10:05 AM', actor: 'SC-003', action: 'Field confirmation: crowd surge at C-north. Requesting backup.', type: 'field' },
      { time: '10:06 AM', actor: 'Control', action: 'Backup dispatched. Evacuation protocol initiated via Gate 7 & 8.', type: 'control' },
      { time: '10:07 AM', actor: 'SC-001', action: 'En route to Zone C. ETA 3 minutes.', type: 'field' },
    ],
    tags: ['crowd-surge', 'evacuation', 'ai-flagged'],
  },
  {
    id: 'INC-2026-0046', date: '2026-08-03', time: '10:01 AM', zone: 'VIP Corridor', type: 'Unauthorized Entry',
    severity: 'high', status: 'active', reportedBy: 'SC-007', assignedTo: 'Sgt. Kabir Singh',
    density: '—', casualties: 0, evacuated: 0,
    description: 'Unverified badge detected at VIP corridor checkpoint 4 by RFID scanner. Individual detained for verification. Badge ID does not match event roster.',
    timeline: [
      { time: '10:01 AM', actor: 'RFID System', action: 'Unverified badge scan at checkpoint 4 — badge ID: UNK-0831', type: 'auto' },
      { time: '10:02 AM', actor: 'SC-007', action: 'In position at checkpoint 4. Visual on individual confirmed.', type: 'field' },
      { time: '10:04 AM', actor: 'Control', action: 'Lock down VIP corridor. Initiate identity verification procedure.', type: 'control' },
    ],
    tags: ['unauthorized', 'vip-zone', 'rfid-alert'],
  },
  {
    id: 'INC-2026-0045', date: '2026-08-03', time: '09:58 AM', zone: 'Zone A', type: 'Flow Bottleneck',
    severity: 'medium', status: 'monitoring', reportedBy: 'SC-001', assignedTo: 'Cpt. Arjun Mehta',
    density: '76%', casualties: 0, evacuated: 0,
    description: 'Exit throughput at Gate 3 reduced by 40% due to simultaneous egress. Crowd pooling detected in sector A-east. Barrier redeployment recommended.',
    timeline: [
      { time: '09:58 AM', actor: 'SC-001', action: 'Gate 3 bottleneck forming. Crowd pooling at A-east.', type: 'field' },
      { time: '10:00 AM', actor: 'Control', action: 'Acknowledged. Barrier crew alerted. Monitor and report.', type: 'control' },
      { time: '10:03 AM', actor: 'SC-001', action: 'Flow improving. Barrier team deploying now.', type: 'field' },
    ],
    tags: ['bottleneck', 'crowd-flow', 'barrier'],
  },
  {
    id: 'INC-2026-0044', date: '2026-08-03', time: '09:55 AM', zone: 'Zone B', type: 'Dense Cluster',
    severity: 'medium', status: 'monitoring', reportedBy: 'SC-002', assignedTo: 'Off. Priya Nair',
    density: '71%', casualties: 0, evacuated: 0,
    description: 'Static crowd cluster identified in Zone B sector B-2. Pedestrian movement velocity dropped below 0.5 m/s. Dispersal team on standby.',
    timeline: [
      { time: '09:55 AM', actor: 'AI System', action: 'Velocity drop detected in B-2 — avg 0.4 m/s', type: 'auto' },
      { time: '09:57 AM', actor: 'SC-002', action: 'Visual on static cluster at B-2. Requesting dispersal guidance.', type: 'field' },
      { time: '09:59 AM', actor: 'Control', action: 'Dispersal team dispatched. Avoid use of barriers — verbal dispersal only.', type: 'control' },
    ],
    tags: ['cluster', 'dispersal', 'ai-flagged'],
  },
  {
    id: 'INC-2026-0043', date: '2026-08-03', time: '09:32 AM', zone: 'Entry Gate', type: 'Medical Assistance',
    severity: 'medium', status: 'resolved', reportedBy: 'SC-004', assignedTo: 'Sgt. Divya Rao',
    density: '—', casualties: 1, evacuated: 0,
    description: 'One visitor reported dizziness and shortness of breath near Entry Gate turnstile 2. First aid administered on-site. Transported to on-site medical facility.',
    timeline: [
      { time: '09:32 AM', actor: 'SC-004', action: 'Medical emergency at entry gate. One person down at turnstile 2.', type: 'field' },
      { time: '09:33 AM', actor: 'Control', action: 'Medical team dispatched. ETA 90 seconds.', type: 'control' },
      { time: '09:35 AM', actor: 'Medical', action: 'On scene. First aid in progress.', type: 'field' },
      { time: '09:42 AM', actor: 'Medical', action: 'Patient stable. Transported to on-site medical facility.', type: 'field' },
      { time: '09:45 AM', actor: 'SC-004', action: 'Incident cleared. Entry gate operations resumed.', type: 'field' },
    ],
    tags: ['medical', 'first-aid', 'resolved'],
  },
  {
    id: 'INC-2026-0042', date: '2026-08-03', time: '09:14 AM', zone: 'Zone B', type: 'Suspicious Object',
    severity: 'high', status: 'resolved', reportedBy: 'SC-006', assignedTo: 'Off. Sneha Patel',
    density: '—', casualties: 0, evacuated: 120,
    description: 'Unattended bag found near Zone B refreshment stall 4. Area evacuated. Bomb disposal team called. Object identified as lost personal luggage — false alarm.',
    timeline: [
      { time: '09:14 AM', actor: 'SC-006', action: 'Unattended bag reported at stall 4. Initiating 15m exclusion zone.', type: 'field' },
      { time: '09:15 AM', actor: 'Control', action: 'Evacuate 120m radius. Bomb disposal notified.', type: 'control' },
      { time: '09:16 AM', actor: 'SC-006', action: 'Evacuation complete. 120 persons moved to safe area.', type: 'field' },
      { time: '09:28 AM', actor: 'Bomb Disposal', action: 'Object inspected. Identified as personal luggage — no threat.', type: 'field' },
      { time: '09:31 AM', actor: 'Control', action: 'All-clear issued. Area reopened.', type: 'control' },
    ],
    tags: ['suspicious-object', 'evacuation', 'false-alarm', 'resolved'],
  },
  {
    id: 'INC-2026-0041', date: '2026-08-02', time: '05:48 PM', zone: 'Zone C', type: 'Minor Altercation',
    severity: 'low', status: 'resolved', reportedBy: 'SC-003', assignedTo: 'Off. Rajan Kumar',
    density: '—', casualties: 0, evacuated: 0,
    description: 'Verbal altercation between two visitors near Zone C food court. De-escalated on-site by field officer. No injuries. Both parties given warnings.',
    timeline: [
      { time: '05:48 PM', actor: 'SC-003', action: 'Verbal altercation near Zone C food court. Moving to intervene.', type: 'field' },
      { time: '05:51 PM', actor: 'SC-003', action: 'Situation de-escalated. Both parties separated.', type: 'field' },
      { time: '05:53 PM', actor: 'Control', action: 'Log altercation. Issue visitor warnings. No further action required.', type: 'control' },
    ],
    tags: ['altercation', 'de-escalation', 'resolved'],
  },
  {
    id: 'INC-2026-0040', date: '2026-08-02', time: '02:20 PM', zone: 'Zone A', type: 'Equipment Failure',
    severity: 'low', status: 'resolved', reportedBy: 'SC-001', assignedTo: 'Cpt. Arjun Mehta',
    density: '—', casualties: 0, evacuated: 0,
    description: 'Camera 3 covering Zone A sector north went offline. Manual foot patrol increased. Camera restored after 22 minutes by technical team.',
    timeline: [
      { time: '02:20 PM', actor: 'AI System', action: 'Camera 3 feed lost. Zone A north sector blind.', type: 'auto' },
      { time: '02:21 PM', actor: 'Control', action: 'Technical team dispatched. SC-001 — increase foot patrol in Zone A north.', type: 'control' },
      { time: '02:42 PM', actor: 'Technical', action: 'Camera 3 restored — hardware fault corrected.', type: 'field' },
    ],
    tags: ['equipment', 'camera', 'technical', 'resolved'],
  },
]

export const SEVERITY_CFG = (s: string) => {
  if (s === 'critical') return { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#f87171', dot: '#ef4444', bar: '#ef4444', label: 'CRITICAL' }
  if (s === 'high') return { bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.28)', text: '#fb923c', dot: '#f97316', bar: '#f97316', label: 'HIGH' }
  if (s === 'medium') return { bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.22)', text: '#fbbf24', dot: '#eab308', bar: '#eab308', label: 'MEDIUM' }
  return { bg: 'rgba(34,211,165,0.07)', border: 'rgba(34,211,165,0.18)', text: '#22d3a5', dot: '#22d3a5', bar: '#22d3a5', label: 'LOW' }
}

export const STATUS_CFG = (s: string) => {
  if (s === 'active') return { color: '#f87171', bg: 'rgba(239,68,68,0.1)', label: 'ACTIVE' }
  if (s === 'monitoring') return { color: '#fbbf24', bg: 'rgba(234,179,8,0.1)', label: 'MONITORING' }
  return { color: '#22d3a5', bg: 'rgba(34,211,165,0.08)', label: 'RESOLVED' }
}

export const TIMELINE_TYPE = (t: string) => {
  if (t === 'auto') return { color: '#818cf8', bg: 'rgba(99,102,241,0.12)', label: 'AUTO' }
  if (t === 'control') return { color: '#22d3a5', bg: 'rgba(34,211,165,0.1)', label: 'CTRL' }
  return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'FIELD' }
}