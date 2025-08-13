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
    change_lang: "EN",

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

    // Station info
    station_name: "สถานี",
    station_id: "รหัสสถานี",
    station_ip: "ไอพีสถานี",

    // Settings
    settings_title: "การตั้งค่า",
    log_level: "ระดับบันทึก",
    log_dir: "โฟลเดอร์ Log",
    log_file: "ไฟล์ปัจจุบัน",
    save: "บันทึก",
    saving: "กำลังบันทึก...",
    open_logs_folder: "เปิดโฟลเดอร์ Log",

    // Modal: Gate control
    gate_operation_title: "ควบคุมเกท",
    gate_operation_control: "การสั่งงานเกท",
    operation: "คำสั่ง",
    op_inservice: "เปิดให้บริการ",
    op_station_close: "ปิดสถานี",
    op_emergency: "ฉุกเฉิน",
    not_online_warning: "อุปกรณ์ไม่ได้อยู่ในสถานะ ONLINE ไม่สามารถสั่งงานได้",
    cancel: "ยกเลิก",
    enter: "ยืนยัน",

    // Maintenance tools
    maintenance_tools: "เครื่องมือบำรุงรักษา",
    reboot_gate: "รีบูทเกท",
    open_console: "เปิดคอนโซล",
    console_hint: "คอนโซลใช้ xterm.js + node-pty (SSH ผ่านระบบ)",
    
    // Side
    side_north: "ทิศเหนือ",
    side_south: "ทิศใต้",

    last_seen: "เห็นล่าสุด",
    // Terminal Modal
    console_title: "คอนโซล",
    close: "ปิด",
    failed_to_start_terminal: "เริ่มต้นเทอร์มินัลไม่สำเร็จ",
    process_exited: "กระบวนการสิ้นสุด",
    ssh_session: "เซสชัน SSH แบบโต้ตอบ",
    local_shell: "เชลล์ภายในเครื่อง",
    terminate_hint: "กด Ctrl+C/D เพื่อปิด",
    
    // User Management
    user_mgmt_title: "จัดการผู้ใช้",
    user_list_title: "รายชื่อผู้ใช้",
    create_user: "สร้างผู้ใช้",
    creating: "กำลังสร้าง...",
    delete_user: "ลบ",
    deleting: "กำลังลบ...",
    loading: "กำลังโหลด...",
    no_users: "ยังไม่มีผู้ใช้",
    um_no_permission: "ต้องเป็นผู้ดูแลระบบ (admin) จึงจะจัดการผู้ใช้ได้",
    um_cannot_delete_self: "ไม่สามารถลบผู้ใช้ที่กำลังล็อกอินอยู่ได้",
    um_delete_confirm: "ต้องการลบผู้ใช้ \"{{username}}\" หรือไม่?",
    um_create_failed: "สร้างผู้ใช้ไม่สำเร็จ",
    um_delete_failed: "ลบผู้ใช้ไม่สำเร็จ",
  },

  en: {
    // App / Header
    app_title: "EMV Gate Monitoring",
    app_subtitle: "North / South device health",
    logout: "Logout",
    username_label: "User",
    role_label: "Role",

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
    change_lang: "TH",

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

    // Station info
    station_name: "Station",
    station_id: "Station ID",
    station_ip: "Station IP",

    // Settings
    settings_title: "Settings",
    log_level: "Log Level",
    log_dir: "Log dir",
    log_file: "Current file",
    save: "Save",
    saving: "Saving...",
    open_logs_folder: "Open Logs Folder",

    // Modal: Gate control
    gate_operation_title: "Gate Operation",
    gate_operation_control: "Gate Operation Control",
    operation: "Operation",
    op_inservice: "Inservice",
    op_station_close: "Station Close",
    op_emergency: "Emergency",
    not_online_warning: "This device is not ONLINE. Operation control is disabled.",
    cancel: "Cancel",
    enter: "Enter",

    // Maintenance tools
    maintenance_tools: "Maintenance Tools",
    reboot_gate: "Reboot Gate",
    open_console: "Open Console",
    console_hint: "Console uses xterm.js + node-pty (SSH via system).",

    // Side
    side_north: "North",
    side_south: "South",

    last_seen: "Last seen",

    // Terminal Modal
    console_title: "Console",
    close: "Close",
    failed_to_start_terminal: "Failed to start terminal",
    process_exited: "process exited",
    ssh_session: "Interactive SSH session",
    local_shell: "Local shell",
    terminate_hint: "Press Ctrl+C/D to terminate",

    // User Management
    user_mgmt_title: "User Management",
    user_list_title: "Users",
    create_user: "Create User",
    creating: "Creating...",
    delete_user: "Delete",
    deleting: "Deleting...",
    loading: "Loading...",
    no_users: "No users.",
    um_no_permission: "Only admin can manage users.",
    um_cannot_delete_self: "You cannot delete the currently logged-in user.",
    um_delete_confirm: "Delete user \"{{username}}\"?",
    um_create_failed: "Create user failed",
    um_delete_failed: "Delete user failed",
  },
};

export function t(lang: Lang, key: string) {
  return translations[lang][key] || key;
}
