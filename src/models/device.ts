// src/models/device.ts

import { DeviceStatus } from "@/utils/status";

export type Side = "north" | "south";

export type Device = {
  id: string;
  gateId?: string;
  name: string;
  side: Side;
  type?: string;
  status: DeviceStatus;
  lastHeartbeat?: string;
  message?: string;
  deviceIp?: string; // เผื่อไว้สำหรับ device-communication.json ที่มี IP
};