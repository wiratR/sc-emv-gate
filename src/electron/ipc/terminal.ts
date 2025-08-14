// ✅ ใช้ named import; ห้ามใช้ default import เพราะจะได้ undefined

import { IPty, spawn as ptySpawn } from "node-pty";
// src/electron/ipc/terminal.ts
import { WebContents, ipcMain } from "electron";

import os from "os";
import { randomUUID } from "crypto";

type Session = { id: string; pty: IPty; owner: WebContents };
const sessions = new Map<string, Session>();

function pickCommand(opts?: { sshHost?: string; shell?: string }) {
  // บังคับ shell จาก opts ถ้ามี
  if (opts?.shell) return { cmd: opts.shell, args: [] as string[] };

  const isWin = process.platform === "win32";
  if (opts?.sshHost) {
    // เปิด ssh ตรง ๆ
    return { cmd: "ssh", args: [opts.sshHost] as string[] };
  }

  if (isWin) {
    // ใช้ cmd.exe (หรือเปลี่ยนเป็น powershell.exe ได้ตามต้องการ)
    const cmd = process.env.COMSPEC || "cmd.exe";
    return { cmd, args: [] as string[] };
  }

  // POSIX: ใช้ login shell เพื่อโหลดโปรไฟล์
  const cmd = process.env.SHELL || "/bin/bash";
  return { cmd, args: ["-l"] as string[] };
}

export function setupTerminalIPC() {
  // create
  ipcMain.handle(
    "terminal:create",
    (
      e,
      opts: {
        sshHost?: string;
        cols?: number;
        rows?: number;
        cwd?: string;
        shell?: string;
        args?: string[]; // เผื่อ override เอง
      } = {}
    ) => {
      try {
        const cols = Math.max(10, opts.cols ?? 80);
        const rows = Math.max(5, opts.rows ?? 24);
        const cwd = opts.cwd || os.homedir();

        const picked = pickCommand({ sshHost: opts.sshHost, shell: opts.shell });
        const cmd = picked.cmd;
        const args = Array.isArray(opts.args) ? opts.args : picked.args;

        const p = ptySpawn(cmd, args, {
          name: "xterm-256color",
          cols,
          rows,
          cwd,
          env: { ...process.env, TERM: "xterm-256color" } as NodeJS.ProcessEnv,
        });

        const id = randomUUID();
        sessions.set(id, { id, pty: p, owner: e.sender });

        p.onData((data) => {
          const s = sessions.get(id);
          if (!s) return;
          // ส่งกลับเป็น payload เดียวกันเสมอ
          s.owner.send("terminal:data", { id, data });
        });

        p.onExit(({ exitCode, signal }) => {
          const s = sessions.get(id);
          try {
            s?.owner.send("terminal:exit", { id, exitCode, signal });
          } catch {}
          sessions.delete(id);
        });

        return { ok: true as const, id };
      } catch (err: any) {
        return { ok: false as const, error: String(err?.message || err) };
      }
    }
  );

  // write
  ipcMain.handle("terminal:write", (_e, payload: { id: string; data: string }) => {
    const s = sessions.get(payload?.id);
    if (!s) return { ok: false as const, error: "not-found" };
    try {
      s.pty.write(payload.data ?? "");
      return { ok: true as const };
    } catch (err: any) {
      return { ok: false as const, error: String(err?.message || err) };
    }
  });

  // resize
  ipcMain.handle("terminal:resize", (_e, payload: { id: string; cols: number; rows: number }) => {
    const s = sessions.get(payload?.id);
    if (!s) return { ok: false as const, error: "not-found" };
    try {
      const cols = Math.max(10, Number(payload.cols || 0));
      const rows = Math.max(5, Number(payload.rows || 0));
      s.pty.resize(cols, rows);
      return { ok: true as const };
    } catch (err: any) {
      return { ok: false as const, error: String(err?.message || err) };
    }
  });

  // kill
  ipcMain.handle("terminal:kill", (_e, payload: { id: string }) => {
    const s = sessions.get(payload?.id);
    if (!s) return { ok: false as const, error: "not-found" };
    try {
      s.pty.kill();
    } catch {}
    sessions.delete(payload.id);
    return { ok: true as const };
  });
}
