const { app, BrowserWindow, ipcMain, desktopCapturer, screen, globalShortcut, dialog, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// Set Application User Model ID for Windows Taskbar Icon Branding
app.setAppUserModelId('com.capto.screenrecorder');

// Disable WGC and enable DirectX Desktop Duplication
app.commandLine.appendSwitch('disable-features', 'WebRtcAllowWgcDesktopCapturer,WebRtcAllowWgcScreenCapturer,WebRtcAllowWgcWindowCapturer');
app.commandLine.appendSwitch('enable-features', 'WebRtcAllowDxgiCapturer');
app.commandLine.appendSwitch('force-color-profile', 'srgb');

let mainWindow = null;
let regionSelectorWindow = null;
let cameraOverlayWindow = null;
let toolbarWindow = null;

// App Icon Path
const appIconPath = path.join(__dirname, 'src', 'assets', 'icon.png');
const appIcon = fs.existsSync(appIconPath) ? nativeImage.createFromPath(appIconPath) : null;

// Target Saved Folder: "Screen Recordings" in Videos
const baseVideoPath = app.getPath('videos') || app.getPath('home');
const recordingsDir = path.join(baseVideoPath, 'Screen Recordings');

if (!fs.existsSync(recordingsDir)) {
  try {
    fs.mkdirSync(recordingsDir, { recursive: true });
  } catch (err) {
    console.error('Error creating recordings directory:', err);
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 680,
    height: 760,
    minWidth: 540,
    minHeight: 640,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    icon: appIcon || appIconPath,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      backgroundThrottling: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (cameraOverlayWindow) cameraOverlayWindow.close();
    if (toolbarWindow) toolbarWindow.close();
    if (regionSelectorWindow) regionSelectorWindow.close();
  });
}

// Transparent Region Selection Window
function openRegionSelector() {
  if (regionSelectorWindow) {
    regionSelectorWindow.show();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.bounds;

  regionSelectorWindow = new BrowserWindow({
    x: 0,
    y: 0,
    width: width,
    height: height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    alwaysOnTop: true,
    fullscreen: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  regionSelectorWindow.loadFile(path.join(__dirname, 'src', 'overlays', 'region-selector.html'));

  regionSelectorWindow.on('closed', () => {
    regionSelectorWindow = null;
  });
}

// Fixed-Size Floating Movable Camera Overlay (Zero Square Shadow / 100% Crisp Shape)
function openCameraOverlay(shape = 'circle', size = 190, deviceId = '') {
  if (cameraOverlayWindow) {
    cameraOverlayWindow.show();
    cameraOverlayWindow.webContents.send('update-cam-settings', { shape, size, deviceId });
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workArea;

  cameraOverlayWindow = new BrowserWindow({
    x: width - 230,
    y: height - 230,
    width: 200,
    height: 200,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    icon: appIcon || appIconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false
    }
  });

  cameraOverlayWindow.loadFile(path.join(__dirname, 'src', 'overlays', 'camera-overlay.html'));

  cameraOverlayWindow.webContents.on('did-finish-load', () => {
    cameraOverlayWindow.webContents.send('init-cam-settings', { shape, size, deviceId });
  });

  cameraOverlayWindow.on('closed', () => {
    cameraOverlayWindow = null;
  });
}

// Floating Dynamic Island Recording Toolbar (Exact Tight Bounds / Zero Background Leak)
function openToolbar() {
  if (toolbarWindow) {
    toolbarWindow.show();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workArea;

  toolbarWindow = new BrowserWindow({
    x: Math.round(width / 2 - 140),
    y: 12,
    width: 280,
    height: 44,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    hasShadow: false,
    skipTaskbar: true,
    resizable: false,
    icon: appIcon || appIconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  try {
    toolbarWindow.setContentProtection(true);
  } catch (e) {
    console.log('SetContentProtection error:', e);
  }

  toolbarWindow.loadFile(path.join(__dirname, 'src', 'overlays', 'toolbar.html'));

  toolbarWindow.on('closed', () => {
    toolbarWindow = null;
  });
}

// App Lifecycle
app.whenReady().then(() => {
  createMainWindow();

  // Global Hotkeys
  const triggerRecord = () => {
    if (mainWindow) mainWindow.webContents.send('hotkey-toggle-record');
  };
  const triggerPause = () => {
    if (mainWindow) mainWindow.webContents.send('hotkey-toggle-pause');
  };
  const triggerCam = () => {
    if (cameraOverlayWindow) {
      if (cameraOverlayWindow.isVisible()) cameraOverlayWindow.hide();
      else cameraOverlayWindow.show();
    }
  };

  globalShortcut.register('F9', triggerRecord);
  globalShortcut.register('F10', triggerPause);
  globalShortcut.register('F11', triggerCam);
  globalShortcut.register('CommandOrControl+Shift+R', triggerRecord);
  globalShortcut.register('CommandOrControl+Shift+P', triggerPause);
  globalShortcut.register('CommandOrControl+Shift+C', triggerCam);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('get-desktop-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 180 },
      fetchWindowIcons: true
    });
    return sources.map(s => ({
      id: s.id,
      name: s.name,
      thumbnail: s.thumbnail.toDataURL(),
      appIcon: s.appIcon ? s.appIcon.toDataURL() : null
    }));
  } catch (err) {
    console.error('Error fetching desktop sources:', err);
    return [];
  }
});

// Window controls
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// Automatic Minimize on Recording Start
ipcMain.on('recording-started', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
  openToolbar();
});

// Restore Window on Recording Stop
ipcMain.on('recording-stopped', () => {
  if (toolbarWindow) {
    toolbarWindow.close();
  }
  if (mainWindow) {
    mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// Region Selector Control
ipcMain.on('open-region-selector', () => {
  openRegionSelector();
});

ipcMain.on('region-selected', (event, region) => {
  if (regionSelectorWindow) {
    regionSelectorWindow.close();
  }
  if (mainWindow) {
    mainWindow.webContents.send('on-region-selected', region);
  }
});

ipcMain.on('cancel-region-selector', () => {
  if (regionSelectorWindow) {
    regionSelectorWindow.close();
  }
});

// Camera Overlay Controls
ipcMain.on('open-camera-overlay', (event, { shape, size, deviceId }) => {
  openCameraOverlay(shape, size, deviceId);
});

ipcMain.on('close-camera-overlay', () => {
  if (cameraOverlayWindow) {
    cameraOverlayWindow.close();
  }
});

ipcMain.on('set-camera-shape', (event, shape) => {
  if (cameraOverlayWindow) {
    cameraOverlayWindow.webContents.send('update-cam-shape', shape);
  }
});

ipcMain.on('set-camera-size', (event, size) => {
  if (cameraOverlayWindow) {
    cameraOverlayWindow.setSize(size, size);
  }
});

ipcMain.on('set-camera-brightness', (event, val) => {
  if (cameraOverlayWindow) {
    cameraOverlayWindow.webContents.send('update-cam-brightness', val);
  }
});

// Toolbar Controls
ipcMain.on('show-toolbar', () => {
  openToolbar();
});

ipcMain.on('hide-toolbar', () => {
  if (toolbarWindow) {
    toolbarWindow.close();
  }
});

ipcMain.on('toolbar-action', (event, action) => {
  if (mainWindow) {
    mainWindow.webContents.send('from-toolbar', action);
  }
});

ipcMain.on('update-toolbar-timer', (event, timeStr) => {
  if (toolbarWindow) {
    toolbarWindow.webContents.send('sync-timer', timeStr);
  }
});

// Save Recorded Video Buffer
ipcMain.handle('save-recording', async (event, { buffer, filename }) => {
  try {
    const filePath = path.join(recordingsDir, filename);
    const nodeBuf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    fs.writeFileSync(filePath, nodeBuf);
    return { success: true, filePath };
  } catch (err) {
    console.error('Error saving recording:', err);
    return { success: false, error: err.message };
  }
});

// List Saved Recordings
ipcMain.handle('get-recordings-list', async () => {
  try {
    if (!fs.existsSync(recordingsDir)) return [];
    const files = fs.readdirSync(recordingsDir);
    const recordings = files
      .filter(f => f.endsWith('.mp4') || f.endsWith('.webm') || f.endsWith('.wav') || f.endsWith('.png'))
      .map(f => {
        const fullPath = path.join(recordingsDir, f);
        const stats = fs.statSync(fullPath);
        return {
          filename: f,
          fullPath,
          sizeBytes: stats.size,
          createdAt: stats.mtime
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
    return recordings;
  } catch (err) {
    console.error('Error reading recordings:', err);
    return [];
  }
});

// Open Recordings Folder in File Explorer
ipcMain.on('open-recordings-folder', () => {
  shell.openPath(recordingsDir);
});

// Reveal file in File Explorer
ipcMain.on('reveal-file', (event, filePath) => {
  shell.showItemInFolder(filePath);
});
