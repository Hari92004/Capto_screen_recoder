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

### 🎙️ 1. Offline Deep Neural Network AI Active Noise Cancellation (RNNoise WASM)
- **Zero Cloud Backend / 100% Offline**: Runs a lightweight recurrent neural network (RNN/GRU) directly on your local CPU via WebAssembly with zero internet requirements and zero subscription cost.
- **Total Background Noise Elimination**: Real-time AI filtering eliminates laptop fans, AC hums, background chatter, traffic, and mechanical keyboard clicks without muffling your natural voice.
- **Adjustable Studio ANC Strength**: Customize noise suppression intensity (Natural Studio to Maximum AI Suppression).
- **Adaptive True RMS Noise Gate**: Instantly mutes room noise when you pause speaking.
- **Vocal Clarity Booster**: Built-in 2.6kHz peaking filter for broadcast-grade voice presence.
- **Fail-Safe Hot-Swap Auto-Recovery**: If you unplug your earphones or Bluetooth headset during a recording, Capto automatically switches to your laptop's internal microphone in 0.1 seconds without interrupting or corrupting the video!
- **One-Click Mic Mute**: Dedicated mute/unmute button on both the studio dashboard and the floating toolbar.

### 🎙️ 2. Dedicated Voice Recording Studio with Live Pitch Tuner & Dual ANC Spectrum
- **Pure Voice Studio Tab**: Dedicated audio-only recording studio with zero video clutter.
- **Real-Time Pitch & Musical Note Detector**: Autocorrelation algorithm tracks fundamental pitch (Hz), nearest musical note (e.g. `D3`, `A4`), and vocal range classification (`Deep Bass`, `Baritone`, `Tenor`, `Soprano`).
- **Dual Real-Time Spectrum (Before vs After AI ANC)**: Side-by-side live canvas showcasing raw input (with noise spikes) vs deep neural clean output.
- **Voice Analytics**: Real-time dB volume meters, Voice Activity (VAD % confidence), and noise suppression cut depth.

### 📚 3. Multi-Category Studio Library (Videos & Voice Notes)
- **Segmented Filter Tabs**: Instant switching between `🎬 Videos`, `🎙️ Voice Notes`, and `All Items`.
- **Integrated Audio Player Cards**: Interactive waveform soundwave playback for voice recordings with instant reveal in File Explorer.

### 📊 4. Real-Time Live Audio VU Meter & Equalizer
- **Dynamic VU Level Bar**: Live 0% to 100% volume level tracking with color-graded thresholds (Green ➔ Orange ➔ Red).
- **12-Band Equalizer Waveform**: Smooth 60 FPS bouncing visualizer confirming microphone pickup.
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
