// src/components/BulkOpsOnlineOnly.tsx
import { useEffect, useMemo, useRef, useState } from "react";

import type { Device } from "@/models/device";
import Dialog from "@/components/Dialog";
import type { Operation } from "@/models/operation";
import StatusModal from "@/components/StatusModal";
import { useI18n } from "@/i18n/I18nProvider";
import useProbePort from "@/hooks/useProbePort";

type Props = {
  devices: Device[];
  currentList: Device[];
  /** ถือว่า offline ถ้าหัวใจเต้นเกินกี่ ms (ดีฟอลต์ 5 นาที) */
  offlineMs?: number;
  className?: string;
};

type BulkScope = "tab" | "all";
type Variant = "info" | "success" | "error" | "confirm";

type ModalState = {
  open: boolean;
  variant: Variant;
  title: string;
  message: React.ReactNode;
};

type BulkOp = Extract<Operation, "station_close" | "emergency">;
type ApiResult = { ok: true } | { ok: false; error: string };

export default function BulkOpsOnlineOnly({
  devices,
  currentList,
  offlineMs = 300_000,
  className,
}: Props) {
  const { t } = useI18n();
  const probePort = useProbePort(22);

  const [scope, setScope] = useState<BulkScope>("tab");
  const [confirm, setConfirm] = useState<{ open: boolean; op: BulkOp | null }>({
    open: false,
    op: null,
  });
  const [busy, setBusy] = useState(false);
  const [m, setM] = useState<ModalState>({
    open: false,
    variant: "info",
    title: "",
    message: "",
  });

  // ===== Probe cache (id -> reachable?) =====
  const [probeMap, setProbeMap] = useState<Record<string, boolean>>({});
  const timerRef = useRef<number | null>(null);

  // ผู้สมัครเบื้องต้น: status === online + heartbeat ยังสด
  const prelimOnline = (d: Device) => {
    const st = String((d.status ?? "offline")).toLowerCase().trim();
    if (st !== "online") return false;

    const ts = d.lastHeartbeat ? Date.parse(String(d.lastHeartbeat)) : NaN;
    if (!Number.isFinite(ts)) return false;
    const age = Date.now() - ts;
    return age >= 0 && age < offlineMs;
  };

  // ทำ probe เป็นรอบๆ เฉพาะตัวที่ prelimOnline
  useEffect(() => {
    let alive = true;

    async function doProbeLoop() {
      if (!window.devices?.probe) return; // ถ้าไม่มี bridge ก็ข้าม (จะถือว่าทุกตัว reachable)

      const listBase = scope === "all" ? devices : currentList;
      const candidates = listBase.filter(prelimOnline);

      // เรียก probe พร้อมๆ กัน (เบาอยู่ เพราะเฉพาะตัวที่ online เท่านั้น)
      await Promise.all(
        candidates.map(async (d) => {
          const host = String(d.deviceIp || (d as any).ip || "").trim();
          if (!host) return;
          try {
            const res = await window.devices?.probe?.(host, probePort, 1200);
            if (!alive) return;
            setProbeMap((old) =>
              old[d.id] === (res?.ok ? !!res.reachable : false)
                ? old
                : { ...old, [d.id]: res?.ok ? !!res.reachable : false }
            );
          } catch {
            if (!alive) return;
            setProbeMap((old) =>
              old[d.id] === false ? old : { ...old, [d.id]: false }
            );
          }
        })
      );
    }

    // เรียกทันที 1 ครั้ง แล้วตั้ง interval ทุก 10s
    void doProbeLoop();
    timerRef.current = window.setInterval(doProbeLoop, 10_000);
    return () => {
      alive = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // เปลี่ยน scope/devices/currentList -> รันใหม่
  }, [devices, currentList, scope, offlineMs, probePort]);

  // ออนไลน์ "จริง" = prelimOnline + probe reachable (ถ้ามี probeMap)
  const isEffectiveOnline = (d: Device) => {
    if (!prelimOnline(d)) return false;

    // ถ้าเรามีผล probe แล้ว ต้อง reachable เท่านั้น
    if (Object.prototype.hasOwnProperty.call(probeMap, d.id)) {
      return !!probeMap[d.id];
    }
    // ยังไม่มีผล probe -> ระมัดระวังไว้ก่อน: ไม่นับ (กันเคส FAULT โผล่เป็น ONLINE)
    return false;
  };

  // นับ ONLINE (effective)
  const onlineInTab = useMemo(
    () => currentList.filter(isEffectiveOnline).length,
    [currentList, probeMap]
  );
  const onlineAll = useMemo(
    () => devices.filter(isEffectiveOnline).length,
    [devices, probeMap]
  );

  // กลุ่มเป้าหมาย (เฉพาะ online จริง)
  const targets = useMemo(() => {
    const base = scope === "all" ? devices : currentList;
    return base.filter(isEffectiveOnline);
  }, [scope, devices, currentList, probeMap]);

  const opLabel = (op: BulkOp) =>
    op === "station_close"
      ? ((t("op_station_close") as string) || "Station close")
      : ((t("op_emergency") as string) || "Emergency");

  const openConfirm = (op: BulkOp) => {
    if (targets.length === 0) {
      setM({
        open: true,
        variant: "info",
        title: (t("info") as string) || "Info",
        message:
          (t("no_online_in_scope") as string) ||
          "No ONLINE devices in the selected scope.",
      });
      return;
    }
    setConfirm({ open: true, op });
  };

  const performBulk = async () => {
    if (!confirm.op) return;
    setBusy(true);
    try {
      const onlineTargets = targets; // ถูกกรอง ONLINE จริงแล้ว

      const results = await Promise.all(
        onlineTargets.map(async (d) => {
          try {
            const raw =
              (await window.devices?.setOperation?.(
                d.id,
                confirm.op as Operation
              )) ?? { ok: false, error: "No response" };
            const r = raw as ApiResult;
            return {
              id: d.id,
              name: d.name,
              ok: r.ok,
              error: r.ok ? undefined : r.error,
            };
          } catch (e: any) {
            return {
              id: d.id,
              name: d.name,
              ok: false,
              error: String(e?.message || e),
            };
          }
        })
      );

      const okCount = results.filter((r) => r.ok).length;
      const failCount = results.length - okCount;

      setM({
        open: true,
        variant: failCount ? "error" : "success",
        title: failCount
          ? ((t("error") as string) || "Error")
          : ((t("success") as string) || "Success"),
        message:
          `${(t("send_command") as string) || "Send command"}: ${opLabel(
            confirm.op
          )} — OK ${okCount}/${results.length}` +
          (failCount
            ? `, ${(t("failed") as string) || "failed"} ${failCount}`
            : ""),
      });
    } finally {
      setBusy(false);
      setConfirm({ open: false, op: null });
    }
  };

  const onlineCountForScope = scope === "all" ? onlineAll : onlineInTab;

  // ===== Resume service (last mode) เหมือนเดิม =====
  async function getLastInserviceOp(
    deviceId: string
  ): Promise<
    "inservice_entry" | "inservice_exit" | "inservice_bidirect" | "fallback"
  > {
    if (window.devices?.getLastInserviceOp) {
      const r = await window.devices.getLastInserviceOp(deviceId);
      if (r?.ok && r.op) return r.op;
    }
    try {
      const res = await fetch(`/inservice-last/${encodeURIComponent(deviceId)}`);
      const j = await res.json();
      if (res.ok && j?.ok && j?.op) return j.op;
    } catch {}
    return "fallback";
  }

  const doBulkInserviceLast = async () => {
    setBusy(true);
    try {
      const onlineTargets = targets;
      const results = await Promise.all(
        onlineTargets.map(async (d) => {
          const last = await getLastInserviceOp(d.id);
          const op: Operation = (last === "fallback"
            ? "inservice_bidirect"
            : last) as Operation;
          try {
            const raw =
              (await window.devices?.setOperation?.(d.id, op)) ??
              ({ ok: false, error: "No response" } as const);
            const r = raw as ApiResult;
            return { id: d.id, ok: r.ok, error: r.ok ? undefined : r.error };
          } catch (e: any) {
            return { id: d.id, ok: false, error: String(e?.message || e) };
          }
        })
      );

      const okCount = results.filter((r) => r.ok).length;
      const failCount = results.length - okCount;
      setM({
        open: true,
        variant: failCount ? "error" : "success",
        title: failCount
          ? ((t("error") as string) || "Error")
          : ((t("success") as string) || "Success"),
        message: `${(t("send_command") as string) || "Send command"}: ${(t(
          "bulk_inservice_last"
        ) as string) || "Resume service (last mode)"} — OK ${okCount}/${
          results.length
        }${failCount ? `, ${(t("failed") as string) || "failed"} ${failCount}` : ""}`,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={className}>
      <fieldset className="rounded-2xl border p-3">
        <legend className="px-2 text-sm font-semibold">
          {(t("bulk_ops_title") as string) || "Bulk operations"}
        </legend>

        {/* Scope selector + count */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-gray-600">
            {(t("apply_to") as string) || "Apply to"}:
          </span>
          <select
            className="border rounded-lg px-2 py-1"
            value={scope}
            onChange={(e) => setScope(e.target.value as BulkScope)}
            disabled={busy}
          >
            <option value="tab">
              {(t("scope_current_tab") as string) || "Current tab"} —{" "}
              {onlineInTab} {(t("online_only_short") as string) || "ONLINE"}
            </option>
            <option value="all">
              {(t("scope_all") as string) || "All devices"} — {onlineAll}{" "}
              {(t("online_only_short") as string) || "ONLINE"}
            </option>
          </select>
          <span className="text-xs text-gray-500">
            {(t("online_only_note") as string) ||
              "Will only apply to devices that are ONLINE."}
          </span>
        </div>

        {/* Action buttons */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => openConfirm("station_close")}
            disabled={busy || onlineCountForScope === 0}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
          >
            {(t("bulk_station_close") as string) || "Station Close (all)"}
          </button>

        {/* Emergency – แดงเข้ม */}
          <button
            onClick={() => openConfirm("emergency")}
            disabled={busy || onlineCountForScope === 0}
            className="px-4 py-2 rounded-lg bg-red-700 text-white hover:bg-red-800 disabled:opacity-60"
          >
            {(t("bulk_emergency") as string) || "Emergency Mode (all)"}
          </button>

          {/* Resume last mode – เขียว */}
          <button
            onClick={doBulkInserviceLast}
            disabled={busy || onlineCountForScope === 0}
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
          >
            {(t("bulk_inservice_last") as string) ||
              "Resume service (last mode)"}
          </button>
        </div>
      </fieldset>

      {/* Confirm dialog */}
      <Dialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, op: null })}
        title={(t("confirm_operation") as string) || "Confirm operation"}
        size="sm"
        footer={
          <>
            <button
              onClick={() => setConfirm({ open: false, op: null })}
              className="px-4 py-2 rounded-lg border hover:bg-gray-50"
              disabled={busy}
            >
              {(t("cancel") as string) || "Cancel"}
            </button>
            <button
              onClick={performBulk}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={busy}
            >
              {(t("confirm") as string) || "Confirm"}
            </button>
          </>
        }
      >
        <div className="text-sm text-gray-700 space-y-1">
          <div>
            {(t("send_command") as string) || "Send command"}:{" "}
            <span className="font-semibold">
              {confirm.op
                ? confirm.op === "station_close"
                  ? ((t("op_station_close") as string) || "Station close")
                  : ((t("op_emergency") as string) || "Emergency")
                : "-"}
            </span>
          </div>
          <div className="text-gray-600">
            {(t("apply_to") as string) || "Apply to"}:{" "}
            <span className="font-semibold">
              {scope === "all"
                ? ((t("scope_all") as string) || "All devices")
                : ((t("scope_current_tab") as string) || "Current tab")}
              {" · "}
              {onlineCountForScope}{" "}
              {(t("online_only_short") as string) || "ONLINE"}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {(t("online_only_note") as string) ||
              "Only ONLINE devices will be targeted."}
          </div>
        </div>
      </Dialog>

      {/* Status modal */}
      <StatusModal
        open={m.open}
        variant={m.variant}
        title={m.title}
        message={m.message}
        onClose={() => setM((x) => ({ ...x, open: false }))}
        confirmText={(t("confirm") as string) || "Confirm"}
        cancelText={(t("cancel") as string) || "Cancel"}
      />
    </section>
  );
}
