// scripts/postinstall.js
(async () => {
  try {
    // ข้ามบน CI
    if (process.env.CI) {
      console.log('skip rebuild on CI');
      return;
    }

    const { rebuild } = require('@electron/rebuild');

    // หาเวอร์ชัน Electron แบบปลอดภัย
    let electronVersion;
    try {
      electronVersion = require('electron/package.json').version;
    } catch {
      try {
        const pkg = require('../package.json');
        electronVersion =
          (pkg.devDependencies && pkg.devDependencies.electron) ||
          (pkg.dependencies && pkg.dependencies.electron) ||
          undefined;
        // ตัด ^ ~ ออกถ้ามี
        if (electronVersion && /^[~^]/.test(electronVersion)) {
          electronVersion = electronVersion.slice(1);
        }
      } catch {}
    }

    if (!electronVersion) {
      console.warn('⚠️  Electron not installed yet. Skipping electron-rebuild.');
      return; // ไม่ถือว่า error
    }

    console.log(`🔧 electron-rebuild for Electron ${electronVersion} ...`);
    await rebuild({
      buildPath: process.cwd(),
      electronVersion,
      force: true,
      onlyModules: ['better-sqlite3', 'node-pty'],
    });
    console.log('✅ electron-rebuild done');
  } catch (e) {
    console.error(e);
    // ไม่ให้ install fail เพราะบางสภาพแวดล้อมไม่มี toolchain
    process.exit(0);
  }
})();
