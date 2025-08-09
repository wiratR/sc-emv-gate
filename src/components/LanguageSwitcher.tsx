// src/components/LanguageSwitcher.tsx
import { useEffect, useRef, useState } from "react";

import flagGB from "@/assets/flags/gb.svg";
import flagTH from "@/assets/flags/th.svg";
import { useI18n } from "@/i18n/I18nProvider";

export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ddRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ddRef.current) return;
      if (!ddRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const currentFlag = lang === "th" ? flagTH : flagGB;

  return (
    <div ref={ddRef} className={`relative ${className}`}>
      {/* ปุ่ม (โชว์เฉพาะธง) */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-center w-10 h-10 rounded-full border hover:bg-gray-50"
        aria-haspopup="listbox"
        aria-expanded={open}
        title={lang === "th" ? "ภาษาไทย" : "English"}
      >
        <img src={currentFlag} alt={lang} className="w-5 h-5 rounded-full" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-36 rounded-xl border bg-white shadow-lg overflow-hidden z-10"
        >
          <button
            type="button"
            onClick={() => { setLang("th"); setOpen(false); }}
            role="option"
            aria-selected={lang === "th"}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left"
          >
            <img src={flagTH} alt="TH" className="w-5 h-5 rounded-full" />
            <span>ไทย (TH)</span>
          </button>
          <button
            type="button"
            onClick={() => { setLang("en"); setOpen(false); }}
            role="option"
            aria-selected={lang === "en"}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left"
          >
            <img src={flagGB} alt="EN" className="w-5 h-5 rounded-full" />
            <span>English (EN)</span>
          </button>
        </div>
      )}
    </div>
  );
}
