// src/i18n/translations.ts
export type Lang = "th" | "en";

export const translations: Record<Lang, Record<string, string>> = {
  th: {
    // App / Header
    app_title: "ระบบเฝ้าระวัง EMV Gate",
    app_subtitle: "สถานะอุปกรณ์ฝั่ง North / South",
    logout: "ออกจากระบบ",
    username_label: "ผู้ใช้",
    role_label: "บทบาท",

    // Language switcher
    change_lang: "EN",

    // Login
    login_title: "เข้าสู่ระบบ",
    username: "ชื่อผู้ใช้",
    password: "รหัสผ่าน",
    username_placeholder: "admin",
    password_placeholder: "1234",
    login: "เข้าสู่ระบบ",
    signing_in: "กำลังเข้าสู่ระบบ...",
    invalid_credentials: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
    remember_me: "จดจำฉันไว้ในเครื่อง",

    // Home / Summary
    total: "ทั้งหมด",
    online: "ออนไลน์",
    maintenance: "บำรุงรักษา",
    fault: "ขัดข้อง",
    offline: "ออฟไลน์",
    north: "เหนือ",
    south: "ใต้",
    loading_devices: "กำลังโหลดข้อมูลอุปกรณ์…",
    no_devices: "ไม่มีอุปกรณ์ในฝั่งนี้",

    // Device fields
    device_id: "รหัส",
    device_gate: "เกท",
    device_side: "ฝั่ง",
    device_type: "ประเภท",
    device_ip: "ไอพี",
    device_heartbeat: "ฮาร์ทบีต",
    device_message: "ข้อความ",

    // Station info & display
    station_name: "สถานี",
    station_id: "รหัสสถานี",
    station_ip: "ไอพีสถานี",
    fullscreen: "เต็มจอ",
    note: "หมายเหตุ",
    will_apply_next_launch: "จะมีผลเมื่อเปิดแอปครั้งถัดไป",

    // Settings
    settings_title: "การตั้งค่า",
    log_level: "ระดับบันทึก",
    log_dir: "โฟลเดอร์ Log",
    log_file: "ไฟล์ปัจจุบัน",
    save: "บันทึก",
    saving: "กำลังบันทึก...",
    open_logs_folder: "เปิดโฟลเดอร์ Log",
    heartbeat_port: "พอร์ต Heartbeat",
    device_probe_port: "พอร์ตตรวจสอบอุปกรณ์",
    invalid_port: "พอร์ตไม่ถูกต้อง (ต้องเป็น 1-65535)",

    // Modal: Gate control
    gate_operation_title: "ควบคุมเกท",
    gate_operation_control: "การสั่งงานเกท",
    operation: "คำสั่ง",
    op_inservice: "เปิดให้บริการ",
    op_station_close: "ปิดสถานี",
    op_emergency: "ฉุกเฉิน",
    inservice_group: "โหมด Inservice",
    other_ops_group: "คำสั่งอื่น ๆ",
    op_inservice_entry: "เปิดบริการ (เข้า)",
    op_inservice_exit: "เปิดบริการ (ออก)",
    op_inservice_bi: "เปิดบริการ (สองทาง)",
    op_out_of_service: "หยุดให้บริการ",
    not_online_warning: "อุปกรณ์ไม่ได้อยู่ในสถานะ ONLINE ไม่สามารถสั่งงานได้",
    cancel: "ยกเลิก",
    enter: "ยืนยัน",
    reboot_ok: "สั่งรีบูทสำเร็จ",
    reboot_failed: "สั่งรีบูทไม่สำเร็จ",
    operation_blocked: "อุปกรณ์ไม่พร้อม จึงไม่สามารถสั่งงานได้",
    last_seen: "เห็นล่าสุด",
    send_command: "ส่งคำสั่ง",
    operation_requires_online: "คำสั่งนี้ต้องใช้งานเมื่ออุปกรณ์อยู่ในสถานะออนไลน์เท่านั้น",
    device: "อุปกรณ์",
    confirm_operation: "ยืนยันดำเนินการนี้หรือไม่?",
    set_operation: "สั่งการ",

    // Aisle Mode (5.1.4)
    aisle_mode_title: "โหมดช่องทาง (5.1.4)",
    aisle_mode: "โหมดช่องทาง",
    aisle_mode_mode: "โหมด",
    mode: "โหมด",
    aisle_mode_value_0: "0 — ปกติปิด (ไม่จำกัดบานประตู)",
    aisle_mode_value_1: "1 — ปกติเปิด",
    aisle_mode_value_2: "2 — ปกติปิด เปิดเฉพาะบานซ้าย",
    aisle_mode_value_3: "3 — ปกติปิด เปิดเฉพาะบานขวา",
    set_aisle_mode: "ตั้งค่าโหมดช่องทาง",
    set_aisle_mode_success: "อัปเดตโหมดช่องทางแล้ว",
    set_aisle_mode_failed: "ตั้งค่าโหมดช่องทางไม่สำเร็จ",
    get_aisle_mode_failed: "ดึงโหมดช่องทางไม่สำเร็จ",

    // Maintenance tools / Terminal
    maintenance_tools: "เครื่องมือบำรุงรักษา",
    reboot_gate: "รีบูทเกท",
    open_console: "เปิดคอนโซล",
    console_hint: "คอนโซลใช้ xterm.js + node-pty (SSH ผ่านระบบ)",
    close: "ปิด",
    ssh_session: "เชื่อมต่อ SSH แบบโต้ตอบ",
    local_shell: "เชลล์ภายในเครื่อง",
    terminate_hint: "กด Ctrl+C/D เพื่อออก",

    // Device log actions
    get_device_log: "ดึงไฟล์ล็อกอุปกรณ์",
    getting_logs: "กำลังดึงล็อก...",
    device_log_ok: "ดึงล็อกเสร็จแล้ว",
    device_log_failed: "ดึงล็อกไม่สำเร็จ",

    // Side labels
    side_north: "ทิศเหนือ",
    side_south: "ทิศใต้",

    // Status / Confirm modal (StatusModal)
    info: "ข้อมูล",
    success: "สำเร็จ",
    error: "ข้อผิดพลาด",
    confirm: "ยืนยัน",

    // User Management
    user_mgmt_title: "จัดการผู้ใช้",
    um_no_permission: "บัญชีของคุณไม่มีสิทธิ์จัดการผู้ใช้",
    create_user: "สร้างผู้ใช้",
    creating: "กำลังสร้าง...",
    user_list_title: "รายชื่อผู้ใช้",
    loading: "กำลังโหลด...",
    no_users: "ไม่มีผู้ใช้",
    delete_user: "ลบผู้ใช้",
    deleting: "กำลังลบ...",
    um_cannot_delete_self: "ไม่สามารถลบบัญชีของตนเองได้",
    um_delete_confirm: "ยืนยันลบผู้ใช้ \"{user}\" ?",
    um_create_confirm: "ยืนยันสร้างผู้ใช้ \"{user}\" (บทบาท {role}) ?",
    um_create_failed: "สร้างผู้ใช้ไม่สำเร็จ",
    um_delete_failed: "ลบผู้ใช้ไม่สำเร็จ",
    um_list_failed: "โหลดรายชื่อผู้ใช้ไม่สำเร็จ",
    um_create_ok: "สร้างผู้ใช้สำเร็จ",
    um_delete_ok: "ลบผู้ใช้สำเร็จ",
  },

  en: {
    // App / Header
    app_title: "EMV Gate Monitoring",
    app_subtitle: "North / South device health",
    logout: "Logout",
    username_label: "User",
    role_label: "Role",

    // Language switcher
    change_lang: "TH",

    // Login
    login_title: "Login",
    username: "Username",
    password: "Password",
    username_placeholder: "admin",
    password_placeholder: "1234",
    login: "Login",
    signing_in: "Signing in...",
    invalid_credentials: "Invalid username or password",
    remember_me: "Remember me",

    // Home / Summary
    total: "Total",
    online: "Online",
    maintenance: "Maintenance",
    fault: "Fault",
    offline: "Offline",
    north: "North",
    south: "South",
    loading_devices: "Loading devices…",
    no_devices: "No devices on this side.",

    // Device fields
    device_id: "ID",
    device_gate: "Gate",
    device_side: "Side",
    device_type: "Type",
    device_ip: "IP",
    device_heartbeat: "Heartbeat",
    device_message: "Message",

    // Station info & display
    station_name: "Station",
    station_id: "Station ID",
    station_ip: "Station IP",
    fullscreen: "Full Screen",
    note: "Note",
    will_apply_next_launch: "will apply on next launch",

    // Settings
    settings_title: "Settings",
    log_level: "Log Level",
    log_dir: "Log dir",
    log_file: "Current file",
    save: "Save",
    saving: "Saving...",
    open_logs_folder: "Open Logs Folder",
    heartbeat_port: "Heartbeat Port",
    device_probe_port: "Device Probe Port",
    invalid_port: "Invalid port(s). Ports must be 1-65535.",

    // Modal: Gate control
    gate_operation_title: "Gate Operation",
    gate_operation_control: "Gate Operation Control",
    operation: "Operation",
    op_inservice: "Inservice",
    op_station_close: "Station Close",
    op_emergency: "Emergency",
    inservice_group: "Inservice modes",
    other_ops_group: "Other operations",
    op_inservice_entry: "Inservice - Entry",
    op_inservice_exit: "Inservice - Exit",
    op_inservice_bi: "Inservice - Bi-direction",
    op_out_of_service: "Out of Service",
    not_online_warning: "This device is not ONLINE. Operation control is disabled.",
    cancel: "Cancel",
    enter: "Enter",
    reboot_ok: "Reboot succeeded",
    reboot_failed: "Reboot failed",
    operation_blocked: "Operation blocked: device not ready",
    last_seen: "Last seen",
    send_command: "Send command",
    operation_requires_online: "Operation requires device to be online.",
    device: "Device",
    confirm_operation: "Confirm this operation?",
    set_operation: "Set Operation",

    // Aisle Mode (5.1.4)
    aisle_mode_title: "Aisle Mode (5.1.4)",
    aisle_mode: "Aisle Mode",
    aisle_mode_mode: "Mode",
    mode: "Mode",
    aisle_mode_value_0: "0 — Normally closed, no flap restriction",
    aisle_mode_value_1: "1 — Normally open",
    aisle_mode_value_2: "2 — Normally closed, left flap only",
    aisle_mode_value_3: "3 — Normally closed, right flap only",
    set_aisle_mode: "Set Aisle Mode",
    set_aisle_mode_success: "Aisle mode updated",
    set_aisle_mode_failed: "Failed to update aisle mode",
    get_aisle_mode_failed: "Failed to get aisle mode",

    // Maintenance tools / Terminal
    maintenance_tools: "Maintenance Tools",
    reboot_gate: "Reboot Gate",
    open_console: "Open Console",
    console_hint: "Console uses xterm.js + node-pty (SSH via system).",
    close: "Close",
    ssh_session: "Interactive SSH session",
    local_shell: "Local shell",
    terminate_hint: "Press Ctrl+C/D to exit",

    // Device log actions
    get_device_log: "Get Device Log",
    getting_logs: "Getting logs...",
    device_log_ok: "Device log fetched",
    device_log_failed: "Get device log failed",

    // Side labels
    side_north: "North",
    side_south: "South",

    // Status / Confirm modal (StatusModal)
    info: "Info",
    success: "Success",
    error: "Error",
    confirm: "Confirm",

    // User Management
    user_mgmt_title: "User Management",
    um_no_permission: "Your account has no permission to manage users.",
    create_user: "Create user",
    creating: "Creating...",
    user_list_title: "Users",
    loading: "Loading...",
    no_users: "No users",
    delete_user: "Delete user",
    deleting: "Deleting...",
    um_cannot_delete_self: "You cannot delete your own account.",
    um_delete_confirm: "Delete user \"{user}\" ?",
    um_create_confirm: "Create user \"{user}\" (role {role}) ?",
    um_create_failed: "Create user failed",
    um_delete_failed: "Delete user failed",
    um_list_failed: "Failed to load users",
    um_create_ok: "User created",
    um_delete_ok: "User deleted",
  },
};

export function t(lang: Lang, key: string) {
  return translations[lang][key] || key;
}
