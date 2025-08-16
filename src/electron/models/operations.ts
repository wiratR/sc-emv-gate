// src/electron/models/operation.ts

/**
 * Supported operations (server-side)
 * - Inservice (3 modes): entry / exit / bi-direction
 * - Out of service
 * - Station close
 * - Emergency
 */

export type Operation =
  | "inservice_entry"
  | "inservice_exit"
  | "inservice_bidir"
  | "out_of_service"
  | "station_close"
  | "emergency";

export const ALL_OPERATIONS: Operation[] = [
  "inservice_entry",
  "inservice_exit",
  "inservice_bidir",
  "out_of_service",
  "station_close",
  "emergency",
];

export function isOperation(x: string): x is Operation {
  return (ALL_OPERATIONS as string[]).includes(x);
}

/** (ทางเลือก) กลุ่มไว้ใช้ใน UI หรือ logging */
export const OP_GROUP: Record<Operation, "inservice" | "maintenance" | "shutdown" | "emergency"> = {
  inservice_entry:  "inservice",
  inservice_exit:   "inservice",
  inservice_bidir:  "inservice",
  out_of_service:   "maintenance",
  station_close:    "shutdown",
  emergency:        "emergency",
};

// default ถ้าไม่มีค่าเดิม
export const DEFAULT_OPERATION: Operation = "inservice_bidir";

