// src/i18n/translations.ts
export type Lang = "th" | "en";

export const translations: Record<Lang, Record<string, string>> = {
  th: {
    login_title: "เข้าสู่ระบบ",
    username: "ชื่อผู้ใช้",
    password: "รหัสผ่าน",
    username_placeholder: "admin",
    password_placeholder: "1234",
    login: "เข้าสู่ระบบ",
    signing_in: "กำลังเข้าสู่ระบบ...",
    invalid_credentials: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (ลองรหัส 1234)",
    change_lang: "EN",
  },
  en: {
    login_title: "Login",
    username: "Username",
    password: "Password",
    username_placeholder: "admin",
    password_placeholder: "1234",
    login: "Login",
    signing_in: "Signing in...",
    invalid_credentials: "Invalid username or password (try 1234)",
    change_lang: "TH",
  },
};

export function t(lang: Lang, key: string) {
  return translations[lang][key] || key;
}
