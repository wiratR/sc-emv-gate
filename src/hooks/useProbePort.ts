// src/hooks/useProbePort.ts

import { useEffect, useState } from "react";

export default function useProbePort(defaultPort = 22) {
  const [port, setPort] = useState<number>(defaultPort);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await window.api?.getConfig?.();
        const p = Number(res?.config?.deviceProbePort);
        if (mounted && p) setPort(p);
      } catch (e) {
        // เงียบไว้ ใช้ค่า default ไปก่อน
        window.logger?.debug?.("[probePort] read config failed", String(e));
      }
    })();
    return () => { mounted = false; };
  }, []);

  return port;
}
