
import type {
  TeamMember,
  Alert,
  DispatchLog,
  ZoneStatus,
} from "../types/security";

export const TEAM_MEMBERS:TeamMember[] = [
  { id: 1, name: 'Cpt. Arjun Mehta', badge: 'SC-001', role: 'Team Lead', zone: 'Zone A', status: 'on-duty', radio: 'CH-1', avatar: 'AM', alerts: 3, lastSeen: '0m ago' },
  { id: 2, name: 'Off. Priya Nair', badge: 'SC-002', role: 'Field Officer', zone: 'Zone B', status: 'on-duty', radio: 'CH-2', avatar: 'PN', alerts: 1, lastSeen: '1m ago' },
  { id: 3, name: 'Off. Rajan Kumar', badge: 'SC-003', role: 'Field Officer', zone: 'Zone C', status: 'responding', radio: 'CH-2', avatar: 'RK', alerts: 5, lastSeen: '0m ago' },
  { id: 4, name: 'Sgt. Divya Rao', badge: 'SC-004', role: 'Sergeant', zone: 'Entry Gate', status: 'on-duty', radio: 'CH-1', avatar: 'DR', alerts: 0, lastSeen: '2m ago' },
  { id: 5, name: 'Off. Vikram Das', badge: 'SC-005', role: 'Field Officer', zone: 'Zone A', status: 'break', radio: 'CH-3', avatar: 'VD', alerts: 0, lastSeen: '8m ago' },
  { id: 6, name: 'Off. Sneha Patel', badge: 'SC-006', role: 'Field Officer', zone: 'Zone B', status: 'on-duty', radio: 'CH-3', avatar: 'SP', alerts: 2, lastSeen: '1m ago' },
  { id: 7, name: 'Sgt. Kabir Singh', badge: 'SC-007', role: 'Sergeant', zone: 'VIP Corridor', status: 'responding', radio: 'CH-1', avatar: 'KS', alerts: 4, lastSeen: '0m ago' },
  { id: 8, name: 'Off. Ananya Joshi', badge: 'SC-008', role: 'Field Officer', zone: 'Zone C', status: 'off-duty', radio: '—', avatar: 'AJ', alerts: 0, lastSeen: '3h ago' },
]

export const ACTIVE_ALERTS: Alert[] = [
  { id: 'ALT-091', zone: 'Zone C', severity: 'critical', type: 'Crowd Surge', density: '94%', assigned: 'SC-003', time: '10:04 AM', desc: 'Capacity exceeded — immediate evacuation protocol required' },
  { id: 'ALT-088', zone: 'VIP Corridor', severity: 'high', type: 'Unauthorized Entry', density: '—', assigned: 'SC-007', time: '10:01 AM', desc: 'Unverified badge detected at checkpoint 4' },
  { id: 'ALT-085', zone: 'Zone A', severity: 'medium', type: 'Flow Bottleneck', density: '76%', assigned: 'SC-001', time: '09:58 AM', desc: 'Exit throughput reduced — crowd pooling near Gate 3' },
  { id: 'ALT-083', zone: 'Zone B', severity: 'medium', type: 'Dense Cluster', density: '71%', assigned: 'SC-002', time: '09:55 AM', desc: 'Static cluster detected, dispersal recommended' },
  { id: 'ALT-079', zone: 'Zone B', severity: 'low', type: 'Slow Movement', density: '58%', assigned: 'SC-006', time: '09:48 AM', desc: 'Pedestrian velocity drop in sector B-2' },
]

export const DISPATCH_LOG: DispatchLog[] = [
  { time: '10:07', from: 'Control', to: 'SC-003', msg: 'Initiate Zone C evacuation via Gate 7 and 8 immediately.', type: 'order' },
  { time: '10:06', from: 'SC-003', to: 'Control', msg: 'Confirmed surge at C-north. Requesting backup.', type: 'field' },
  { time: '10:04', from: 'Control', to: 'SC-007', msg: 'Lock down VIP corridor checkpoint 4. Detain unverified badge.', type: 'order' },
  { time: '10:02', from: 'SC-007', to: 'Control', msg: 'In position at checkpoint 4. Visual confirmed.', type: 'field' },
  { time: '10:00', from: 'Control', to: 'ALL', msg: 'Density threshold breach imminent in Zone C. All units on standby.', type: 'broadcast' },
  { time: '09:58', from: 'SC-001', to: 'Control', msg: 'Gate 3 bottleneck forming. Requesting crowd control barriers.', type: 'field' },
]

export const ZONE_STATUS: ZoneStatus[] = [
  { zone: 'Zone A', capacity: 2000, current: 1520, density: 76, status: 'medium', officers: 2 },
  { zone: 'Zone B', capacity: 1800, current: 1278, density: 71, status: 'medium', officers: 2 },
  { zone: 'Zone C', capacity: 1500, current: 1413, density: 94, status: 'critical', officers: 1 },
  { zone: 'Entry Gate', capacity: 500, current: 190, density: 38, status: 'low', officers: 1 },
  { zone: 'VIP Corridor', capacity: 300, current: 147, density: 49, status: 'low', officers: 1 },
]