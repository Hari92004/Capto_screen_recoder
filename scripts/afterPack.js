const { rcedit } = require('rcedit');
const path = require('path');
const fs = require('fs');

exports.default = async function (context) {
  if (context.electronPlatformName !== 'win32') return;

  const appOutDir = context.appOutDir;
  const productName = context.packager.appInfo.productFilename || 'Capto';
  const exePath = path.join(appOutDir, `${productName}.exe`);
  const iconPath = path.join(context.packager.projectDir, 'src', 'assets', 'icon.ico');

  if (fs.existsSync(exePath) && fs.existsSync(iconPath)) {
    console.log(`[Capto afterPack] Embedding icon into ${exePath}...`);
    try {
      await rcedit(exePath, {
        icon: iconPath,
        'version-string': {
          ProductName: 'Capto',
          FileDescription: 'Capto Screen Recorder',
          CompanyName: 'Capto',
          LegalCopyright: 'Copyright © 2026 Hari'
        }
      });
      console.log('[Capto afterPack] Icon successfully embedded into exe!');
    } catch (err) {
      console.warn('[Capto afterPack] rcedit warning:', err);
    }
  }
};
