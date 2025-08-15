// src/electron/main-hb-ref.ts

import type { HeartbeatServer } from "./heartbeatServer";

let hbRef: HeartbeatServer | null = null;

export function setHeartbeatServerRef(s: HeartbeatServer | null) { hbRef = s; }
export function getHeartbeatServer(): HeartbeatServer | null { return hbRef; }