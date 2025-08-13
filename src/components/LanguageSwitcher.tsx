// src/components/LanguageSwitcher.tsx

import { useEffect, useRef, useState } from "react";

import flagGB from "@/assets/flags/gb.svg";
import flagTH from "@/assets/flags/th.svg";
import { useI18n } from "@/i18n/I18nProvider";

export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ddRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ddRef.current) return;
      if (!ddRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const currentFlag = lang === "th" ? flagTH : flagGB;

  const pick = (code: "th" | "en") => {
    setLang(code);
    setOpen(false);
    btnRef.current?.focus();
  };

  return (
    <div ref={ddRef} className={`relative ${className}`}>
      {/* ปุ่มแบบ on-dark */}
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(v => !v);
          }
        }}
        className="flex items-center justify-center w-10 h-10 rounded-full border border-white/30 bg-white/0 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
        aria-haspopup="listbox"
        aria-expanded={open}
        title={lang === "th" ? "ภาษาไทย" : "English"}
      >
        <img src={currentFlag} alt={lang} className="w-5 h-5 rounded-full" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-700 bg-slate-900 text-white shadow-xl overflow-hidden z-10"
        >
          <button
            type="button"
            onClick={() => pick("th")}
            role="option"
            aria-selected={lang === "th"}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-800 ${
              lang === "th" ? "bg-slate-800" : ""
            }`}
          >
            <img src={flagTH} alt="TH" className="w-5 h-5 rounded-full" />
            <span>ไทย (TH)</span>
          </button>

          <button
            type="button"
            onClick={() => pick("en")}
            role="option"
            aria-selected={lang === "en"}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-800 ${
              lang === "en" ? "bg-slate-800" : ""
            }`}
          >
            <img src={flagGB} alt="EN" className="w-5 h-5 rounded-full" />
            <span>English (EN)</span>
          </button>
        </div>
      )}
    </div>
  );
}
