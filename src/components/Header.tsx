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
  const { t, lang } = useI18n();

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

  const stationLabel =
    typeof stationName === "string"
      ? stationName
      : (stationName?.[lang] ?? stationName?.en ?? stationName?.th ?? "");

  return (
    <div className="sticky top-0 z-10 bg-sky-600 text-white border-b border-sky-700">
      {/* padding บน/ล่างให้โปร่งขึ้น */}
      <div className="mx-auto w-full px-6 pt-6 pb-2">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Logo + Title */}
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Logo" className="w-10 h-10" draggable={false} />
            <div>
              <div className="text-base font-semibold">{t("app_title")}</div>
              <div className="text-xs text-white/80">{t("app_subtitle")}</div>
            </div>
          </div>

          {/* Center: Station Info */}
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
              <div className="text-xs text-white/70">
                {user?.role?.toUpperCase?.() || ""}
              </div>
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
