/**
 * CAPTO RECORDER ENGINE
 * DirectX Screen Capture, Mirrored Selfie Webcam Compositor, Ultra-HD 16Mbps Bitrate, Real-Time Skin Smoothing & 60FPS MediaRecorder
 */

class CaptoRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.isPaused = false;
    this.timerInterval = null;
    this.elapsedSeconds = 0;
    this.recordingStartTime = 0;

    this.currentMode = 'fullscreen'; // 'fullscreen' | 'region' | 'dual' | 'camera'
    this.selectedRegion = null;      // { x, y, width, height }
    this.cameraShape = 'circle';     // 'circle' | 'rounded' | 'rect'
    this.cameraSize = 190;
    this.cameraDeviceId = '';
    this.cameraBrightnessPercent = 100;
    this.cameraSmoothnessPercent = 0;
    this.cameraNoiseReductionPercent = 0;
    this.isCameraFlipped = true; // Natural Horizontal Mirror / Flip for Selfie View

    this.screenStream = null;
    this.cameraStream = null;
    this.audioStream = null;

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.compositorIntervalId = null;
    this.cropVideoElement = null;
    this.camVideoElement = null;

    // Callbacks
    this.onRecordingStateChange = null;
    this.onTimerTick = null;
  }

  setMode(mode) {
    this.currentMode = mode;
  }

  setRegion(region) {
    this.selectedRegion = region;
  }

  setCameraShape(shape) {
    this.cameraShape = shape;
  }

  setCameraSize(size) {
    this.cameraSize = size;
  }

  setCameraBrightness(percent) {
    this.cameraBrightnessPercent = percent;
  }

  setCameraSmoothness(percent) {
    this.cameraSmoothnessPercent = percent;
  }

  setCameraNoiseReduction(percent) {
    this.cameraNoiseReductionPercent = percent;
  }

  setCameraFlipped(flipped) {
    this.isCameraFlipped = !!flipped;
  }

  setCameraDeviceId(deviceId) {
    this.cameraDeviceId = deviceId;
  }

  getCameraFilterString() {
    let finalBrightness = this.cameraBrightnessPercent + (this.cameraSmoothnessPercent * 0.08) + (this.cameraNoiseReductionPercent * 0.06);
    let finalContrast = 100 + (this.cameraSmoothnessPercent * 0.05) - (this.cameraNoiseReductionPercent * 0.08);
    let finalSaturate = 100 + (this.cameraSmoothnessPercent * 0.12) - (this.cameraNoiseReductionPercent * 0.06);
    let microSoftness = (this.cameraSmoothnessPercent / 100) * 0.25;

    let filters = [`brightness(${finalBrightness.toFixed(1)}%)`];
    if (Math.abs(finalContrast - 100) > 0.5) filters.push(`contrast(${finalContrast.toFixed(1)}%)`);
    if (Math.abs(finalSaturate - 100) > 0.5) filters.push(`saturate(${finalSaturate.toFixed(1)}%)`);
    if (microSoftness > 0.04) filters.push(`blur(${microSoftness.toFixed(2)}px)`);

    return filters.join(' ');
  }

  async startCamera(deviceId = '') {
    try {
      if (this.cameraStream) {
        try {
          this.cameraStream.getTracks().forEach(t => {
            t.stop();
            t.enabled = false;
          });
        } catch (e) {}
        this.cameraStream = null;
      }

      await new Promise(r => setTimeout(r, 200));
      const targetDeviceId = deviceId || this.cameraDeviceId;

      if (targetDeviceId) {
        try {
          this.cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: targetDeviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          });
        } catch (e1) {
          console.warn('Exact deviceId failed, attempting ideal:', e1);
          try {
            this.cameraStream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { ideal: targetDeviceId }
              },
              audio: false
            });
          } catch (e2) {
            this.cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          }
        }
      } else {
        this.cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
      }

      return this.cameraStream;
    } catch (err) {
      console.error('Webcam initialization failed:', err);
      return null;
    }
  }

  async stopCamera() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(t => t.stop());
      this.cameraStream = null;
    }
  }

  async startScreenStream(sourceId = null) {
    try {
      if (!sourceId && window.electronAPI && window.electronAPI.getDesktopSources) {
        const sources = await window.electronAPI.getDesktopSources();
        const screenSource = sources.find(s => s.id.startsWith('screen:')) || sources[0];
        if (screenSource) {
          sourceId = screenSource.id;
        }
      }

      if (sourceId) {
        this.screenStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId,
              minWidth: 1280,
              maxWidth: 3840,
              minHeight: 720,
              maxHeight: 2160,
              minFrameRate: 30,
              maxFrameRate: 60
            }
          }
        });
      } else {
        this.screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 60 } },
          audio: false
        });
      }
      return this.screenStream;
    } catch (err) {
      console.error('Error starting screen stream:', err);
      return null;
    }
  }

  async startRecording(micStream, systemAudioStream) {
    if (this.isRecording) return;

    try {
      if (!this.screenStream || this.screenStream.getVideoTracks().length === 0 || this.screenStream.getVideoTracks()[0].readyState === 'ended') {
        if (this.currentMode !== 'camera') {
          await this.startScreenStream();
        }
      }

      if ((this.currentMode === 'dual' || this.currentMode === 'camera') && (!this.cameraStream || this.cameraStream.getVideoTracks().length === 0 || this.cameraStream.getVideoTracks()[0].readyState === 'ended')) {
        await this.startCamera();
      }

      // Audio DSP Pipeline
      let processedAudioStream = null;
      try {
        if (window.fligoAudioEngine) {
          if (typeof window.fligoAudioEngine.buildAudioStream === 'function') {
            processedAudioStream = await window.fligoAudioEngine.buildAudioStream(micStream, systemAudioStream);
          } else if (typeof window.fligoAudioEngine.init === 'function') {
            processedAudioStream = await window.fligoAudioEngine.init(micStream, systemAudioStream);
          } else {
            processedAudioStream = micStream;
          }
        } else {
          processedAudioStream = micStream;
        }
      } catch (audioErr) {
        console.warn('Audio DSP fallback to raw mic:', audioErr);
        processedAudioStream = micStream;
      }

      const isRegion = this.currentMode === 'region' && this.selectedRegion;
      let videoTrack = null;

      if (isRegion) {
        if (!this.cropVideoElement) {
          this.cropVideoElement = document.createElement('video');
          this.cropVideoElement.muted = true;
          this.cropVideoElement.autoplay = true;
          this.cropVideoElement.playsInline = true;
        }
        this.cropVideoElement.srcObject = this.screenStream;
        this.cropVideoElement.play().catch(() => {});

        const screenTrack = this.screenStream ? this.screenStream.getVideoTracks()[0] : null;
        const settings = screenTrack && screenTrack.getSettings ? screenTrack.getSettings() : {};
        const nativeW = settings.width || window.screen.width * (window.devicePixelRatio || 1);
        const nativeH = settings.height || window.screen.height * (window.devicePixelRatio || 1);

        const outWidth = Math.max(2, Math.round(this.selectedRegion.width));
        const outHeight = Math.max(2, Math.round(this.selectedRegion.height));
        this.canvas.width = outWidth;
        this.canvas.height = outHeight;

        const rx = Math.max(0, Math.min(nativeW - outWidth, Math.round(this.selectedRegion.x)));
        const ry = Math.max(0, Math.min(nativeH - outHeight, Math.round(this.selectedRegion.y)));

        const drawFrame = () => {
          if (!this.isRecording) return;
          try {
            if (this.cropVideoElement && this.cropVideoElement.readyState >= 2) {
              this.ctx.drawImage(
                this.cropVideoElement,
                rx, ry, outWidth, outHeight,
                0, 0, outWidth, outHeight
              );
            }
          } catch (e) {}
        };

        drawFrame();

        if (this.compositorIntervalId) clearInterval(this.compositorIntervalId);
        this.compositorIntervalId = setInterval(drawFrame, 1000 / 60);

        const canvasStream = this.canvas.captureStream(60);
        videoTrack = canvasStream.getVideoTracks()[0];
      } else if (this.currentMode === 'camera') {
        // Mirrored Selfie View + Brightness & Smoothness Filter for Webcam Only Recording
        if (!this.camVideoElement) {
          this.camVideoElement = document.createElement('video');
          this.camVideoElement.muted = true;
          this.camVideoElement.autoplay = true;
          this.camVideoElement.playsInline = true;
        }
        this.camVideoElement.srcObject = this.cameraStream;
        this.camVideoElement.play().catch(() => {});

        const camTrack = this.cameraStream ? this.cameraStream.getVideoTracks()[0] : null;
        const settings = camTrack && camTrack.getSettings ? camTrack.getSettings() : {};
        const nativeW = settings.width || 1280;
        const nativeH = settings.height || 720;

        this.canvas.width = nativeW;
        this.canvas.height = nativeH;

        const drawCamFrame = () => {
          if (!this.isRecording) return;
          try {
            if (this.camVideoElement && this.camVideoElement.readyState >= 2) {
              this.ctx.save();
              this.ctx.clearRect(0, 0, nativeW, nativeH);
              // Face Brightness, Smoothness & Noise Reduction Filters
              this.ctx.filter = this.getCameraFilterString();
              if (this.isCameraFlipped) {
                // Natural Horizontal Mirror Flip
                this.ctx.translate(nativeW, 0);
                this.ctx.scale(-1, 1);
              }
              this.ctx.drawImage(this.camVideoElement, 0, 0, nativeW, nativeH);
              this.ctx.restore();
            }
          } catch (e) {}
        };

        drawCamFrame();

        if (this.compositorIntervalId) clearInterval(this.compositorIntervalId);
        this.compositorIntervalId = setInterval(drawCamFrame, 1000 / 60);

        const canvasStream = this.canvas.captureStream(60);
        videoTrack = canvasStream.getVideoTracks()[0];
      } else {
        videoTrack = this.screenStream ? this.screenStream.getVideoTracks()[0] : null;
      }

      if (!videoTrack) {
        console.error('No video track available to record');
        return;
      }

      const combinedTracks = [videoTrack];
      if (processedAudioStream && processedAudioStream.getAudioTracks().length > 0) {
        combinedTracks.push(...processedAudioStream.getAudioTracks());
      }

      const finalStream = new MediaStream(combinedTracks);
      this.recordedChunks = [];

      // High-Fidelity Codec Hierarchy (VP9 / H264 / AV1)
      const codecs = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=h264,opus',
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4'
      ];

      let chosenMime = '';
      for (const c of codecs) {
        if (MediaRecorder.isTypeSupported(c)) {
          chosenMime = c;
          break;
        }
      }
      if (!chosenMime) chosenMime = 'video/webm';
      this.selectedMimeType = chosenMime;

      // Ultra-HD High Bitrate (16 Mbps)
      this.mediaRecorder = new MediaRecorder(finalStream, {
        mimeType: chosenMime,
        videoBitsPerSecond: 16000000,
        audioBitsPerSecond: 256000
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        await this.saveRecordingFile();
      };

      this.mediaRecorder.start(1000);
      this.isRecording = true;
      this.isPaused = false;
      this.recordingStartTime = Date.now();
      this.elapsedSeconds = 0;

      this.startTimer();

      if (window.electronAPI && window.electronAPI.recordingStarted) {
        window.electronAPI.recordingStarted();
      }

      if (this.onRecordingStateChange) {
        this.onRecordingStateChange('recording');
      }
    } catch (err) {
      console.error('Error starting recording:', err);
    }
  }

  async startVoiceRecording(micStream, systemAudioStream = null) {
    try {
      this.currentMode = 'voice';

      // Audio DSP Pipeline
      let processedAudioStream = null;
      try {
        if (window.fligoAudioEngine) {
          if (typeof window.fligoAudioEngine.buildAudioStream === 'function') {
            processedAudioStream = await window.fligoAudioEngine.buildAudioStream(micStream, systemAudioStream);
          } else if (typeof window.fligoAudioEngine.init === 'function') {
            processedAudioStream = await window.fligoAudioEngine.init(micStream, systemAudioStream);
          } else {
            processedAudioStream = micStream;
          }
        } else {
          processedAudioStream = micStream;
        }
      } catch (audioErr) {
        console.warn('Voice DSP fallback to raw mic:', audioErr);
        processedAudioStream = micStream;
      }

      if (!processedAudioStream || processedAudioStream.getAudioTracks().length === 0) {
        console.error('No audio track available for voice recording');
        return;
      }

      const audioCodecs = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4'
      ];

      let chosenAudioMime = '';
      for (const ac of audioCodecs) {
        if (MediaRecorder.isTypeSupported(ac)) {
          chosenAudioMime = ac;
          break;
        }
      }
      if (!chosenAudioMime) chosenAudioMime = 'audio/webm';
      this.selectedMimeType = chosenAudioMime;

      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(processedAudioStream, {
        mimeType: chosenAudioMime,
        audioBitsPerSecond: 320000 // Ultra-high studio quality audio
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        await this.saveRecordingFile();
      };

      this.mediaRecorder.start(1000);
      this.isRecording = true;
      this.isPaused = false;
      this.recordingStartTime = Date.now();
      this.elapsedSeconds = 0;

      this.startTimer();

      // Only Video Recording auto-hides window and shows floating toolbar
      // Voice Recording keeps studio dashboard open so user can see live pitch & visualizers

      if (this.onRecordingStateChange) {
        this.onRecordingStateChange('recording');
      }
    } catch (err) {
      console.error('Error starting voice recording:', err);
    }
  }

  pauseRecording() {
    if (!this.isRecording) return;
    if (this.isPaused) {
      this.mediaRecorder.resume();
      this.isPaused = false;
      if (this.onRecordingStateChange) this.onRecordingStateChange('recording');
    } else {
      this.mediaRecorder.pause();
      this.isPaused = true;
      if (this.onRecordingStateChange) this.onRecordingStateChange('paused');
    }
  }

  async stopRecording() {
    if (!this.isRecording) return;
    const wasVoice = this.currentMode === 'voice';
    this.isRecording = false;
    this.isPaused = false;
    clearInterval(this.timerInterval);

    if (this.compositorIntervalId) {
      clearInterval(this.compositorIntervalId);
      this.compositorIntervalId = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // Only restore window / hide toolbar if it was a video recording that hid the window
    if (!wasVoice && window.electronAPI && window.electronAPI.recordingStopped) {
      window.electronAPI.recordingStopped();
    }

    if (this.onRecordingStateChange) {
      this.onRecordingStateChange('stopped');
    }
  }

  startTimer() {
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (!this.isPaused) {
        this.elapsedSeconds++;
        const hrs = String(Math.floor(this.elapsedSeconds / 3600)).padStart(2, '0');
        const mins = String(Math.floor((this.elapsedSeconds % 3600) / 60)).padStart(2, '0');
        const secs = String(this.elapsedSeconds % 60).padStart(2, '0');
        const timeStr = `${hrs}:${mins}:${secs}`;
        if (this.onTimerTick) {
          this.onTimerTick(timeStr);
        }
      }
    }, 1000);
  }

  fixWebmDuration(buffer, durationMs) {
    const view = new DataView(buffer);
    const len = buffer.byteLength;
    
    for (let i = 0; i < Math.min(len - 8, 4096); i++) {
      if (view.getUint8(i) === 0x44 && view.getUint8(i + 1) === 0x89) {
        const sizeByte = view.getUint8(i + 2);
        if (sizeByte === 0x88 && i + 11 < len) {
          view.setFloat64(i + 3, durationMs, false);
          return buffer;
        } else if (sizeByte === 0x84 && i + 7 < len) {
          view.setFloat32(i + 3, durationMs, false);
          return buffer;
        }
      }
    }
    return buffer;
  }

  getModeName() {
    switch (this.currentMode) {
      case 'voice': return 'Voice';
      case 'fullscreen': return 'FullScreen';
      case 'region': return 'CustomCrop';
      case 'dual': return 'Face+Screen';
      case 'camera': return 'WebcamOnly';
      default: return 'ScreenRecording';
    }
  }

  async saveRecordingFile() {
    const isVoice = this.currentMode === 'voice';
    const isMp4 = this.selectedMimeType.includes('mp4');
    const extension = isVoice ? 'webm' : (isMp4 ? 'mp4' : 'webm');
    const blob = new Blob(this.recordedChunks, { type: this.selectedMimeType });
    let arrayBuffer = await blob.arrayBuffer();

    const totalDurationMs = Math.max(1000, (this.elapsedSeconds || 1) * 1000);
    if (!isMp4) {
      arrayBuffer = this.fixWebmDuration(arrayBuffer, totalDurationMs);
    }

    const uint8Array = new Uint8Array(arrayBuffer);

    const date = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
    
    const modeLabel = this.getModeName();
    const filename = `Capto_${modeLabel}_${timestamp}.${extension}`;

    if (window.electronAPI && window.electronAPI.saveRecording) {
      const result = await window.electronAPI.saveRecording({
        buffer: uint8Array,
        filename
      });
      console.log('Saved recording to disk:', result);
      if (window.refreshGallery) {
        window.refreshGallery();
      }
    }
  }

  async takeScreenshot() {
    if (!this.screenStream && this.currentMode !== 'camera') {
      await this.startScreenStream();
    }
    if ((this.currentMode === 'dual' || this.currentMode === 'camera') && !this.cameraStream) {
      await this.startCamera();
    }

    const isRegion = this.currentMode === 'region' && this.selectedRegion;
    const screenTrack = this.screenStream ? this.screenStream.getVideoTracks()[0] : null;
    const settings = screenTrack && screenTrack.getSettings ? screenTrack.getSettings() : {};
    const nativeW = settings.width || 1920;
    const nativeH = settings.height || 1080;

    const outWidth = isRegion ? this.selectedRegion.width : nativeW;
    const outHeight = isRegion ? this.selectedRegion.height : nativeH;

    this.canvas.width = outWidth;
    this.canvas.height = outHeight;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.currentMode === 'camera') {
      this.ctx.filter = this.getCameraFilterString();
      if (this.cameraStream) {
        const camVideo = document.createElement('video');
        camVideo.muted = true;
        camVideo.autoplay = true;
        camVideo.srcObject = this.cameraStream;
        await camVideo.play().catch(() => {});

        this.ctx.save();
        if (this.isCameraFlipped) {
          this.ctx.translate(this.canvas.width, 0);
          this.ctx.scale(-1, 1);
        }
        this.ctx.drawImage(camVideo, 0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
      }
    } else {
      this.ctx.filter = 'none';
      if (!this.cropVideoElement) {
        this.cropVideoElement = document.createElement('video');
        this.cropVideoElement.muted = true;
        this.cropVideoElement.autoplay = true;
        this.cropVideoElement.playsInline = true;
      }
      this.cropVideoElement.srcObject = this.screenStream;
      await this.cropVideoElement.play().catch(() => {});

      if (isRegion) {
        const rx = Math.max(0, Math.min(nativeW - outWidth, Math.round(this.selectedRegion.x)));
        const ry = Math.max(0, Math.min(nativeH - outHeight, Math.round(this.selectedRegion.y)));
        this.ctx.drawImage(this.cropVideoElement, rx, ry, outWidth, outHeight, 0, 0, outWidth, outHeight);
      } else {
        this.ctx.drawImage(this.cropVideoElement, 0, 0, this.canvas.width, this.canvas.height);
      }
    }

    const dataUrl = this.canvas.toDataURL('image/png');
    const date = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
    
    const modeLabel = this.getModeName();
    const filename = `Capto_Screenshot_${modeLabel}_${timestamp}.png`;
    
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
    const binary = atob(base64Data);
    const uint8 = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      uint8[i] = binary.charCodeAt(i);
    }
    
    if (window.electronAPI && window.electronAPI.saveRecording) {
      await window.electronAPI.saveRecording({
        buffer: uint8,
        filename
      });
      if (window.refreshGallery) window.refreshGallery();
    }
  }
}

window.fligoRecorder = new CaptoRecorder();
