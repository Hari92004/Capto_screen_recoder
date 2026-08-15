<div align="center">

# 🎬 CAPTO SCREEN RECORDER
### Free & Open-Source Cross-Platform Studio (Windows • macOS • Linux)
#### Built with Modern Glassmorphic Aesthetics • Hardware AI Noise Suppression • Dynamic Audio Visualizer

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-5E5CE6.svg)](https://github.com/Hari92004/Capto_screen_recoder)
[![UI Design](https://img.shields.io/badge/UI%20Design-Glassmorphism-0A84FF.svg)](https://github.com/Hari92004/Capto_screen_recoder)
[![Audio DSP](https://img.shields.io/badge/Audio%20DSP-AI%20Noise%20Gate%20%26%20Silence%20Removal-30D158.svg)](https://github.com/Hari92004/Capto_screen_recoder)
[![Output](https://img.shields.io/badge/Output-Universal%20MP4%20%26%20WebM-FF9F0A.svg)](https://github.com/Hari92004/Capto_screen_recoder)

*A modern, lightweight, high-performance, 100% free PC screen recording studio with zero watermarks, no time limits, and crystal-clear audio.*

---

</div>

## 📥 How to Download & Install

### 🔹 Option 1: Direct Download (.exe & Desktop Installers)

Click below to download the direct standalone executable for your operating system:

| Platform | Direct 1-Click Download Link | Format |
| :--- | :--- | :--- |
| **🪟 Windows 10 / 11** | [⬇️ **Download Capto-Setup.exe (Direct)**](https://github.com/Hari92004/Capto_screen_recoder/releases/download/v1.0.0/Capto-Setup.exe) | `.exe` (Installer) |
| **🍎 macOS (Apple Silicon & Intel)** | [⬇️ **Download Capto.dmg (Direct)**](https://github.com/Hari92004/Capto_screen_recoder/releases/download/v1.0.0/Capto.dmg) | `.dmg` (Drag-to-Apps) |
| **🐧 Linux (Ubuntu, Debian, Fedora)** | [⬇️ **Download Capto.AppImage (Direct)**](https://github.com/Hari92004/Capto_screen_recoder/releases/download/v1.0.0/Capto.AppImage) | `.AppImage` (Executable) |

#### 🪟 Windows Quick Install:
1. Click **[Download Capto-Setup.exe](https://github.com/Hari92004/Capto_screen_recoder/releases/download/v1.0.0/Capto-Setup.exe)** to start direct download.
2. Double-click the downloaded `.exe` file (desktop shortcut created automatically).
3. Launch **Capto Screen Recorder** and start recording!

#### 🍎 macOS Quick Install:
1. Click **[Download Capto.dmg](https://github.com/Hari92004/Capto_screen_recoder/releases/download/v1.0.0/Capto.dmg)** to start direct download.
2. Open the `.dmg` file and drag **Capto** into your **Applications** folder.
3. Open from Launchpad (*Grant Screen Recording and Camera permissions when prompted*).

#### 🐧 Linux Quick Install:
1. Click **[Download Capto.AppImage](https://github.com/Hari92004/Capto_screen_recoder/releases/download/v1.0.0/Capto.AppImage)** to start direct download.
2. Make it executable: `chmod +x Capto.AppImage`.
3. Double-click or run `./Capto.AppImage`.

---

### 🔹 Option 2: Run & Build From Source

If you are a developer and want to run or package Capto locally:

```bash
# 1. Clone the repository
git clone https://github.com/Hari92004/Capto_screen_recoder.git
cd Capto_screen_recoder

# 2. Install dependencies
npm install

# 3. Launch Capto in Development Mode
npm start
```

#### Package Standalone Installers:
```bash
npm run dist:win     # Generates Windows .exe installer & portable in dist/
npm run dist:mac     # Generates macOS .dmg installer in dist/
npm run dist:linux   # Generates Linux .AppImage & .deb in dist/
npm run dist:all     # Build packages for all platforms
```

---

## ✨ Key Features

### 🎙️ 1. Hardware AI Noise Suppression & Dynamic Noise Gate
- **Background Noise Elimination**: Removes laptop cooling fans, AC hums, background hiss, and mechanical keyboard clicks in real time without third-party paid API keys.
- **Adaptive True RMS Noise Gate**: Instantly mutes background room noise (-28dB silence floor) when you pause speaking.
- **Vocal Clarity Booster**: Built-in 2.5kHz peaking filter for broadcast-grade voice presence.
- **Fail-Safe Hot-Swap Auto-Recovery**: If you unplug your earphones or Bluetooth headset during a recording, Capto automatically switches to your laptop's internal microphone in 0.1 seconds without interrupting or corrupting the video!
- **One-Click Mic Mute**: Dedicated mute/unmute button on both the studio dashboard and the floating toolbar.

### 📊 2. Real-Time Live Audio VU Meter & Equalizer
- **Dynamic VU Level Bar**: Live 0% to 100% volume level tracking with color-graded thresholds (Green ➔ Orange ➔ Red).
- **12-Band Equalizer Waveform**: Smooth 60 FPS bouncing visualizer confirming microphone pickup.
- **Live Status Indicator**: Real-time badge switching between `Speaking...` and `Mic Ready` / `Muted`.

### 🎛️ 3. Hardware Device Selectors
- **Microphone Picker**: Easily choose between PC Internal Mic, Wired Earphones, USB Microphones, or Bluetooth Headsets.
- **Camera Picker**: Select between Built-in Webcams, External USB Cameras, Bluetooth Cameras, or Virtual Cameras (OBS/DroidCam).
- **Hotplug Auto-Refresh**: Device list automatically refreshes when hardware is connected or disconnected.

### ☀️ 4. Live Face Camera Brightness Controller
- Dedicated exposure/brightness slider (50% to 180%) allowing live lighting adjustment for webcam overlays while keeping screen recordings 100% natural.

### 📐 5. 4 Versatile Capture Modes
- **🖥️ Full Screen**: Native GPU-accelerated 60 FPS capture across monitors.
- **📐 Custom Crop**: Interactive drag-to-crop rectangle with pixel resolution tags.
- **✨ Screen + Face (Dual Mode)**: Floating, draggable shape-morphing webcam avatar (Circle / Card / 16:9) over the screen.
- **📷 Webcam Only**: Dedicated camera studio recording with natural selfie mirror reflection.

### 💎 6. Modern Glassmorphic Studio & Floating Island Toolbar
- **Auto-Minimize on Record**: Studio dashboard automatically minimizes to taskbar when recording starts.
- **Floating Island Pill**: Movable top pill with live timer, pause/resume, snapshot, and mic mute (automatically hidden from recorded output).
- **Universal Format Playback**: Generates clean **MP4 / WebM** files with patched EBML duration headers that play seamlessly in Windows Media Player, QuickTime, VLC, and web browsers.
- **Dedicated Save Folder**: All recordings and screenshots are saved in `Videos/Screen Recordings`.

---

## ⌨️ Global Keyboard Shortcuts

| Windows / Linux | macOS | Action |
| :--- | :--- | :--- |
| **`F9`** or **`Ctrl + Shift + R`** | **`Cmd + Shift + R`** | Start / Stop Recording |
| **`F10`** or **`Ctrl + Shift + P`** | **`Cmd + Shift + P`** | Pause / Resume Recording |
| **`F11`** or **`Ctrl + Shift + C`** | **`Cmd + Shift + C`** | Toggle Floating Webcam Overlay |

---

## 📂 Saved Files Location

All recordings and screenshots are automatically saved to:
- **Windows**: `C:\Users\<Username>\Videos\Screen Recordings`
- **macOS**: `/Users/<Username>/Movies/Screen Recordings`
- **Linux**: `/home/<Username>/Videos/Screen Recordings`

*You can also click the **"Library" ➔ "Open in Folder"** button inside the app to jump directly to your recorded files.*

---

## 🏗️ Project Structure

```
capto/
├── main.js                  # Electron Main Process (DirectX capturer, Window manager, Hotkeys)
├── preload.js               # Secure IPC Context Bridge
├── src/
│   ├── index.html           # Main Studio Dashboard
│   ├── styles/
│   │   └── main.css         # Glassmorphic Design System
│   ├── js/
│   │   ├── app.js           # Studio controller, Device management, Hotplug & VU visualizer
│   │   ├── recorder.js      # Direct GPU Stream Capture, Brightness filter & MediaRecorder
│   │   ├── audio-dsp.js     # Web Audio API Noise Gate, Voice Enhancer & Silence Trimmer
│   │   └── gallery.js       # Saved video library & thumbnail gallery
│   ├── overlays/
│   │   ├── region-selector.html # Transparent drag-and-drop screen cropper
│   │   ├── camera-overlay.html  # Floating draggable shape-morphing webcam window
│   │   └── toolbar.html         # Floating Dynamic Island recording bar
│   └── assets/
│       └── icon.png         # 3D Glassmorphic Application Icon
├── requirements.txt         # Software Requirements Specification (Text)
├── package.json             # Build configuration & scripts
└── README.md                # Project documentation
```

---

## 📄 License
This project is open-source and licensed under the [MIT License](LICENSE).
