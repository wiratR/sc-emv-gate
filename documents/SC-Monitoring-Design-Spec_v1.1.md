# SC Monitoring Application – Design Specification

**Project:** Station Computer (SC) Monitoring

**Version:** 1.1  
**Date:** 2025‑08‑21  
**Timezone:** Asia/Bangkok (UTC+07:00)

---

## Document Control

| Version | Date       | Author        | Changes |
|--------:|------------|---------------|---------|
| 1.0     | 2025‑08‑18 | (Your name)   | Initial draft |
| 1.1     | 2025‑08‑21 | (Your name)   | Add Aisle Mode & Last‑Inservice endpoints, update enums & cURL, minor clarifications |

---

## Table of Contents
- [1. Topology & Assumptions](#1-topology--assumptions)
- [2. Diagrams](#2-diagrams)
- [3. Network Requirements](#3-network-requirements)
- [4. Time, Locale & Logging](#4-time-locale--logging)
- [5. Application Configuration](#5-application-configuration)
- [6. HTTP Interface](#6-http-interface)
  - [6.1 Endpoints](#61-endpoints)
  - [6.2 Operations (Allowed Values)](#62-operations-allowed-values)
  - [6.3 Aisle Mode (Allowed Values)](#63-aisle-mode-allowed-values)
- [7. Security & Hardening](#7-security--hardening)
- [8. BEM Confirmation Checklist](#8-bem-confirmation-checklist)
- [Appendix A — cURL Examples](#appendix-a--curl-examples)
- [Appendix B — Sample Payloads](#appendix-b--sample-payloads)
- [Appendix C — Error Codes & Responses](#appendix-c--error-codes--responses)
- [Appendix D — Glossary](#appendix-d--glossary)
- [Appendix E — Reference `config.json`](#appendix-e--reference-configjson-station-samyan--สามย่าน)

---

## 1. Topology & Assumptions
- The **existing Station Computer (SC)** remains on the same LAN and continues to run the **legacy SC** application.
- A new **SC Monitoring** application is **installed on the same host** (side‑by‑side with legacy).
- All **EMV gates** connect via the **existing access switch**. Each new gate is assigned a **unique static IP**.
- No VLAN redesign is assumed unless explicitly stated.
- Devices communicate **IP‑to‑IP** (DNS optional for SC hostname convenience).

**Key Assumptions**
1. Legacy SC application continues to operate unchanged.  
2. Monitoring app listens on a configurable **HTTP port** for heartbeats and operation control.  
3. Both SC and gates synchronize time against the **same NTP source**.  
4. The station network allows the required **ingress/egress rules** listed below.  

---

## 2. Diagrams

> Replace placeholders with as‑built diagrams during deployment.

**2.1 High‑Level Logical Topology**
```
+---------------------+            TCP/3070 (HB)            +---------------------+
|   Gate 1 (Static)   |------------------------------------>|        SC Host      |
|  192.168.1.101      |                                     |  Legacy SC + Monitor|
+---------------------+                                     |  127.0.0.1:3070     |
                                                          |  (Station App)      |
+---------------------+            TCP/3070 (HB)            +---------------------+
|   Gate 2 (Static)   |------------------------------------>  Egress SSH -> Gates
|  192.168.1.102      |                                     |  Logs, UI, Control  |
+---------------------+                                     +----------+----------+
                                                                    |
                                                                    | LAN (Existing Switch)
                                                                    |
                                                            +-------+--------+
                                                            |   NTP Source   |
                                                            +----------------+
```

**2.2 Deployment on SC Host**
```
+----------------------------- SC Host -----------------------------+
|                                                                   |
|  [Legacy SC App]     [SC Monitoring Service]  [Logs Folder]       |
|     (unchanged)         (HTTP :3070 default)     (rotating)       |
|                                                                   |
+-------------------------------------------------------------------+
```

---

## 3. Network Requirements

### 3.1 Addressing
- **Static IP per gate device.** Maintain and publish an IP plan (Appendix or Ops Runbook).
- **SC IP:** Fixed or **DHCP reservation**.

### 3.2 Time Sync
- **NTP:** SC and all gates point to the **same NTP source**.

### 3.3 DNS
- Not required (IP‑based). Optional **A‑record** for SC hostname mapping.

### 3.4 Ports & Protocols

**Mandatory**
- **3070/TCP** → SC Heartbeat HTTP endpoint (**gate → SC**).
- **22/TCP** → SSH probe & log collection (**SC → gate**).

**Optional / As Needed**
- **80/443/TCP** → Future REST APIs, mirrors, or support.
- **5900/3389/TCP** → Remote support (VNC/RDP) if approved.

### 3.5 Firewall Rules (Principle: Default‑Deny)

| Direction        | From                  | To (SC)                | Port/Proto | Action |
|------------------|-----------------------|------------------------|-----------:|:------:|
| **INGRESS → SC** | Gate IPs (static set) | SC:3070/TCP            |     3070/TCP | Allow |
| **EGRESS ← SC**  | SC                    | Gate IPs (static set)  |       22/TCP | Allow |
| All else         | Any                   | Any                    |       *     | Deny + Log |

> Maintain an **allowlist** of gate IPs; alerts on any non‑allowlisted source.

---

## 4. Time, Locale & Logging
- **SC logger timestamps:** local time with timezone offset  
  e.g., `2025‑08‑14T15:21:07.648+07:00`.
- **Gate heartbeat `ts`:** ISO‑8601 **UTC**  
  e.g., `2025‑08‑14T08:21:07Z`.
- **Retention:** configurable (default **14 days**). Daily rotation by SC local date.
- **Log location:** configurable `logsPath`. UI exposes **“Open Logs Folder.”**
- **Recommended structure:**
  - `/logs/app/yyyy‑MM‑dd.log`
  - `/logs/http/yyyy‑MM‑dd.log`
  - `/logs/devices/<deviceId>.log`

---

## 5. Application Configuration
This section defines how the Station App loads and validates its runtime configuration (`config.json`).

### 5.1 Location & Lifecycle
- **Production:** `config.json` resides in the Electron **userData** directory of the service account.
- **Development:** may load from project paths; see Appendix E for a full reference example.
- On start, the app **validates** the config and logs any defaults applied.

### 5.2 Keys & Defaults
| Key | Type | Required | Default | Example | Notes |
|-----|------|:-------:|---------|---------|-------|
| `databasePath` | string | ✓ | `./database/app.sqlite` | `/var/lib/sc-monitor/app.sqlite` | SQLite file path. Ensure directory is writable. |
| `logsPath` | string | ✓ | *(none)* | `/var/log/sc-monitor` | Base folder for rotating logs. |
| `logLevel` | enum | ✓ | `info` | `error\|warn\|info\|debug\|trace` | Controls verbosity across app & HTTP logs. |
| `logsRetentionDays` | integer | ✓ | `14` | `30` | Days to keep logs; rotation is daily by SC local date. |
| `environment` | enum | ✓ | `development` | `development\|production` | Switches dev/production behaviors (paths, diagnostics). |
| `fullScreen` | boolean | ✓ | `false` | `true` | UI preference for kiosk/monitoring display. |
| `deviceCommunicationPath` | string | ✓ | *(none)* | `/opt/sc-emv-gate/data` | Folder for device comms (e.g., JSON command lists). |
| `stationIp` | string | ✓ | `127.0.0.1` | `192.168.1.100` | IPv4 (or hostname) used by gates to reach SC. |
| `stationName.en` | string | ✓ | *(none)* | `SamYan` | English display name. |
| `stationName.th` | string | ✓ | *(none)* | `สามย่าน` | Thai display name. |
| `stationId` | string | ✓ | *(none)* | `13` | Station identifier used in logs & UI. |
| `heartbeatPort` | integer | ✓ | `3070` | `3070` | HTTP port for `/hb`, `/operation`, `/time`. |
| `deviceProbePort` | integer | ✓ | `2222` | `2222` | Port for probes/SSH collectors; align firewall (§3.5). |
| `time.tz` | string | ✗ | *(inherit system TZ)* | `Asia/Bangkok` | Optional IANA TZ; if set, influences log formatting. |
| `devices[]` | array<object> | ✗ | `[]` | `{ id, ip, gateId?, side?, type? }` | Optional seed list for UI & validations. |

> If `deviceProbePort` is enabled, allow **SC → Gate** egress on that port and document it in §3.4/§3.5.

### 5.3 Reference Configuration
A complete, production‑like example is included in **Appendix E** (SamYan / สามย่าน, Station ID `13`). Use it as a baseline and adjust paths/ports per host.

### 5.4 JSON Schema (for validation)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "databasePath": { "type": "string" },
    "logsPath": { "type": "string" },
    "logLevel": { "type": "string", "enum": ["error", "warn", "info", "debug", "trace"], "default": "info" },
    "logsRetentionDays": { "type": "integer", "minimum": 1, "default": 14 },
    "environment": { "type": "string", "enum": ["development", "production"], "default": "development" },
    "fullScreen": { "type": "boolean", "default": false },
    "deviceCommunicationPath": { "type": "string" },
    "stationIp": { "type": "string" },
    "stationName": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "en": { "type": "string" },
        "th": { "type": "string" }
      },
      "required": ["en", "th"]
    },
    "stationId": { "type": "string" },
    "heartbeatPort": { "type": "integer", "minimum": 1, "maximum": 65535, "default": 3070 },
    "deviceProbePort": { "type": "integer", "minimum": 1, "maximum": 65535, "default": 2222 },
    "time": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "tz": { "type": "string" }
      }
    },
    "devices": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "id": { "type": "string" },
          "ip": { "type": "string" },
          "gateId": { "type": "string" },
          "side": { "type": "string", "enum": ["north", "south"] },
          "type": { "type": "string" }
        },
        "required": ["id", "ip"]
      }
    }
  },
  "required": [
    "databasePath","logsPath","logLevel","logsRetentionDays","environment",
    "fullScreen","deviceCommunicationPath","stationIp","stationName",
    "stationId","heartbeatPort","deviceProbePort"
  ]
}
```

---

## 6. HTTP Interface
HTTP interface for gates to integrate with the Station App. Focused on actions: **Send Heartbeat**, **Read/Set Operation**, **Aisle Mode control**, and **Last‑Inservice tracking**.

**Base URL**  
`http://{station_ip}:{heartbeat_port}`  
- Default `station_ip`: `127.0.0.1` (local tests)  
- Default `heartbeat_port`: `3070` (configurable)

### Data Types

#### 6.0.1 Device Heartbeat (JSON)
```json
{
  "id": "G1-01",
  "ip": "192.168.1.101",
  "gateId": "G1",
  "side": "north",
  "type": "entry-reader",
  "status": "online",
  "ts": "2025-08-14T13:31:52Z",
  "message": "optional"
}
```

**Field Definition**

| Field       | Type                   | Required | Allowed / Example          | Notes |
|-------------|------------------------|:--------:|----------------------------|-------|
| `id`        | string                 | **Yes**  | `G1-01`                    | Unique device ID. |
| `ip`        | string                 | **Yes**  | `192.168.1.101`            | IPv4/IPv6 literal of device. |
| `status`    | string (enum)          | **Yes**  | `online\|maintenance\|fault` | Current health of device. |
| `ts`        | string (ISO‑8601 UTC)  | **Yes**  | `2025-08-14T12:34:56Z`     | Used for staleness checks; if omitted, server sets current time. |
| `message`   | string                 | No       | `"Reader OK"`              | Free‑form diagnostic note. |
| `type`      | string                 | No       | `reader`                   | Optional label for device role/type. |
| `side`      | string (enum)          | No       | `north\|south`             | Lane side identifier. |
| `gateId`    | string                 | No       | `G1`                       | Gate group/lane ID. |
| `stationId` | string                 | No       | `ST-13`                    | Station identifier. |

> Status values accepted for `status`: `online`, `maintenance`, `fault`. (Server may infer `offline` if heartbeat stales.)

---

### 6.1 Endpoints

#### 6.1.1 `POST /hb` — Send a heartbeat
**Body:** *Device Heartbeat (JSON)*

**Success (200)**
```json
{ "ok": true }
```
**Error (4xx/5xx)**
```json
{ "ok": false, "error": "message" }
```

**Notes**
- Recommended interval: **5–10 seconds** per device.
- Use **exponential backoff** on network errors.
- Station records `lastHeartbeat` per device.

---

#### 6.1.2 `POST /hb/bulk` — Send multiple heartbeats
**Body:** JSON array of heartbeats

**Success (200)**
```json
{ "ok": true, "count": 3 }
```
**Error (4xx/5xx)**
```json
{ "ok": false, "error": "message" }
```

---

#### 6.1.3 `GET /hb` — Diagnostic snapshot
Returns the Station App current view, including `lastHeartbeat`.

**Response (excerpt)**
```json
{
  "ok": true,
  "devices": [
    { "id": "G1-01", "deviceIp": "192.168.1.101", "status": "online", "lastHeartbeat": "2025-08-14T13:31:52Z" }
  ]
}
```

---

#### 6.1.4 `GET /operation/:deviceId` — Read current operation
**Response**
```json
{ "ok": true, "operation": "inservice_bidirect" }
```
If not set:
```json
{ "ok": true, "operation": null }
```

---

#### 6.1.5 `POST /operation/:deviceId` — Set a new operation
**Body**
```json
{ "operation": "inservice_entry" }
```
**Success (200)**
```json
{ "ok": true }
```
**Errors**
- **400** `invalid operation` — if not one of allowed values (see §6.2).

> **Note:** Server also persists *last in‑service* per device when the operation is one of `inservice_*` (see §6.1.10).

---

#### 6.1.6 `GET /time` *(alias:* `/sync-time`*)* — Server time for device sync
**Success (200)**
```json
{
  "ok": true,
  "nowUtc": "2025-08-15T14:56:34.123Z",
  "epochMs": 1765858594123,
  "tz": "Asia/Bangkok",
  "offsetMinutes": 420
}
```

---

#### 6.1.7 `GET /aisle-mode/:deviceId` — Read aisle mode
Returns the *current aisle mode* for a device.

**Success (200)**
```json
{ "ok": true, "aisleMode": 2 }
```
If not set:
```json
{ "ok": true, "aisleMode": null }
```

---

#### 6.1.8 `POST /aisle-mode/:deviceId` — Set aisle mode
**Body**
```json
{ "aisleMode": 0 }
```
**Success (200)**
```json
{ "ok": true }
```
**Errors**
- **400** `invalid aisleMode (0..3)` — value outside 0..3.

---

#### 6.1.9 `GET /inservice-last/:deviceId` — Read last in‑service op
Returns the last *in‑service* operation recorded for the device (or `null` if never set).

**Success (200)**
```json
{ "ok": true, "op": "inservice_bidirect" }
```

---

#### 6.1.10 `POST /inservice-last/:deviceId` — Set last in‑service op
Used by tooling to seed/override last in‑service operation.

**Body**
```json
{ "op": "inservice_entry" }
```
**Success (200)**
```json
{ "ok": true }
```

---

#### 6.1.11 `GET /inservice-last` — Read all last in‑service records
Returns an array of `{ id, op }` for devices that have a recorded last in‑service value.

**Success (200)**
```json
{ "ok": true, "items": [ { "id": "G1-01", "op": "inservice_exit" } ] }
```

---

### 6.2 Operations (Allowed Values)

The `operation` value controls the gate aisle behavior. Allowed strings:

| Operation             | Meaning / Expected Gate Behavior                                   |
|-----------------------|---------------------------------------------------------------------|
| `out_of_service`      | Gate shows OOS; readers disabled; flaps closed.                     |
| `inservice_entry`     | In‑service (Entry only). Readers enabled for entry; flaps closed.   |
| `inservice_exit`      | In‑service (Exit only). Readers enabled for exit; flaps closed.     |
| `inservice_bidirect`  | In‑service (Bi‑directional). Readers both sides; flaps closed.      |
| `station_close`       | Station close mode (administrative close).                          |
| `emergency`           | Emergency mode (flaps open / evacuation behavior).                  |

> The Station App validates input against this enum. See §6.1.5 for error semantics.

---

### 6.3 Aisle Mode (Allowed Values)

| Value | Label (English)                                   |
|------:|---------------------------------------------------|
| 0     | 0 — Normally closed, no flap restriction          |
| 1     | 1 — Normally open                                 |
| 2     | 2 — Normally closed, left flap only               |
| 3     | 3 — Normally closed, right flap only              |

---

## 7. Security & Hardening
- **Principle of least privilege:** restrict firewall to required ports and IPs.
- **Authentication:**
  - Heartbeat endpoints may be **IP‑allowlisted** per gate plan.
  - Optional shared secret or mTLS can be added in future phases.
- **SSH access:** key‑based; rotate keys; disable password login where possible.
- **Monitoring:** log **denies** and repeated failures; alert on stale devices.
- **Time integrity:** alarms when SC↔NTP drift > configurable threshold (e.g., 2s).

---

## 8. BEM Confirmation Checklist

> “List Table of BEM confirm” — Items for Bangkok Expressway and Metro (BEM) review/approval.

| # | Item | Description | Owner | Due | Accepted (Y/N) | Notes |
|--:|------|-------------|:-----:|:---:|:--------------:|-------|
| 1 | IP Plan | Static IPs for all gates; SC fixed/reserved IP | Ops |  |  |  |
| 2 | Ports | 3070/TCP ingress to SC; 22/TCP egress to gates | NetSec |  |  |  |
| 3 | Firewall | Default‑deny with allowlist for gate IPs | NetSec |  |  |  |
| 4 | NTP | Common NTP source for SC and gates | Ops |  |  |  |
| 5 | DNS (optional) | SC hostname mapping (A‑record) | NetOps |  |  |  |
| 6 | Time Policy | SC local TZ logs; gates send UTC `ts` | Ops |  |  |  |
| 7 | Retention | Log retention **≥14 days**, rotation daily | Ops |  |  |  |
| 8 | SSH Policy | Key‑based access; audit and rotation | SecOps |  |  |  |
| 9 | Remote Support | VNC/RDP usage policy and approval | BEM |  |  |  |
| 10 | Change Mgmt | Procedure for operation & mode enum updates | PMO |  |  |  |

---

## Appendix A — cURL Examples

### A.1 POST /hb (single heartbeat)
```bash
curl -sS -X POST "http://{station_ip}:{heartbeat_port}/hb" \
  -H "Content-Type: application/json" \
  -d '{
    "id":"G1-01",
    "ip":"192.168.1.101",
    "status":"online",
    "ts":"'"'"$(date -u +%FT%TZ)"'"'"
  }'
```

### A.2 POST /hb/bulk
```bash
curl -sS -X POST "http://{station_ip}:{heartbeat_port}/hb/bulk" \
  -H "Content-Type: application/json" \
  -d '[
    {"id":"G1-01","ip":"192.168.1.101","status":"online","ts":"2025-08-14T13:31:52Z"},
    {"id":"G1-02","ip":"192.168.1.102","status":"maintenance","ts":"2025-08-14T13:32:10Z"},
    {"id":"G1-03","ip":"192.168.1.103","status":"fault","ts":"2025-08-14T13:32:25Z"}
  ]'
```

### A.3 GET /hb (snapshot)
```bash
curl -sS "http://{station_ip}:{heartbeat_port}/hb"
```

### A.4 GET /operation/:deviceId
```bash
curl -sS "http://{station_ip}:{heartbeat_port}/operation/G1-01"
```

### A.5 POST /operation/:deviceId
```bash
curl -sS -X POST "http://{station_ip}:{heartbeat_port}/operation/G1-01" \
  -H "Content-Type: application/json" \
  -d '{"operation":"inservice_entry"}'
```

### A.6 GET /time (alias /sync-time)
```bash
curl -sS "http://{station_ip}:{heartbeat_port}/time"
# or
curl -sS "http://{station_ip}:{heartbeat_port}/sync-time"
```

### A.7 GET /aisle-mode/:deviceId
```bash
curl -sS "http://{station_ip}:{heartbeat_port}/aisle-mode/G1-01"
```

### A.8 POST /aisle-mode/:deviceId
```bash
curl -sS -X POST "http://{station_ip}:{heartbeat_port}/aisle-mode/G1-01" \
  -H "Content-Type: application/json" \
  -d '{"aisleMode":2}'
```

### A.9 GET /inservice-last/:deviceId
```bash
curl -sS "http://{station_ip}:{heartbeat_port}/inservice-last/G1-01"
```

### A.10 POST /inservice-last/:deviceId
```bash
curl -sS -X POST "http://{station_ip}:{heartbeat_port}/inservice-last/G1-01" \
  -H "Content-Type: application/json" \
  -d '{"op":"inservice_bidirect"}'
```

### A.11 GET /inservice-last (all)
```bash
curl -sS "http://{station_ip}:{heartbeat_port}/inservice-last"
```

---

## Appendix B — Sample Payloads

### B.1 Snapshot Response (excerpt)
```json
{
  "ok": true,
  "devices": [
    {
      "id": "G1-01",
      "deviceIp": "192.168.1.101",
      "status": "online",
      "lastHeartbeat": "2025-08-14T13:31:52Z"
    }
  ]
}
```

### B.2 Time Response
```json
{
  "ok": true,
  "nowUtc": "2025-08-15T14:56:34.123Z",
  "epochMs": 1765858594123,
  "tz": "Asia/Bangkok",
  "offsetMinutes": 420
}
```

---

## Appendix C — Error Codes & Responses

| HTTP | Code / Message               | Cause                                  | Action |
|-----:|-------------------------------|----------------------------------------|--------|
| 400  | `invalid operation`           | Unsupported `operation` value           | Validate against §6.2 enum |
| 400  | `invalid aisleMode (0..3)`    | Aisle mode outside allowed range        | Send integer 0..3 |
| 400  | `bad request`                 | Missing required heartbeat fields       | Check schema in §6.0.1 |
| 401  | `unauthorized` (optional)     | Authn required (if enabled)             | Provide credentials/token |
| 429  | `rate limited`                | Excessive request rate                  | Backoff and retry |
| 500  | `internal error`              | Server fault                            | Check server logs |

---

## Appendix D — Glossary
- **SC** — Station Computer
- **HB** — Heartbeat
- **NTP** — Network Time Protocol
- **BEM** — Bangkok Expressway and Metro
- **OOS** — Out of Service

---

## Appendix E — Reference `config.json` (Station: SamYan / สามย่าน)

> Deployed configuration provided by operations for Station ID **"13"**. Ensure paths and ports reflect the target host.

```json
{
  "databasePath": "./database/app.sqlite",
  "logsPath": "/Users/wrung/Projects/sc-emv-gate/logs",
  "logLevel": "info",
  "logsRetentionDays": 14,
  "environment": "development",
  "fullScreen": false,
  "deviceCommunicationPath": "/Users/wrung/Projects/sc-emv-gate/data",
  "stationIp": "192.168.1.100",
  "stationName": {
    "en": "SamYan",
    "th": "สามย่าน"
  },
  "stationId": "13",
  "heartbeatPort": 3070,
  "deviceProbePort": 2222
}
```

**Operational Notes**
- If `deviceProbePort` (2222) is used for SSH or a custom probe, **allow SC egress** to gate IPs on that port and update §3.5 firewall rules accordingly.
- Consider adding `time.tz` (IANA timezone, e.g., `Asia/Bangkok`) to ensure consistent time reporting across services.
- Ensure `logsPath` exists and the service user has write permissions; log rotation honours `logsRetentionDays` (=14).
- `environment` is set to `development`; for production rollout, switch to `"production"` and move `config.json` to the app **userData** directory per §5.
- (Optional) Define a `devices` array with `{ id, ip, gateId, side, type }` to pre‑seed known endpoints in UI.
