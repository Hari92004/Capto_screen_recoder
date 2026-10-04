const { app, BrowserWindow, ipcMain, desktopCapturer, screen, globalShortcut, dialog, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
let ffmpegPath = null;
try {
  ffmpegPath = require('ffmpeg-static');
  if (ffmpegPath && typeof ffmpegPath === 'string' && ffmpegPath.includes('app.asar')) {
    const unpacked = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
    if (fs.existsSync(unpacked)) {
      ffmpegPath = unpacked;
    }
  }
} catch (e) {
  console.warn('[Capto] ffmpeg-static not available:', e);
}

// Set Application Name & User Model ID for Windows Taskbar Branding
app.name = 'Capto';
if (app.setName) app.setName('Capto');
app.setAppUserModelId('com.capto.screenrecorder');

// Disable WGC and enable DirectX Desktop Duplication
app.commandLine.appendSwitch('disable-features', 'WebRtcAllowWgcDesktopCapturer,WebRtcAllowWgcScreenCapturer,WebRtcAllowWgcWindowCapturer');
app.commandLine.appendSwitch('enable-features', 'WebRtcAllowDxgiCapturer');
app.commandLine.appendSwitch('force-color-profile', 'srgb');

let mainWindow = null;
let regionSelectorWindow = null;
let cropBorderWindow = null;
let cameraOverlayWindow = null;
let toolbarWindow = null;
let playerWindow = null;

// App Icon Path (Multi-resolution ICO for Windows, PNG for others)
const icoPath = path.join(__dirname, 'src', 'assets', 'icon.ico');
const pngPath = path.join(__dirname, 'src', 'assets', 'icon.png');
const appIconPath = (process.platform === 'win32' && fs.existsSync(icoPath)) ? icoPath : pngPath;
let appIcon = null;
try {
  if (fs.existsSync(icoPath)) {
    appIcon = nativeImage.createFromPath(icoPath);
  } else if (fs.existsSync(pngPath)) {
    appIcon = nativeImage.createFromPath(pngPath);
  }
} catch (e) {}

// Ensure Windows Native Start Menu & Desktop Shortcuts with Real Disk Icon
if (process.platform === 'win32') {
  app.whenReady().then(() => {
    try {
      const targetExe = process.execPath;
      const userData = app.getPath('userData');
      const physicalIcoPath = path.join(userData, 'icon.ico');

      // Windows Shell cannot read icon files from inside an asar archive,
      // so extract a copy to userData so Windows Explorer always has the physical icon file
      if (!fs.existsSync(physicalIcoPath) && fs.existsSync(icoPath)) {
        try {
          fs.mkdirSync(userData, { recursive: true });
          fs.writeFileSync(physicalIcoPath, fs.readFileSync(icoPath));
        } catch (err) {}
      }

      const iconFile = fs.existsSync(physicalIcoPath) ? physicalIcoPath : (fs.existsSync(icoPath) ? icoPath : targetExe);

      const appData = app.getPath('appData');
      const startMenuDir = path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs');
      const startMenuShortcut = path.join(startMenuDir, 'Capto.lnk');
      const desktopDir = app.getPath('desktop');
      const desktopShortcut = path.join(desktopDir, 'Capto.lnk');

      const shortcutOptions = {
        target: targetExe,
        cwd: path.dirname(targetExe),
        description: 'Capto Screen Recorder',
        icon: iconFile,
        iconIndex: 0,
        appUserModelId: 'com.capto.screenrecorder'
      };

      shell.writeShortcutLink(startMenuShortcut, 'create', shortcutOptions);
      if (fs.existsSync(desktopDir)) {
        shell.writeShortcutLink(desktopShortcut, 'create', shortcutOptions);
      }
    } catch (e) {}
  });
}

// Target Saved Folder: "Screen Recordings" in Videos
function getRecordingsDir() {
  const explicitPath = 'C:\\Users\\harip\\Videos\\Screen Recordings';
  if (fs.existsSync(explicitPath)) return explicitPath;

  const userProfile = process.env.USERPROFILE || 'C:\\Users\\harip';
  const directPath = path.join(userProfile, 'Videos', 'Screen Recordings');
  if (fs.existsSync(directPath)) return directPath;

  const baseVideoPath = app.getPath('videos') || app.getPath('home');
  const fallback = path.join(baseVideoPath, 'Screen Recordings');
  if (!fs.existsSync(fallback)) {
    try { fs.mkdirSync(fallback, { recursive: true }); } catch (e) {}
  }
  return fallback;
}

const recordingsDir = getRecordingsDir();
console.log('[Capto] Target Recordings Directory:', recordingsDir);

function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: 'Capto',
    width: 640,
    height: 740,
    minWidth: 420,
    maxWidth: 640,
    minHeight: 52,
    maxHeight: 740,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: true,
    resizable: true, // Allows smooth dynamic island morphing
    maximizable: false,
    fullscreenable: false,
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

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer]: ${message}`);
  });

  mainWindow.on('page-title-updated', (e) => {
    e.preventDefault();
    mainWindow.setTitle('Capto');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (cameraOverlayWindow) cameraOverlayWindow.close();
    if (toolbarWindow) toolbarWindow.close();
    if (regionSelectorWindow) {
      regionSelectorWindow.destroy();
      regionSelectorWindow = null;
    }
    if (cropBorderWindow) {
      cropBorderWindow.destroy();
      cropBorderWindow = null;
    }
  });
}

// Transparent Region Selection Window
function openRegionSelector() {
  if (regionSelectorWindow) {
    regionSelectorWindow.destroy();
    regionSelectorWindow = null;
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

// Persistent Visual Dotted Border Outline for Custom Crop Area (100% Click-Through)
function showCropBorder(region) {
  const primaryDisplay = screen.getPrimaryDisplay();
  const scale = primaryDisplay.scaleFactor || 1;

  const dipX = Math.round(region.x / scale);
  const dipY = Math.round(region.y / scale);
  const dipWidth = Math.round(region.width / scale);
  const dipHeight = Math.round(region.height / scale);

  if (cropBorderWindow) {
    cropBorderWindow.setBounds({
      x: dipX,
      y: dipY,
      width: dipWidth,
      height: dipHeight
    });
    cropBorderWindow.show();
    cropBorderWindow.setIgnoreMouseEvents(true); // 100% Guaranteed pass-through!
    cropBorderWindow.webContents.send('sync-crop-dimensions', `${region.width} × ${region.height} px`);
    return;
  }

  cropBorderWindow = new BrowserWindow({
    x: dipX,
    y: dipY,
    width: dipWidth,
    height: dipHeight,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    hasShadow: false,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  try {
    cropBorderWindow.setIgnoreMouseEvents(true); // 100% Guaranteed pass-through to all apps!
    cropBorderWindow.setContentProtection(true); // Invisible in final recorded video!
  } catch (e) {}

  cropBorderWindow.loadFile(path.join(__dirname, 'src', 'overlays', 'crop-border.html'));

  cropBorderWindow.webContents.on('did-finish-load', () => {
    cropBorderWindow.webContents.send('sync-crop-dimensions', `${region.width} × ${region.height} px`);
  });

  cropBorderWindow.on('closed', () => {
    cropBorderWindow = null;
  });
}

function hideCropBorder() {
  if (cropBorderWindow) {
    try {
      cropBorderWindow.destroy();
    } catch (e) {}
    cropBorderWindow = null;
  }
}

// Fixed-Size Floating Movable Camera Overlay
function openCameraOverlay(shape = 'circle', size = 190, deviceId = '', deviceLabel = '', deviceIndex = 0) {
  if (cameraOverlayWindow && !cameraOverlayWindow.isDestroyed()) {
    cameraOverlayWindow.show();
    try {
      cameraOverlayWindow.setAlwaysOnTop(true, 'screen-saver');
    } catch (e) {}
    cameraOverlayWindow.webContents.send('update-cam-settings', { shape, size, deviceId, deviceLabel, deviceIndex });
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
    skipTaskbar: false,
    icon: appIcon || appIconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false
    }
  });

  try {
    cameraOverlayWindow.setAlwaysOnTop(true, 'screen-saver');
    cameraOverlayWindow.setVisibleOnAllWorkspaces(true);
  } catch (e) {}

  cameraOverlayWindow.loadFile(path.join(__dirname, 'src', 'overlays', 'camera-overlay.html'));

  cameraOverlayWindow.webContents.on('did-finish-load', () => {
    if (cameraOverlayWindow && !cameraOverlayWindow.isDestroyed()) {
      cameraOverlayWindow.webContents.send('init-cam-settings', { shape, size, deviceId, deviceLabel, deviceIndex });
    }
  });

  cameraOverlayWindow.on('closed', () => {
    cameraOverlayWindow = null;
  });
}

// Floating Dynamic Island Recording Toolbar
function openToolbar() {
  if (toolbarWindow) {
    toolbarWindow.show();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workArea;

  toolbarWindow = new BrowserWindow({
    x: Math.round(width / 2 - 160),
    y: 12,
    width: 320,
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
  globalShortcut.register('F12', () => {
    if (mainWindow) mainWindow.webContents.toggleDevTools();
  });
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (mainWindow) mainWindow.webContents.toggleDevTools();
  });
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

// Auto-Hide Main Window Completely on Recording Start
ipcMain.on('recording-started', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
  openToolbar();
});

// Auto-Restore Window on Recording Stop
ipcMain.on('recording-stopped', () => {
  if (toolbarWindow) {
    toolbarWindow.close();
  }
  hideCropBorder();
  if (mainWindow) {
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
    try {
      regionSelectorWindow.destroy();
    } catch (e) {}
    regionSelectorWindow = null;
  }
  showCropBorder(region);
  if (mainWindow) {
    mainWindow.webContents.send('on-region-selected', region);
  }
});

ipcMain.on('cancel-region-selector', () => {
  if (regionSelectorWindow) {
    try {
      regionSelectorWindow.destroy();
    } catch (e) {}
    regionSelectorWindow = null;
  }
  if (mainWindow) {
    mainWindow.webContents.send('on-region-cancel');
  }
});

// Crop Border Controls
ipcMain.on('show-crop-border', (event, region) => {
  showCropBorder(region);
});

ipcMain.on('hide-crop-border', () => {
  hideCropBorder();
});

// Camera Overlay Controls
ipcMain.on('open-camera-overlay', (event, options = {}) => {
  const shape = options?.shape || 'circle';
  const size = options?.size || 190;
  const deviceId = options?.deviceId || '';
  const deviceLabel = options?.deviceLabel || '';
  const deviceIndex = options?.deviceIndex ?? 0;
  openCameraOverlay(shape, size, deviceId, deviceLabel, deviceIndex);
});

ipcMain.on('close-camera-overlay', () => {
  if (cameraOverlayWindow && !cameraOverlayWindow.isDestroyed()) {
    try {
      cameraOverlayWindow.webContents.send('stop-cam-feed');
      cameraOverlayWindow.destroy();
    } catch (e) {}
    cameraOverlayWindow = null;
  }
});

ipcMain.on('set-camera-shape', (event, shape) => {
  if (cameraOverlayWindow && !cameraOverlayWindow.isDestroyed()) {
    cameraOverlayWindow.webContents.send('update-cam-shape', shape);
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-cam-shape', shape);
  }
});

ipcMain.on('set-camera-size', (event, size) => {
  if (cameraOverlayWindow && !cameraOverlayWindow.isDestroyed()) {
    cameraOverlayWindow.setSize(size, size);
  }
});

ipcMain.on('set-camera-brightness', (event, val) => {
  if (cameraOverlayWindow && !cameraOverlayWindow.isDestroyed()) {
    cameraOverlayWindow.webContents.send('update-cam-brightness', val);
  }
});

ipcMain.on('set-camera-filters', (event, filters) => {
  if (cameraOverlayWindow && !cameraOverlayWindow.isDestroyed()) {
    cameraOverlayWindow.webContents.send('update-cam-filters', filters);
  }
});

ipcMain.on('set-camera-flipped', (event, flipped) => {
  if (cameraOverlayWindow && !cameraOverlayWindow.isDestroyed()) {
    cameraOverlayWindow.webContents.send('update-cam-flipped', flipped);
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-cam-flipped', flipped);
  }
});


// Toolbar Controls
ipcMain.on('show-toolbar', () => {
  openToolbar();
});

ipcMain.on('hide-toolbar', () => {
  if (toolbarWindow) {
    try {
      toolbarWindow.destroy();
    } catch (e) {}
    toolbarWindow = null;
  }
});

// Forward Toolbar Button Actions to Main Window
ipcMain.on('toolbar-action', (event, action) => {
  if (action === 'toggle-cam') {
    if (cameraOverlayWindow && !cameraOverlayWindow.isDestroyed()) {
      if (cameraOverlayWindow.isVisible()) cameraOverlayWindow.hide();
      else cameraOverlayWindow.show();
    } else {
      openCameraOverlay();
    }
  } else if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('from-toolbar', action);
  }
});

ipcMain.on('update-toolbar-timer', (event, timeStr) => {
  if (toolbarWindow) {
    toolbarWindow.webContents.send('sync-timer', timeStr);
  }
});

// Dynamic Island Transform Mode for Custom Crop
const ISLAND_WIDTH = 440;
const ISLAND_HEIGHT = 52;
const FULL_WIDTH = 640;
const FULL_HEIGHT = 740;

ipcMain.on('set-dynamic-island-mode', (event, { enabled, collapsed }) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    if (enabled) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
      if (collapsed) {
        const b = mainWindow.getBounds();
        const newX = Math.round(b.x + (b.width - ISLAND_WIDTH) / 2);
        mainWindow.setBounds({ x: newX, y: b.y, width: ISLAND_WIDTH, height: ISLAND_HEIGHT });
      } else {
        const b = mainWindow.getBounds();
        const newX = Math.round(b.x - (FULL_WIDTH - b.width) / 2);
        mainWindow.setBounds({ x: newX, y: b.y, width: FULL_WIDTH, height: FULL_HEIGHT });
      }
    } else {
      mainWindow.setAlwaysOnTop(false);
      const b = mainWindow.getBounds();
      const newX = Math.round(b.x - (FULL_WIDTH - b.width) / 2);
      mainWindow.setBounds({ x: newX, y: b.y, width: FULL_WIDTH, height: FULL_HEIGHT });
    }
  } catch (err) {
    console.warn('[Capto] Error changing dynamic island bounds:', err);
  }
});

// Save Recorded Video Buffer (with FFmpeg AAC/H.264 MP4 encoder for pristine audio)
ipcMain.handle('save-recording', async (event, { buffer, filename }) => {
  try {
    const targetDir = getRecordingsDir();
    const filePath = path.join(targetDir, filename);
    const nodeBuf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

    // If saving an MP4 video recording and ffmpeg is available, convert WebM capture to standard MP4 with pristine AAC audio
    if (filename.toLowerCase().endsWith('.mp4') && ffmpegPath && fs.existsSync(ffmpegPath)) {
      const tempWebm = path.join(app.getPath('temp'), `capto_raw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.webm`);
      try {
        fs.writeFileSync(tempWebm, nodeBuf);
        const converted = await new Promise((resolve) => {
          execFile(
            ffmpegPath,
            [
              '-y',
              '-i', tempWebm,
              '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
              '-c:v', 'libx264',
              '-pix_fmt', 'yuv420p',
              '-preset', 'ultrafast',
              '-crf', '20',
              '-c:a', 'aac',
              '-b:a', '192k',
              '-ar', '48000',
              '-movflags', '+faststart',
              filePath
            ],
            { timeout: 180000 },
            (err, stdout, stderr) => {
              try { if (fs.existsSync(tempWebm)) fs.unlinkSync(tempWebm); } catch (e) {}
              if (err) {
                console.warn('[Capto] FFmpeg conversion error, falling back to direct write:', err, stderr);
                resolve(false);
              } else {
                resolve(true);
              }
            }
          );
        });

        if (converted && fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
          console.log('[Capto] Saved pristine MP4 video with AAC audio:', filePath);
          return { success: true, filePath };
        }
      } catch (ffErr) {
        console.warn('[Capto] FFmpeg execution error:', ffErr);
      }
    }

    // Direct write fallback
    fs.writeFileSync(filePath, nodeBuf);
    console.log('[Capto] Saved recording:', filePath);
    return { success: true, filePath };
  } catch (err) {
    console.error('Error saving recording:', err);
    return { success: false, error: err.message };
  }
});

// List Saved Recordings
ipcMain.handle('get-recordings-list', async () => {
  try {
    const targetDir = getRecordingsDir();
    if (!fs.existsSync(targetDir)) {
      console.warn('[Capto] Recordings directory does not exist:', targetDir);
      return [];
    }
    const files = fs.readdirSync(targetDir);
    const mediaExts = ['.mp4', '.webm', '.mkv', '.mov', '.avi', '.wmv', '.flv', '.wav', '.mp3', '.m4a', '.ogg', '.aac', '.flac', '.png', '.jpg', '.jpeg'];
    const recordings = files
      .filter(f => {
        const lower = f.toLowerCase();
        return mediaExts.some(ext => lower.endsWith(ext));
      })
      .map(f => {
        const fullPath = path.join(targetDir, f);
        try {
          const stats = fs.statSync(fullPath);
          return {
            filename: f,
            fullPath,
            sizeBytes: stats.size,
            createdAt: stats.mtime
          };
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    console.log(`[Capto] Found ${recordings.length} media files in: ${targetDir}`);
    return recordings;
  } catch (err) {
    console.error('Error reading recordings:', err);
    return [];
  }
});

// Open Recordings Folder in File Explorer
ipcMain.on('open-recordings-folder', () => {
  const targetDir = getRecordingsDir();
  shell.openPath(targetDir);
});

// Reveal file in File Explorer
ipcMain.on('reveal-file', (event, filePath) => {
  shell.showItemInFolder(filePath);
});

// Delete Single Recording
ipcMain.handle('delete-recording', async (event, filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    }
    return { success: false, error: 'File does not exist' };
  } catch (err) {
    console.error('Error deleting recording:', err);
    return { success: false, error: err.message };
  }
});

// Clear / Delete All Recordings from Library
ipcMain.handle('clear-all-recordings', async () => {
  try {
    const targetDir = getRecordingsDir();
    if (!fs.existsSync(targetDir)) return { success: true, count: 0 };
    const files = fs.readdirSync(targetDir);
    const mediaExts = ['.mp4', '.webm', '.mkv', '.mov', '.avi', '.wmv', '.flv', '.wav', '.mp3', '.m4a', '.ogg', '.aac', '.flac', '.png', '.jpg', '.jpeg'];
    let deletedCount = 0;
    for (const f of files) {
      const lower = f.toLowerCase();
      if (mediaExts.some(ext => lower.endsWith(ext))) {
        const fullPath = path.join(targetDir, f);
        try {
          fs.unlinkSync(fullPath);
          deletedCount++;
        } catch (e) {
          console.warn('Could not delete:', fullPath, e);
        }
      }
    }
    return { success: true, count: deletedCount };
  } catch (err) {
    console.error('Error clearing recordings:', err);
    return { success: false, error: err.message };
  }
});

let currentPlayerData = null;

// Dedicated Large Media Player Popup Window for Library
function openMediaPlayerWindow(mediaData) {
  currentPlayerData = mediaData;
  if (playerWindow && !playerWindow.isDestroyed()) {
    playerWindow.show();
    playerWindow.focus();
    playerWindow.webContents.send('load-media', mediaData);
    return;
  }

  playerWindow = new BrowserWindow({
    title: 'Capto Media Player',
    width: 980,
    height: 640,
    minWidth: 580,
    minHeight: 420,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: true,
    center: true,
    resizable: true,
    icon: appIcon || appIconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });

  playerWindow.loadFile(path.join(__dirname, 'src', 'overlays', 'player.html'));

  playerWindow.webContents.once('did-finish-load', () => {
    if (playerWindow && !playerWindow.isDestroyed() && currentPlayerData) {
      playerWindow.webContents.send('load-media', currentPlayerData);
    }
  });

  playerWindow.on('closed', () => {
    playerWindow = null;
  });
}

ipcMain.on('open-media-player', (event, mediaData) => {
  openMediaPlayerWindow(mediaData);
});

ipcMain.on('player-ready', () => {
  if (currentPlayerData && playerWindow && !playerWindow.isDestroyed()) {
    playerWindow.webContents.send('load-media', currentPlayerData);
  }
});

ipcMain.on('player-minimize', () => {
  if (playerWindow && !playerWindow.isDestroyed()) {
    playerWindow.minimize();
  }
});

ipcMain.on('player-maximize', () => {
  if (playerWindow && !playerWindow.isDestroyed()) {
    if (playerWindow.isMaximized()) {
      playerWindow.unmaximize();
    } else {
      playerWindow.maximize();
    }
  }
});

ipcMain.on('player-close', () => {
  if (playerWindow && !playerWindow.isDestroyed()) {
    playerWindow.close();
  }
});

// AI Audio Noise Removal & Voice Clarifier for Saved Recordings
ipcMain.handle('denoise-media', async (event, { filePath }) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'Source file does not exist' };
    }

    if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
      return { success: false, error: 'FFmpeg encoder not available' };
    }

    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    
    // Create new clean file name, e.g. "Capto_FullScreen_..._Clean.mp4"
    const cleanFilename = `${baseName}_Clean${ext}`;
    const cleanFilePath = path.join(dir, cleanFilename);

    const isVideo = ['.mp4', '.webm', '.mkv', '.mov', '.avi'].includes(ext.toLowerCase());
    
    const ffmpegArgs = isVideo
      ? [
          '-y',
          '-i', filePath,
          '-c:v', 'copy',
          '-af', 'highpass=f=75,lowpass=f=12000,afftdn=nf=-25:tn=1,dynaudnorm=p=0.9:m=10',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-ar', '48000',
          cleanFilePath
        ]
      : [
          '-y',
          '-i', filePath,
          '-af', 'highpass=f=75,lowpass=f=12000,afftdn=nf=-25:tn=1,dynaudnorm=p=0.9:m=10',
          '-c:a', ext.toLowerCase() === '.wav' ? 'pcm_s16le' : 'aac',
          cleanFilePath
        ];

    console.log('[Capto] Running AI Noise Removal on:', filePath, '->', cleanFilePath);

    const result = await new Promise((resolve) => {
      execFile(ffmpegPath, ffmpegArgs, { timeout: 300000 }, (err, stdout, stderr) => {
        if (err) {
          console.warn('[Capto] AI Noise Removal error:', err, stderr);
          resolve({ success: false, error: err.message });
        } else {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('recordings-updated');
          }
          resolve({ success: true, cleanFilePath, cleanFilename });
        }
      });
    });

    return result;
  } catch (err) {
    console.error('Error during AI denoise:', err);
    return { success: false, error: err.message };
  }
});

