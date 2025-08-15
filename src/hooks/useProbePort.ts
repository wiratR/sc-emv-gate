import { useEffect, useState } from "react";

export default function useProbePort(defaultPort = 22) {
  const [port, setPort] = useState<number>(defaultPort);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await window.api?.getConfig?.();
        const port = res?.ok ? res.config.deviceProbePort ?? 22 : 22;
        if (mounted && res?.ok) {
          setPort(res.config.deviceProbePort ?? defaultPort);
        }
      } catch {}
    })();

    // ถ้าระบบคุณ broadcast การเปลี่ยน config
    const off = window.config?.onChanged?.((cfg) => {
      setPort(cfg.deviceProbePort ?? defaultPort);
    });
    return () => {
      mounted = false;
      off && off();
    };
  }, [defaultPort]);

  return port;
}
