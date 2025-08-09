# 🚪 SC-EMV-Gate

ระบบ Electron + React + Vite + TypeScript สำหรับควบคุมและจัดการ **EMV Gate**  
รองรับการ Login, เปลี่ยนภาษา (TH/EN), และการรันทั้ง **Web** และ **Electron App**

---

## 📂 โครงสร้างโปรเจ็กต์
```bash
sc-emv-gate/
├── src/
│ ├── assets/ # ไฟล์โลโก้, ไอคอน, รูปภาพ
│ ├── auth/ # ระบบ AuthContext และการจัดการผู้ใช้
│ ├── components/ # UI Components (เช่น ปุ่มเปลี่ยนภาษา)
│ ├── electron/ # main.ts, preload.ts สำหรับ Electron
│ ├── i18n/ # ระบบแปลภาษา (translations, I18nProvider)
│ ├── pages/ # หน้าจอ (Login, Home, ฯลฯ)
│ └── main.tsx # Entry React App
├── public/ # ไฟล์ Static
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## ⚙️ ติดตั้ง

```bash
# 1. Clone โปรเจ็กต์
git clone https://github.com/your-repo/sc-emv-gate.git
cd sc-emv-gate

# 2. ติดตั้ง dependencies
npm install

```
📌 หมายเหตุ: ต้องมี Node.js (>=18) และ npm ติดตั้งก่อน

▶️ รันโหมดพัฒนา
รัน Electron + React พร้อมกัน

```bash
npm run dev
```

รันเฉพาะเว็บ (Vite)

```bash
npm run dev:web
```

แล้วเปิด http://localhost:5173 ใน browser

🏗 Build สำหรับ Production
```bash
# Build React
npm run build

# Build Electron App
npm run build:electron
```

ไฟล์ Output จะอยู่ในโฟลเดอร์ dist/ และ dist-electron/

🌐 ระบบเปลี่ยนภาษา (I18n)
รองรับ ไทย (TH) และ อังกฤษ (EN)

มีปุ่ม 🌐 มุมขวาบนของฟอร์ม Login

ภาษาที่เลือกจะถูกเก็บใน localStorage (app_lang)

🖼 โลโก้
โลโก้อยู่ใน src/assets/logo.svg และถูกแสดงในหน้า Login

💻 เทคโนโลยีที่ใช้
Electron – ทำ Desktop App

React 18 + Vite – UI และการทำงานฝั่ง Frontend

TypeScript – Static typing

Tailwind CSS – จัดการ CSS

React Router – จัดการ Routing

i18n Custom Hook – แปลภาษา

👨‍💻 ผู้พัฒนา

Wirat Rungjaroinsombut

