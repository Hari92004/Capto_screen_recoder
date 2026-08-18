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

## 📥 How to Download & Run

### 🔹 Option 1: Direct Download (Ready-to-Use Portable Desktop App)

Click below to download the direct standalone package for Windows:

| Platform | Direct 1-Click Download Link | Format |
| :--- | :--- | :--- |
| **🪟 Windows 10 / 11** | [⬇️ **Download Capto-Windows-Portable.zip (Direct)**](https://github.com/Hari92004/Capto_screen_recoder/releases/download/v1.0.0/Capto-Windows-Portable.zip) | `.zip` (Portable `.exe` included) |
| **🍎 macOS (Apple Silicon & Intel)** | [⬇️ **Download Capto.dmg (Direct)**](https://github.com/Hari92004/Capto_screen_recoder/releases/download/v1.0.0/Capto.dmg) | `.dmg` (Drag-to-Apps) |
| **🐧 Linux (Ubuntu, Debian, Fedora)** | [⬇️ **Download Capto.AppImage (Direct)**](https://github.com/Hari92004/Capto_screen_recoder/releases/download/v1.0.0/Capto.AppImage) | `.AppImage` (Executable) |

#### 🪟 Windows Quick Start:
1. Click **[Download Capto-Windows-Portable.zip](https://github.com/Hari92004/Capto_screen_recoder/releases/download/v1.0.0/Capto-Windows-Portable.zip)**.
2. Extract the downloaded zip file.
3. Double-click **`Capto Screen Recorder.exe`** to launch instantly without any installation!

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

---

## ✨ Key Features

### 🎙️ 1. Broadcast AI Voice Dynamics Compressor & Vocal Enhancer
- **Zero Latency Native DSP**: Powered by real-time Web Audio API with zero CPU overhead, zero delay, and natural studio vocal warmth.
- **Broadcast Studio Dynamics Compression**: Smoothly levels quiet whispers and loud speech without robotic muffling or clipping (-24dB threshold, 4:1 broadcast ratio).
- **Vocal Presence Booster**: Built-in 2.8kHz (+3.0dB) peaking equalizer for crisp, professional broadcast voice intelligibility.
- **Sub-Bass & Hum Elimination**: 80Hz High-Pass filter cuts desk vibrations and laptop chassis rumble, while a 55Hz notch filter eliminates electrical hum and AC fan drone.
- **Adaptive Studio Noise Gate**: Dynamically suppresses ambient room floor noise (-36dB) when you are not speaking.
- **Fail-Safe Hot-Swap Auto-Recovery**: If you unplug your earphones or Bluetooth headset during a recording, Capto automatically switches to your laptop's internal microphone in 0.1 seconds without interrupting or corrupting the recording!
- **One-Click Mic Mute**: Dedicated mute/unmute button on both the studio dashboard and the floating toolbar.

### 🎙️ 2. Dedicated Voice Recording Studio with Panoramic Oscilloscope & Pitch Tuner
- **Pure Voice Studio Tab**: Dedicated audio-only recording environment with real-time acoustics monitoring.
- **Panoramic Studio Vocal Oscilloscope**: 48 kHz HD real-time soundwave monitor animating vocal amplitude and harmonics.
- **Real-Time Pitch & Musical Note Detector**: Autocorrelation algorithm tracks fundamental pitch (Hz), nearest musical note (e.g. `D3`, `A4`), and vocal range classification (`Deep Bass`, `Baritone`, `Tenor`, `Soprano`).
- **Live Voice VU Meter & 16-Band Waveform Equalizer**: Smooth 60 FPS bouncing visualizer confirming microphone pickup with live dB readouts.
- **Active Dashboard Mode**: Voice recording keeps the Studio Dashboard open so you can monitor your pitch, volume levels, and visualizers live without unexpected window minimization!

### 📚 3. 2-Section Saved Media Library (Videos | Voice)
- **2-Segment Split Switcher**: Dedicated `🎬 Videos` and `🎙️ Voice` sections with real-time media count badges.
- **Interactive Video Preview Cards**: Instant video thumbnail playback with play/pause overlays, resolution/size indicators, and creation timestamps.
- **Interactive Voice Player Cards**: Audio soundwave playback with progress scrubbing, reveal in File Explorer, and safe deletion.
- **Universal Save Location**: One-click **"Open Folder"** jumps straight to `Videos/Screen Recordings`.

### 📊 4. Real-Time Studio VU Meter & Equalizer
- **Dynamic VU Level Bar**: Live 0% to 100% volume level tracking with color-graded thresholds (Green ➔ Orange ➔ Red).
- **16-Band Equalizer Waveform**: Smooth 60 FPS bouncing visualizer confirming microphone pickup.
- **Live Status Indicator**: Real-time badge switching between `Speaking...` and `Mic Ready` / `Muted`.

### 🎛️ 5. Hardware Device Selectors
- **Microphone Picker**: Easily choose between PC Internal Mic, Wired Earphones, USB Microphones, or Bluetooth Headsets.
- **Camera Picker**: Select between Built-in Webcams, External USB Cameras, Bluetooth Cameras, or Virtual Cameras (OBS/DroidCam).
- **Hotplug Auto-Refresh**: Device list automatically refreshes when hardware is connected or disconnected.

### ☀️ 6. Live Face Camera Brightness Controller
- Dedicated exposure/brightness slider (50% to 180%) allowing live lighting adjustment for webcam overlays while keeping screen recordings 100% natural.

### 📐 7. 4 Versatile Capture Modes
- **🖥️ Full Screen**: Native GPU-accelerated 60 FPS capture across monitors.
- **📐 Custom Crop**: Interactive drag-to-crop rectangle with pixel resolution tags.
- **✨ Screen + Face (Dual Mode)**: Floating, draggable shape-morphing webcam avatar (Circle / Card / 16:9) over the screen.
- **📷 Webcam Only**: Dedicated camera studio recording with natural selfie mirror reflection.

### 💎 8. Modern Glassmorphic Studio & Floating Island Toolbar
- **Smart Auto-Minimize on Video Record**: Video recording automatically minimizes the main window and summons the floating Dynamic Island toolbar.
- **Floating Island Pill**: Movable top pill with live timer, pause/resume, snapshot, and mic mute (automatically hidden from recorded output).
- **Universal Format Playback**: Generates clean **MP4 / WebM** files with patched EBML duration headers that play seamlessly in Windows Media Player, QuickTime, VLC, and web browsers.

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
