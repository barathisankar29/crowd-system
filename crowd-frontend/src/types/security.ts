export interface TeamMember {
  id: number;
  name: string;
  badge: string;
  role: string;
  zone: string;
  status: "on-duty" | "responding" | "break" | "off-duty";
  radio: string;
  avatar: string;
  alerts: number;
  lastSeen: string;
}

export interface Alert {
  id: string;
  zone: string;
  severity: "critical" | "high" | "medium" | "low";
  type: string;
  density: string;
  assigned: string;
  time: string;
  desc: string;
}

export interface DispatchLog {
  time: string;
  from: string;
  to: string;
  msg: string;
  type: "order" | "field" | "broadcast";
}

export interface ZoneStatus {
  zone: string;
  capacity: number;
  current: number;
  density: number;
  status: "critical" | "high" | "medium" | "low";
  officers: number;
}

export type Tab = "personnel" | "alerts" | "dispatch" | "zones";