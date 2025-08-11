//src/components/TerminalModal.tsx

import "xterm/css/xterm.css";

import { useEffect, useRef, useState } from "react";

import { FitAddon } from "xterm-addon-fit";
import { Terminal } from "xterm";

type Props = {
  open: boolean;
  sshHost?: string;       // เช่น device.deviceIp
  title?: string;
  onClose: () => void;
};

export default function TerminalModal({ open, sshHost, title = "Console", onClose }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef  = useRef<FitAddon | null>(null);
  const [termId, setTermId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    // init xterm
    const term = new Terminal({ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13, cursorBlink: true });
    const fit = new FitAddon();
    term.loadAddon(fit);
    termRef.current = term;
    fitRef.current = fit;

    // mount
    if (wrapRef.current) {
      term.open(wrapRef.current);
      fit.fit();
    }

    // create backend pty (ssh หรือ shell)
    (async () => {
      const res = await window.terminal?.create({ sshHost, cols: term.cols, rows: term.rows });
      if (!res?.ok || !res.id) {
        term.writeln("\r\n\x1b[31mFailed to start terminal\x1b[0m");
        return;
      }
      setTermId(res.id);

      const offData = window.terminal?.onData(res.id, (chunk) => term.write(chunk));
      const offExit = window.terminal?.onExit(res.id, () => term.writeln("\r\n\x1b[33m[process exited]\x1b[0m"));

      // pipe input → backend
      const disp = term.onData((d) => window.terminal?.write(res.id!, d));

      // handle resize
      const onResize = () => {
        try { fit.fit(); } catch {}
        window.terminal?.resize(res.id!, term.cols, term.rows);
      };
      const ro = new ResizeObserver(onResize);
      if (wrapRef.current) ro.observe(wrapRef.current);

      return () => {
        disp.dispose();
        offData && offData();
        offExit && offExit();
        ro.disconnect();
      };
    })();

    return () => {
      const id = termId;
      if (id) window.terminal?.kill(id);
      termRef.current?.dispose();
      termRef.current = null;
      fitRef.current = null;
      setTermId(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sshHost]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3">
      <div className="w-full sm:max-w-3xl bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold">{title}{sshHost ? ` — ${sshHost}` : ""}</div>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">Close</button>
        </div>

        <div className="p-3">
          {/* กล่องเทอร์มินัล */}
          <div ref={wrapRef} className="h-[55vh] w-full rounded-lg border overflow-hidden" />
          <div className="mt-2 text-xs text-gray-500">
            {sshHost ? "Interactive SSH session" : "Local shell"} — Ctrl+C/D to terminate.
          </div>
        </div>
      </div>
    </div>
  );
}
