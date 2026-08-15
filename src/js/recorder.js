/**
 * CAPTO RECORDING ENGINE
 * Direct GPU Stream Capture, Camera Brightness Control, Custom Region Cropper, & Universal MediaRecorder
 */

class FligoRecorder {
  constructor() {
    this.screenStream = null;
    this.cameraStream = null;
    this.mixedAudioStream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];

    // State
    this.isRecording = false;
    this.isPaused = false;
    this.recordingStartTime = 0;
    this.elapsedSeconds = 0;
    this.timerInterval = null;

    // Modes: 'fullscreen' | 'region' | 'dual' | 'camera'
    this.currentMode = 'fullscreen';
    this.selectedRegion = null;
    this.cameraShape = 'circle';
    this.cameraSize = 180;
    this.cameraBrightnessPercent = 100;
    this.cameraDeviceId = '';

    // Offscreen Canvas for Region Cropping
    this.canvas = document.getElementById('compositor-canvas') || document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.compositorRafId = null;

    // Callbacks
    this.onTimerTick = null;
    this.onRecordingStateChange = null;
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

  setCameraDeviceId(deviceId) {
    this.cameraDeviceId = deviceId;
  }

  async startCamera(deviceId = '') {
    try {
      const targetDeviceId = deviceId || this.cameraDeviceId;
      const videoConstraints = targetDeviceId
        ? {
            deviceId: { exact: targetDeviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          }
        : {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          };

      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false
      });
      return this.cameraStream;
    } catch (err) {
      console.warn('Webcam not available:', err);
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
              chromeMediaSourceId: sourceId
            }
          }
        });
      } else {
        this.screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });
      }

      return this.screenStream;
    } catch (err) {
      console.error('Error starting screen stream:', err);
      return null;
    }
  }

  async startRecording(micStream = null, systemStream = null) {
    if (this.isRecording) return;

    if (!this.screenStream && this.currentMode !== 'camera') {
      await this.startScreenStream();
    }
    if ((this.currentMode === 'dual' || this.currentMode === 'camera') && !this.cameraStream) {
      await this.startCamera();
    }

    // Init Audio DSP pipeline
    let processedAudioStream = null;
    if (window.fligoAudioEngine) {
      processedAudioStream = await window.fligoAudioEngine.init(micStream, systemStream);
    }

    // Determine Video Track
    let videoTrack = null;
    const isRegion = this.currentMode === 'region' && this.selectedRegion;

    if (isRegion) {
      const previewVideo = document.getElementById('preview-video');
      const outWidth = this.selectedRegion.width;
      const outHeight = this.selectedRegion.height;
      this.canvas.width = outWidth;
      this.canvas.height = outHeight;

      const renderCropped = () => {
        if (!this.isRecording) return;
        if (previewVideo && previewVideo.readyState >= 2) {
          const rx = this.selectedRegion.x;
          const ry = this.selectedRegion.y;
          const rw = this.selectedRegion.width;
          const rh = this.selectedRegion.height;
          this.ctx.filter = 'none';
          this.ctx.drawImage(previewVideo, rx, ry, rw, rh, 0, 0, outWidth, outHeight);
        }
        this.compositorRafId = requestAnimationFrame(renderCropped);
      };
      renderCropped();

      const canvasStream = this.canvas.captureStream(60);
      videoTrack = canvasStream.getVideoTracks()[0];
    } else if (this.currentMode === 'camera') {
      videoTrack = this.cameraStream.getVideoTracks()[0];
    } else {
      videoTrack = this.screenStream.getVideoTracks()[0];
    }

    const combinedTracks = [videoTrack];
    if (processedAudioStream && processedAudioStream.getAudioTracks().length > 0) {
      combinedTracks.push(...processedAudioStream.getAudioTracks());
    }

    const finalStream = new MediaStream(combinedTracks);
    this.recordedChunks = [];

    const codecs = [
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
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

    this.mediaRecorder = new MediaRecorder(finalStream, {
      mimeType: chosenMime,
      videoBitsPerSecond: 8000000
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
    this.isRecording = false;
    this.isPaused = false;
    clearInterval(this.timerInterval);

    if (this.compositorRafId) {
      cancelAnimationFrame(this.compositorRafId);
      this.compositorRafId = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (window.electronAPI && window.electronAPI.recordingStopped) {
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

  async saveRecordingFile() {
    const isMp4 = this.selectedMimeType.includes('mp4');
    const extension = isMp4 ? 'mp4' : 'webm';
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
    const filename = `Capto_${this.currentMode}_${timestamp}.${extension}`;

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

    const previewVideo = document.getElementById('preview-video');
    const isRegion = this.currentMode === 'region' && this.selectedRegion;

    const outWidth = isRegion ? this.selectedRegion.width : (previewVideo.videoWidth || 1920);
    const outHeight = isRegion ? this.selectedRegion.height : (previewVideo.videoHeight || 1080);

    this.canvas.width = outWidth;
    this.canvas.height = outHeight;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.currentMode === 'camera') {
      this.ctx.filter = `brightness(${this.cameraBrightnessPercent}%)`;
      if (this.cameraStream) {
        const camVideo = document.createElement('video');
        camVideo.srcObject = this.cameraStream;
        await camVideo.play();
        this.ctx.drawImage(camVideo, 0, 0, this.canvas.width, this.canvas.height);
      }
    } else {
      this.ctx.filter = 'none';
      if (previewVideo && previewVideo.readyState >= 2) {
        if (isRegion) {
          const rx = this.selectedRegion.x;
          const ry = this.selectedRegion.y;
          const rw = this.selectedRegion.width;
          const rh = this.selectedRegion.height;
          this.ctx.drawImage(previewVideo, rx, ry, rw, rh, 0, 0, outWidth, outHeight);
        } else {
          this.ctx.drawImage(previewVideo, 0, 0, this.canvas.width, this.canvas.height);
        }
      }
    }

    const dataUrl = this.canvas.toDataURL('image/png');
    const date = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
    const filename = `Capto_Screenshot_${timestamp}.png`;
    
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

window.fligoRecorder = new FligoRecorder();
