const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Desktop Capture Sources
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  recordingStarted: () => ipcRenderer.send('recording-started'),
  recordingStopped: () => ipcRenderer.send('recording-stopped'),

  // Region Selector
  openRegionSelector: () => ipcRenderer.send('open-region-selector'),
  sendRegionSelected: (region) => ipcRenderer.send('region-selected', region),
  cancelRegionSelector: () => ipcRenderer.send('cancel-region-selector'),
  onRegionSelected: (callback) => ipcRenderer.on('on-region-selected', (event, region) => callback(region)),

  // Crop Border Outline & Interactive Resize
  showCropBorder: (region) => ipcRenderer.send('show-crop-border', region),
  hideCropBorder: () => ipcRenderer.send('hide-crop-border'),
  updateCropBounds: (bounds) => ipcRenderer.send('update-crop-bounds', bounds),
  setCropMouseEvents: (ignore, forward) => ipcRenderer.send('set-crop-mouse-events', { ignore, forward }),
  onSyncCropDimensions: (callback) => ipcRenderer.on('sync-crop-dimensions', (event, dimStr) => callback(dimStr)),
  onLockCropBorder: (callback) => ipcRenderer.on('lock-crop-border', () => callback()),
  onUnlockCropBorder: (callback) => ipcRenderer.on('unlock-crop-border', () => callback()),

  // Floating Camera Overlay
  openCameraOverlay: (options) => ipcRenderer.send('open-camera-overlay', options),
  closeCameraOverlay: () => ipcRenderer.send('close-camera-overlay'),
  setCameraShape: (shape) => ipcRenderer.send('set-camera-shape', shape),
  setCameraSize: (size) => ipcRenderer.send('set-camera-size', size),
  setCameraBrightness: (val) => ipcRenderer.send('set-camera-brightness', val),
  setCameraFilters: (filters) => ipcRenderer.send('set-camera-filters', filters),
  setCameraFlipped: (flipped) => ipcRenderer.send('set-camera-flipped', flipped),
  onInitCamSettings: (callback) => ipcRenderer.on('init-cam-settings', (event, data) => callback(data)),
  onUpdateCamSettings: (callback) => ipcRenderer.on('update-cam-settings', (event, data) => callback(data)),
  onUpdateCamShape: (callback) => ipcRenderer.on('update-cam-shape', (event, shape) => callback(shape)),
  onUpdateCamBrightness: (callback) => ipcRenderer.on('update-cam-brightness', (event, val) => callback(val)),
  onUpdateCamFilters: (callback) => ipcRenderer.on('update-cam-filters', (event, filters) => callback(filters)),
  onUpdateCamFlipped: (callback) => ipcRenderer.on('update-cam-flipped', (event, flipped) => callback(flipped)),
  onStopCamFeed: (callback) => ipcRenderer.on('stop-cam-feed', () => callback()),


  // Floating Dynamic Island Toolbar
  showToolbar: () => ipcRenderer.send('show-toolbar'),
  hideToolbar: () => ipcRenderer.send('hide-toolbar'),
  sendToolbarAction: (action) => ipcRenderer.send('toolbar-action', action),
  updateToolbarTimer: (timeStr) => ipcRenderer.send('update-toolbar-timer', timeStr),
  onFromToolbar: (callback) => ipcRenderer.on('from-toolbar', (event, action) => callback(action)),
  onSyncTimer: (callback) => ipcRenderer.on('sync-timer', (event, timeStr) => callback(timeStr)),

  // Hotkeys
  onHotkeyRecord: (callback) => ipcRenderer.on('hotkey-toggle-record', () => callback()),
  onHotkeyPause: (callback) => ipcRenderer.on('hotkey-toggle-pause', () => callback()),

  // Recording Storage & Files
  saveRecording: (data) => ipcRenderer.invoke('save-recording', data),
  getRecordingsList: () => ipcRenderer.invoke('get-recordings-list'),
  deleteRecording: (filePath) => ipcRenderer.invoke('delete-recording', filePath),
  clearAllRecordings: () => ipcRenderer.invoke('clear-all-recordings'),
  openRecordingsFolder: () => ipcRenderer.send('open-recordings-folder'),
  revealFile: (filePath) => ipcRenderer.send('reveal-file', filePath)
});

