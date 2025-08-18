# EMV Gate — Device Interface

**Version:** 1.0  
**Updated:** 20250817-174601Z (UTC)

This document describes the HTTP interface used by an EMV gate *device* to integrate with the **Station App** (Electron).  
It covers: Heartbeats, reading current operation, and setting a new operation.

---

## Base URL

```
http://{station_ip}:{heartbeat_port}
```
- Default `station_ip`: `127.0.0.1` (for local tests)
- Default `heartbeat_port`: `3070` (configurable in Station App)

---

## Data Types

### Device Heartbeat
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
- `status`: `online` | `maintenance` | `fault`
- `ts`: ISO8601 UTC timestamp. If omitted, server will set current time.

### Operation
```
"inservice_entry" | "inservice_exit" | "inservice_bidirect" |
"out_of_service"  | "station_close"  | "emergency"
```

---

## Endpoints

### 1) POST `/hb` — Send a heartbeat
**Body:** Device Heartbeat (JSON)  
**Response:**
```json
{ "ok": true }
```
**Notes**
- Recommended interval: 5–10 seconds.
- Use exponential backoff on network errors.
- Station will record `lastHeartbeat` per device.

**cURL**
```bash
curl -sS -X POST "http://{station_ip}:{heartbeat_port}/hb"   -H "Content-Type: application/json"   -d '{"id":"G1-01","ip":"192.168.1.101","status":"online","ts":"$(date -u +%FT%TZ)"}'
```

---

### 2) POST `/hb/bulk` — Send multiple heartbeats
**Body:** JSON array of Device Heartbeat
**Response:**
```json
{ "ok": true, "count": 3 }
```

**Example**
```bash
curl -sS -X POST "http://{station_ip}:{heartbeat_port}/hb/bulk"   -H "Content-Type: application/json"   -d '[
    {"id":"G1-01","ip":"192.168.1.101","status":"online","ts":"2025-08-14T13:31:52Z"},
    {"id":"G1-02","ip":"192.168.1.102","status":"maintenance","ts":"2025-08-14T13:32:10Z"},
    {"id":"G1-03","ip":"192.168.1.103","status":"fault","ts":"2025-08-14T13:32:25Z"}
  ]'
```

---

### 3) GET `/hb` — Inspect server snapshot (diagnostic)
Returns the Station App's current snapshot, including `lastHeartbeat`.
**Response (excerpt):**
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

---

### 4) GET `/operation/:deviceId` — Read current operation
**Response:**
```json
{ "ok": true, "operation": "inservice_bidirect" }
```
- If not set yet: `"operation": null`

**cURL**
```bash
curl -sS "http://{station_ip}:{heartbeat_port}/operation/G1-01"
```

---

### 5) POST `/operation/:deviceId` — Set a new operation
**Body:**
```json
{ "operation": "inservice_entry" }
```
**Response:**
```json
{ "ok": true }
```
**Errors**
- `400 invalid operation` if the string is not one of the allowed values.

**cURL**
```bash
curl -sS -X POST "http://{station_ip}:{heartbeat_port}/operation/G1-01"   -H "Content-Type: application/json"   -d '{"operation":"inservice_entry"}'
```

---

## Technical Requirements

- **Protocol**: HTTP/1.1 over TCP. Plain HTTP in LAN; HTTPS/TLS optional if terminated by a reverse proxy.
- **Encoding**: UTF-8, `Content-Type: application/json`.
- **Clocks**: Gate devices should keep reasonably accurate time (±2 minutes). Prefer UTC timestamps.
- **Heartbeat cadence**: 5–10 seconds. If offline, retry with backoff (2s → 4s → 8s up to 60s).
- **Failure handling**: If `/hb` fails, buffer the last payload and send at next opportunity with current `ts`.
- **IDs**: `id` must be unique per physical gate device.
- **Operations**: Set operations only when the device is online. The UI may restrict commands if not online.
- **Config knobs** (Station App):
  - `heartbeatPort` (default 3070)
  - `deviceProbePort` (default 22 or 2222 for testing)
- **Security** (optional hardening):
  - IP whitelisting at Station.
  - Shared secret header (e.g., `X-Station-Key`) agreed in deployment.
  - Network ACL/VLAN separation.
- **Observability**:
  - Station logs requests and keeps a JSON store with the latest heartbeats.
  - Devices should log their `/hb` success/failure and last response code.

---

## Negative Cases

- Missing `id` → `400 id required`
- Non-JSON or invalid JSON → `400 invalid json`
- Invalid `operation` value → `400 invalid operation`

---

## Quick Test (with environment variables)

```bash
STATION=127.0.0.1
PORT=3070
DEV=G1-01

curl -sS "http://$STATION:$PORT/operation/$DEV"
curl -sS -X POST "http://$STATION:$PORT/operation/$DEV" -H "Content-Type: application/json" -d '{"operation":"emergency"}'
curl -sS -X POST "http://$STATION:$PORT/hb" -H "Content-Type: application/json" -d '{"id":"'$DEV'","ip":"192.168.1.101","status":"online","ts":"'$(date -u +%FT%TZ)'"}'
```
