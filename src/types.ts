export interface Device {
  id: string;
  name: string;
  category: "lighting" | "climate" | "security" | "appliances";
  status: "on" | "off" | "online" | "offline" | "idle" | "running";
  brightness?: number;
  color?: string;
  temperature?: number;
  mode?: string;
  volume?: number;
  lockState?: "locked" | "unlocked";
  battery?: number;
  watt: number;
  details?: string;
  failureCount?: number;
}

export interface Automation {
  id: string;
  name: string;
  trigger: string;
  action: string;
  active: boolean;
}

export interface LogEntry {
  timestamp: string;
  source: string;
  message: string;
  type: "info" | "warning" | "success" | "alarm";
}

export interface HourlyEnergy {
  time: string;
  power: number;
}

export interface WeeklyEnergy {
  day: string;
  usage: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model" | "system" | "tool";
  text: string;
  timestamp: string;
  calledTools?: string[];
}
