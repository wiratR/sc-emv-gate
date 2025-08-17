/** Operation values agreed with main/heartbeatServer */
export type Operation =
  | "inservice_entry"
  | "inservice_exit"
  | "inservice_bidirect"
  | "out_of_service"
  | "station_close"
  | "emergency";