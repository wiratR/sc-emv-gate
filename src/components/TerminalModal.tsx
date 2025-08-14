// src/components/TerminalModal.tsx
import "@xterm/xterm/css/xterm.css";

import { useEffect, useRef, useState } from "react";

import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  open: boolean;
  sshHost?: string;   // เช่น device.deviceIp
  title?: string;
  onClose: () => void;
};

export default function TerminalModal({ open, sshHost, title, onClose }: Props) {
  const { t } = useI18n();
  const wrapRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef  = useRef<FitAddon | null>(null);
  const [termId, setTermId] = useState<string | null>(null);

  // เก็บ handler ไว้เพื่อนำไป off ตอน cleanup
  const dataHandlerRef = useRef<((_e: any, p: { id: string; data: string }) => void) | null>(null);
  const exitHandlerRef = useRef<((_e: any, p: { id: string; exitCode?: number; signal?: number }) => void) | null>(null);

  useEffect(() => {
    if (!open) return;

    let disposed = false;
    let currentId: string | null = null;

    // init xterm
    const term = new Terminal({
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      fontSize: 13,
      cursorBlink: true,
      convertEol: true,
      theme: {
        background: "#000000",
        foreground: "#e5e7eb",
        cursor: "#ffffff",
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    termRef.current = term;
    fitRef.current = fit;

    // mount
    if (wrapRef.current) {
      term.open(wrapRef.current);
      try { fit.fit(); } catch {}
    }

    // helper: cleanup ทั้ง session/handler/xterm
    const cleanup = async () => {
      // off listeners
      if (dataHandlerRef.current) window.terminal?.offData(dataHandlerRef.current);
      if (exitHandlerRef.current) window.terminal?.offExit(exitHandlerRef.current);
      dataHandlerRef.current = null;
      exitHandlerRef.current = null;

      // kill session
      if (currentId) {
        try { await window.terminal?.kill(currentId); } catch {}
      }
      setTermId(null);

      // dispose xterm
      try { termRef.current?.dispose(); } catch {}
      termRef.current = null;
      fitRef.current = null;
    };

    (async () => {
      // ขนาดเริ่มต้น
      if (wrapRef.current) {
        const cw = Math.max(300, wrapRef.current.clientWidth);
        const ch = Math.max(200, wrapRef.current.clientHeight);
        // ค่าประมาณ — fit() จะปรับอีกที
        term.resize(Math.floor(cw / 9), Math.floor(ch / 18));
      }

      // สร้าง session (ssh หรือ shell)
      const res = await window.terminal?.create({ sshHost, cols: term.cols, rows: term.rows });
      if (!res?.ok || !res.id) {
        term.writeln(`\r\n\x1b[31m${t("failed_to_start_terminal")}\x1b[0m`);
        return;
      }
      if (disposed) {
        await window.terminal?.kill(res.id);
        return;
      }
      currentId = res.id;
      setTermId(res.id);

      // ⌨️ ส่งข้อมูลจาก xterm → pty
      const disp = term.onData((d) => {
        if (currentId) window.terminal?.write(currentId, d);
      });

      // 🔁 resize เมื่อกล่องเปลี่ยนขนาด
      const onResize = () => {
        try { fit.fit(); } catch {}
        if (currentId) window.terminal?.resize(currentId, term.cols, term.rows);
      };
      const ro = new ResizeObserver(onResize);
      if (wrapRef.current) ro.observe(wrapRef.current);

      // 📥 data จาก pty → xterm (ฟังทุก session แล้วกรองด้วย id)
      const onData = (_e: any, p: { id: string; data: string }) => {
        if (p.id !== currentId) return;
        term.write(p.data);
      };
      const onExit = async (_e: any, p: { id: string; exitCode?: number }) => {
        if (p.id !== currentId) return;
        term.writeln(`\r\n\x1b[33m[${t("process_exited")} ${p.exitCode ?? 0}]\x1b[0m`);
        try { await window.terminal?.kill(p.id); } catch {}
        setTermId(null);
      };
      dataHandlerRef.current = onData;
      exitHandlerRef.current = onExit;
      window.terminal?.onData(onData);
      window.terminal?.onExit(onExit);

      // unmount cleanup เฉพาะส่วนที่สร้างใน IIFE นี้
      const iifeCleanup = async () => {
        disp.dispose();
        ro.disconnect();
        await cleanup();
      };

      // เก็บฟังก์ชันไว้ใน effect cleanup
      (cleanup as any)._iife = iifeCleanup as () => Promise<void>;
    })();

    return () => {
      disposed = true;
      const c = (cleanup as any)._iife as undefined | (() => Promise<void>);
      if (c) { void c(); }
      else { void cleanup(); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sshHost]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3">
      <div className="w-full sm:max-w-3xl bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold">
            {title ?? t("console_title")}{sshHost ? ` — ${sshHost}` : ""}
          </div>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">
            {t("close")}
          </button>
        </div>

        <div className="p-3">
          {/* กล่องเทอร์มินัล */}
          <div ref={wrapRef} className="h-[55vh] w-full rounded-lg border overflow-hidden bg-black" />
          <div className="mt-2 text-xs text-gray-500">
            {sshHost ? t("ssh_session") : t("local_shell")} — {t("terminate_hint")}
          </div>
        </div>
      </div>
    </div>
  );
}
