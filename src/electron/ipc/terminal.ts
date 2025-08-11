// src/electron/ipc/terminal.ts

import { WebContents, ipcMain } from "electron";
import pty, { IPty } from "node-pty";

import os from "os";
import { randomUUID } from "crypto";

type Session = { pty: IPty; wc: WebContents };
const sessions = new Map<string, Session>();

export function setupTerminalIPC() {
  // create terminal (ssh optional)
  ipcMain.handle("terminal:create", (e, opts?: { sshHost?: string; cols?: number; rows?: number; cwd?: string }) => {
    const cols = opts?.cols ?? 80;
    const rows = opts?.rows ?? 24;
    const cwd  = opts?.cwd  ?? os.homedir();

    // shell / ssh command
    const isWin = process.platform === "win32";
    let cmd = isWin ? (opts?.sshHost ? "ssh" : "powershell.exe") : (opts?.sshHost ? "ssh" : process.env.SHELL || "bash");
    let args: string[] = [];
    if (opts?.sshHost) args = [opts.sshHost];

    const p = pty.spawn(cmd, args, {
      name: "xterm-256color",
      cols, rows, cwd,
      env: { ...process.env, TERM: "xterm-256color" },
    });

    const id = randomUUID();
    sessions.set(id, { pty: p, wc: e.sender });

    p.onData((data) => {
      const s = sessions.get(id);
      if (s) s.wc.send(`terminal:data:${id}`, data);
    });
    p.onExit(() => {
      const s = sessions.get(id);
      if (s) s.wc.send(`terminal:exit:${id}`);
      sessions.delete(id);
    });

    return { ok: true, id };
  });

  ipcMain.on("terminal:write", (_e, id: string, data: string) => {
    sessions.get(id)?.pty.write(data);
  });

  ipcMain.on("terminal:resize", (_e, id: string, cols: number, rows: number) => {
    sessions.get(id)?.pty.resize(cols, rows);
  });

  ipcMain.handle("terminal:kill", (_e, id: string) => {
    const s = sessions.get(id);
    if (!s) return { ok: false, error: "not-found" };
    try { s.pty.kill(); } catch {}
    sessions.delete(id);
    return { ok: true };
  });
}
