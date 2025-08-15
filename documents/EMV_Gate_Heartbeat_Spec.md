# Heartbeat (HB) Spec — สำหรับอุปกรณ์ EMV Gate

อัปเดตล่าสุด: **2025-08-15T01:24:44Z UTC**


## ภาพรวม
- อุปกรณ์ส่ง HTTP `POST /hb` มายังเครื่องที่รันแอป (เครื่อง Operator)
- พอร์ตอ่านจาก **config.json** ของแอป (ค่าแนะนำ: `3070`)
- Payload เป็น JSON ระบุ `id`, `ip`, `status`, `ts`, (`message` ไม่บังคับ)
- แอปจะอัปเดตไฟล์อุปกรณ์ (**device-communication.json**) แล้วฝั่ง UI จะรีเฟรชอัตโนมัติ
- UI ใช้ *Effective Status* ซึ่งรวม HB + TCP Probe เพื่อแยก `online / stale / offline / fault / maintenance`

---

## พอร์ตและไฟล์ที่เกี่ยวข้อง
- **config.json**
  - `deviceCommunicationPath`: โฟลเดอร์หรือไฟล์สำหรับเก็บรายการอุปกรณ์  
    (ถ้าเป็นโฟลเดอร์ แอปจะใช้ `<path>/device-communication.json`)
  - `heartbeatPort`: พอร์ต HTTP สำหรับรับ HB (เช่น `3070`)
- **device-communication.json**: ต้องเป็น **Array** ของอุปกรณ์ (`[]` ตอนเริ่มต้นก็ได้)

ตัวอย่างโครงไฟล์ที่ถูกต้อง (ต้องเป็น Array):
```json
[
  {
    "id": "G1-01",
    "name": "Entry Reader 01",
    "side": "north",
    "gateId": "G1",
    "deviceIp": "192.168.1.101",
    "status": "online",
    "lastHeartbeat": "2025-08-14T13:31:52Z",
    "message": ""
  }
]
```

---

## Endpoint

```
POST http://<HOST>:<PORT>/hb
Content-Type: application/json
```

### Request Body (JSON)
```json
{
  "id": "G1-01",
  "ip": "192.168.1.101",
  "status": "online",
  "ts": "2025-08-14T13:31:52Z",
  "message": "optional note"
}
```
- `id` *(required)*: รหัสอุปกรณ์ (ต้องสอดคล้องกับรายการในไฟล์)
- `ip` *(recommended)*: IP ของอุปกรณ์
- `status` *(required)*: `online | offline | fault | maintenance`
- `ts` *(required)*: เวลา ISO-8601 (UTC แนะนำ) — UI จะคำนวณ “xx seconds/minutes ago” เอง
- `message` *(optional)*: ข้อความสั้น ๆ

### Response
```json
{ "ok": true }
```
หรือ
```json
{ "ok": false, "error": "reason" }
```

---

## Effective Status (กติกา UI)
- **stale**: หากไม่มี HB เกิน `staleMs` (ดีฟอลต์ **60,000 ms**)
- **offline**: หากไม่มี HB เกิน `offlineMs` (ดีฟอลต์ **300,000 ms** = 5 นาที)
- **fault**: พบว่า HB ระบุว่า online/stale แต่ TCP probe ไปยังพอร์ต (ดีฟอลต์ **22**) *ไม่ถึง* → เครื่องอยู่ไม่พร้อมใช้งาน
- **maintenance**: หาก `status` จากอุปกรณ์ส่งเป็น `maintenance` จะคงสถานะนี้ไว้โดยตรง

> สรุปตรรกะหลักแบบย่อ:  
> - HB=`online`, probe ไม่ถึง → **fault**  
> - HB=`stale`, probe ถึง → **online** (ชั่วคราว)  
> - HB=`offline`, probe ถึง → **fault**  
> - HB=`offline`, probe ไม่ถึง → **offline**

---

## ตัวอย่าง cURL (ทดสอบเร็ว)

> macOS/Linux:
```bash
# ส่ง ONLINE
curl -sS -X POST http://127.0.0.1:3070/hb   -H 'Content-Type: application/json'   -d '{"id":"G1-01","ip":"192.168.1.101","status":"online","ts":"'"'$(date -u +%FT%TZ)'"'"}'

# ส่ง FAULT พร้อมข้อความ
curl -sS -X POST http://127.0.0.1:3070/hb   -H 'Content-Type: application/json'   -d '{"id":"G1-01","ip":"192.168.1.101","status":"fault","message":"Reader error","ts":"'"'$(date -u +%FT%TZ)'"'"}'

# ส่ง OFFLINE
curl -sS -X POST http://127.0.0.1:3070/hb   -H 'Content-Type: application/json'   -d '{"id":"G1-01","ip":"192.168.1.101","status":"offline","ts":"'"'$(date -u +%FT%TZ)'"'"}'
```

> Windows PowerShell:
```powershell
$now = Get-Date -AsUTC -Format s; $now = "$now`Z"
curl.exe -sS -X POST http://127.0.0.1:3070/hb -H "Content-Type: application/json" -d "{`"id`":`"G1-01`",`"ip`":`"192.168.1.101`",`"status`":`"online`",`"ts`":`"$now`"}"
```

---

## Postman
- Collection: **EMV Gate HB — Collection**
- Environment: **EMV Gate HB — Local**
- ตัวแปรหลัก:  
  - `host` (เช่น `127.0.0.1`), `port` (เช่น `3070`)  
  - `device_id` (เช่น `G1-01`), `device_ip` (เช่น `192.168.1.101`)

> ดาวน์โหลดไฟล์สำหรับนำเข้า Postman:
> - Collection: `postman_emv_gate_hb_collection.json`  
> - Environment: `postman_emv_gate_hb_environment.json`

### คำขอใน Collection
1) **HB — online**  
2) **HB — fault**  
3) **HB — offline**  

แต่ละคำขอใช้ `{{$isoTimestamp}}` ในฟิลด์ `ts`

---

## Manual Network Checks (ช่วย Debug)
- ตรวจ TCP port 22:
```bash
nc -vz -w 2 192.168.1.101 22 ; echo $?
# ... succeeded!  => exit code 0
```
- ลอง SSH (ไม่ต้องล็อกอินสำเร็จ แค่เชื่อมต่อได้):
```bash
ssh -o ConnectTimeout=2 -o BatchMode=yes -p 22 user@192.168.1.101 exit
# Permission denied (publickey,password). <= โอเค แปลว่าพอร์ตเปิดและปลายทางตอบ
```

---

## Troubleshooting
- ขึ้นเตือน **"parsed JSON is not array"** → แก้ไฟล์ `device-communication.json` ให้เป็น **Array** ไม่ใช่ `{ "devices": [...] }`
- HB ไม่เข้า → ตรวจพอร์ตจาก `config.json` และไฟร์วอลล์
- UI สถานะ “ไม่ตรง” → จำไว้ว่ามี Effective Status (HB + TCP Probe)
- Probe มัก *unreachable* → เปิดพอร์ต 22 บนอุปกรณ์ เพื่อช่วยแยก `fault` ออกจาก `offline`

---

## สรุป
- ส่ง HB ที่ `POST /hb` เป็นประจำ, ใส่เวลาปัจจุบันแบบ ISO-8601 (UTC)
- ฝั่ง UI จะตีความร่วมกับ TCP probe ให้สถานะมีความแม่นยำขึ้น
- ใช้ Postman/คำสั่ง cURL ข้างต้นเพื่อทดสอบได้ทันที
