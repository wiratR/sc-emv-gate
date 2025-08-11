// src/components/Header.tsx
import { useEffect, useState } from "react";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { StationName } from "@/electron/config";
import logoUrl from "@/assets/logo.svg";
import { useAuth } from "@/auth/AuthContext";
import { useI18n } from "@/i18n/I18nProvider";

type Props = { showStationInfo?: boolean };

export default function Header({ showStationInfo = true }: Props) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const { lang } = useI18n();

  const [stationName, setStationName] = useState<StationName | undefined>();
  const [stationId, setStationId] = useState("");
  const [stationIp, setStationIp] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cfg = await window.api?.getConfig?.();
        if (alive && cfg?.ok) {
          setStationName(cfg.config.stationName ?? "");
          setStationId(cfg.config.stationId ?? "");
          setStationIp(cfg.config.stationIp ?? "");
        }        
      } catch (e) {
        window.logger?.warn?.("[header] load config failed", String(e));
      }
    })();
    return () => { alive = false; };
  }, []);


  // เลือกชื่อสถานีตามภาษา
  const stationLabel =
    typeof stationName === "string"
      ? stationName
      : (stationName?.[lang] ?? stationName?.en ?? stationName?.th ?? "");

  return (
    <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
      <div className="mx-auto max-w-7xl px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Logo + Title */}
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Logo" className="w-10 h-10" draggable={false} />
            <div>
              <div className="text-base font-semibold">{t("app_title")}</div>
              <div className="text-xs text-gray-500">{t("app_subtitle")}</div>
            </div>
          </div>

          {/* Center: Station Info (เฉพาะค่าตัวหนาตามที่ขอ) */}
          {showStationInfo && (
            <div className="text-center">
              <div className="font-semibold">
                {stationLabel || "-"} {stationId ? `(ID: ${stationId})` : ""}
              </div>
              <div className="font-semibold">{stationIp || "-"}</div>
            </div>
          )}

          {/* Right: user + language + logout */}
          <div className="flex items-center gap-3">
            <div className="text-sm text-right">
              <div className="font-semibold">{user?.username || "Guest"}</div>
              <div className="text-xs text-gray-500">{user?.role?.toUpperCase?.() || ""}</div>
            </div>
            <LanguageSwitcher />
            <button
              onClick={logout}
              className="px-3 py-1 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600"
            >
              {t("logout")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
