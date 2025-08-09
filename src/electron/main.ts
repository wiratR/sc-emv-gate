import { BrowserWindow, app } from 'electron';

import { openDB } from "./db";
import path from 'path';
import { setupAuthIPC } from "./ipc/auth";
import { setupConfigIPC } from "./ipc/config";
import url from 'url';

const isDev = !app.isPackaged; // 👈 ใช้อันนี้แทน NODE_ENV

let win: BrowserWindow | null = null;

function createWindow() {
  const db = openDB();
  setupAuthIPC(db);
  setupConfigIPC();
  win = new BrowserWindow({
    width: 1100,
    height: 800,
    show: false,
    backgroundColor: '#000', // กันแฟลชขาว
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // ปิดชั่วคราวถ้ายังขาว
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // log ช่วยดีบัก
  console.log('[env] isDev =', isDev, 'NODE_ENV =', process.env.NODE_ENV);

  if (isDev) {
    win.loadURL('http://localhost:5173/#/login'); // ใช้ HashRouter ฝั่ง React
  } else {
    const indexPath = url.pathToFileURL(
      path.join(__dirname, '../dist/index.html')
    ).toString();
    win.loadURL(indexPath);
  }

  win.once('ready-to-show', () => {
    if (win && !win.isDestroyed()) {
      win.show();
      if (isDev) win.webContents.openDevTools({ mode: 'detach' }); // เปิด DevTools ชัวร์ๆ หลังพร้อม
    }
  });

  win.webContents.on('did-fail-load', (_e, code, desc, theUrl) => {
    console.error('[did-fail-load]', code, desc, theUrl);
  });
  win.webContents.on('console-message', (_e, level, msg) => {
    console.log('[renderer]', level, msg);
  });
  win.on('unresponsive', () => console.error('[window] unresponsive'));

  win.on('closed', () => { win = null; });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
