import net from "net";

/** ลองต่อ TCP ไปยัง host:port ภายใน timeoutMs */
export function probeTcp(host: string, port = 22, timeoutMs = 1200): Promise<{ ok: true; reachable: boolean; rttMs: number }> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const start = Date.now();
    let settled = false;

    const done = (reachable: boolean) => {
      if (settled) return;
      settled = true;
      try { socket.destroy(); } catch {}
      resolve({ ok: true, reachable, rttMs: Date.now() - start });
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error",   () => done(false));
    socket.connect(port, host);
  });
}
