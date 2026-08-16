/**
 * CAPTO APP CONTROLLER
 * Device Enumeration, Fail-Safe Audio Hotplug, Interactive Resizable Crop Border & VU Visualizer
 */

document.addEventListener('DOMContentLoaded', async () => {
  const btnClose = document.getElementById('btn-close');
  const btnMinimize = document.getElementById('btn-minimize');

  const tabStudio = document.getElementById('tab-studio');
  const tabGallery = document.getElementById('tab-gallery');
  const studioView = document.getElementById('studio-view');
  const galleryView = document.getElementById('gallery-view');

  const modeItems = document.querySelectorAll('.mode-item');
  const regionActionBar = document.getElementById('region-action-bar');
  const regionCoordsText = document.getElementById('region-coords-text');
  const btnReselectRegion = document.getElementById('btn-reselect-region');

  const previewVideo = document.getElementById('preview-video');
  const pipCameraBox = document.getElementById('pip-camera-box');
  const pipCameraVideo = document.getElementById('pip-camera-video');

  const selectMicDevice = document.getElementById('select-mic-device');
  const selectCamDevice = document.getElementById('select-cam-device');
  const groupCamDevice = document.getElementById('group-cam-device');
  const rowCamBrightness = document.getElementById('row-cam-brightness');
  const rowCamShape = document.getElementById('row-cam-shape');
  const micStatusLabel = document.getElementById('mic-status-label');
  const vuMeterFill = document.getElementById('vu-meter-fill');
  const eqBars = document.querySelectorAll('.eq-bar');
  const miniBars = document.querySelectorAll('.mini-bar');
  const audioPulseDot = document.getElementById('audio-pulse-dot');
  const previewAudioText = document.getElementById('preview-audio-text');

  const btnToggleRecord = document.getElementById('btn-toggle-record');
  const btnRecordLabel = document.getElementById('btn-record-label');
  const btnToggleMute = document.getElementById('btn-toggle-mute');
  const muteBtnIcon = document.getElementById('mute-btn-icon');
  const btnScreenshot = document.getElementById('btn-screenshot');
  const mainTimer = document.getElementById('main-timer');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');

  const sliderBrightness = document.getElementById('slider-brightness');
  const brightnessValText = document.getElementById('brightness-val-text');
  const rowCamBrightness = document.getElementById('row-cam-brightness');

  const sliderSmoothness = document.getElementById('slider-smoothness');
  const smoothnessValText = document.getElementById('smoothness-val-text');
  const rowCamSmoothness = document.getElementById('row-cam-smoothness');

  const sliderNoiseReduction = document.getElementById('slider-noise-reduction');
  const noiseReductionValText = document.getElementById('noise-reduction-val-text');
  const rowCamNoiseReduction = document.getElementById('row-cam-noise-reduction');

  const toggleNoiseSuppression = document.getElementById('toggle-noise-suppression');
  const toggleSilenceRemoval = document.getElementById('toggle-silence-removal');
  const toggleSystemAudio = document.getElementById('toggle-system-audio');
  const shapeOptBtns = document.querySelectorAll('.shape-opt-btn');

  let currentScreenStream = null;
  let currentMicStream = null;
  let currentCamStream = null;
  let selectedMicId = '';
  let selectedCamId = '';
  let isMicMuted = false;

  // Web Audio Visualizer Pipeline
  let audioCtx = null;
  let analyser = null;
  let micSourceNode = null;
  let visualizerRafId = null;

  // Window Controls
  if (window.electronAPI) {
    if (btnClose) btnClose.addEventListener('click', () => window.electronAPI.closeWindow());
    if (btnMinimize) btnMinimize.addEventListener('click', () => window.electronAPI.minimizeWindow());
  }

  // Navigation Tabs
  tabStudio.addEventListener('click', () => {
    tabStudio.classList.add('active');
    tabGallery.classList.remove('active');
    studioView.style.display = 'flex';
    galleryView.classList.remove('active');
    if (window.fligoGallery && window.fligoGallery.pauseAllVideos) {
      window.fligoGallery.pauseAllVideos();
    }
  });

  tabGallery.addEventListener('click', () => {
    tabGallery.classList.add('active');
    tabStudio.classList.remove('active');
    studioView.style.display = 'none';
    galleryView.classList.add('active');
    if (window.refreshGallery) window.refreshGallery();
  });

  // Toggle Microphone Mute / Unmute
  function toggleMicMute() {
    isMicMuted = !isMicMuted;
    
    if (currentMicStream) {
      currentMicStream.getAudioTracks().forEach(track => {
        track.enabled = !isMicMuted;
      });
    }

    if (window.fligoAudioEngine) {
      window.fligoAudioEngine.setMute(isMicMuted);
    }

    if (muteBtnIcon) muteBtnIcon.textContent = isMicMuted ? '🔇' : '🎙️';
    if (btnToggleMute) {
      btnToggleMute.style.background = isMicMuted ? 'rgba(255, 69, 58, 0.35)' : '';
      btnToggleMute.style.borderColor = isMicMuted ? '#FF453A' : '';
    }

    if (isMicMuted) {
      if (micStatusLabel) {
        micStatusLabel.textContent = 'Muted';
        micStatusLabel.style.color = '#FF453A';
        micStatusLabel.style.background = 'rgba(255, 69, 58, 0.15)';
      }
      if (audioPulseDot) {
        audioPulseDot.style.background = '#FF453A';
        audioPulseDot.style.boxShadow = '0 0 6px #FF453A';
      }
      if (previewAudioText) previewAudioText.textContent = 'MUTED';
      if (vuMeterFill) vuMeterFill.style.width = '0%';
    } else {
      if (micStatusLabel) {
        micStatusLabel.textContent = 'Mic Active';
        micStatusLabel.style.color = '#30D158';
        micStatusLabel.style.background = 'rgba(48, 209, 88, 0.15)';
      }
      if (audioPulseDot) {
        audioPulseDot.style.background = '#30D158';
        audioPulseDot.style.boxShadow = '0 0 6px #30D158';
      }
      if (previewAudioText) previewAudioText.textContent = 'MIC ON';
    }
  }

  if (btnToggleMute) {
    btnToggleMute.addEventListener('click', toggleMicMute);
  }

  // Audio VU Visualizer Loop
  function startVisualizer(stream) {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      if (micSourceNode) {
        micSourceNode.disconnect();
      }

      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.6;

      micSourceNode = audioCtx.createMediaStreamSource(stream);
      micSourceNode.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      if (visualizerRafId) cancelAnimationFrame(visualizerRafId);

      const updateVisualizer = () => {
        if (isMicMuted) {
          if (vuMeterFill) vuMeterFill.style.width = '0%';
          eqBars.forEach(b => b.style.height = '3px');
          miniBars.forEach(mb => mb.style.height = '3px');
          visualizerRafId = requestAnimationFrame(updateVisualizer);
          return;
        }

        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const percent = Math.min(100, Math.round((avg / 128) * 100));

        if (vuMeterFill) {
          vuMeterFill.style.width = `${percent}%`;
        }

        eqBars.forEach((bar, idx) => {
          const val = dataArray[idx % bufferLength] || 0;
          const h = Math.max(3, Math.round((val / 255) * 14));
          bar.style.height = `${h}px`;
          if (val > 140) {
            bar.style.background = '#FF9F0A';
          } else if (val > 60) {
            bar.style.background = '#30D158';
          } else {
            bar.style.background = 'rgba(48, 209, 88, 0.4)';
          }
        });

        miniBars.forEach((mBar, idx) => {
          const val = dataArray[idx * 2] || 0;
          const mh = Math.max(3, Math.round((val / 255) * 10));
          mBar.style.height = `${mh}px`;
        });

        if (percent > 8) {
          if (micStatusLabel) {
            micStatusLabel.textContent = 'Speaking...';
            micStatusLabel.style.color = '#30D158';
            micStatusLabel.style.background = 'rgba(48, 209, 88, 0.2)';
          }
          if (audioPulseDot) audioPulseDot.style.transform = 'scale(1.3)';
          if (previewAudioText) previewAudioText.textContent = 'MIC ON';
        } else {
          if (micStatusLabel) {
            micStatusLabel.textContent = 'Mic Active';
            micStatusLabel.style.color = 'rgba(235, 235, 245, 0.6)';
            micStatusLabel.style.background = 'rgba(255, 255, 255, 0.08)';
          }
          if (audioPulseDot) audioPulseDot.style.transform = 'scale(1)';
          if (previewAudioText) previewAudioText.textContent = 'MIC IDLE';
        }

        visualizerRafId = requestAnimationFrame(updateVisualizer);
      };

      updateVisualizer();
    } catch (err) {
      console.warn('Visualizer init error:', err);
    }
  }

  // Enumerate Audio & Video Input Devices
  async function loadDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      selectMicDevice.innerHTML = '';
      if (audioInputs.length === 0) {
        selectMicDevice.innerHTML = '<option value="">Default Microphone</option>';
      } else {
        audioInputs.forEach((device, index) => {
          const opt = document.createElement('option');
          opt.value = device.deviceId;
          opt.textContent = device.label || `Microphone ${index + 1}`;
          if (device.deviceId === selectedMicId) opt.selected = true;
          selectMicDevice.appendChild(opt);
        });
      }

      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      selectCamDevice.innerHTML = '';
      if (videoInputs.length === 0) {
        selectCamDevice.innerHTML = '<option value="">Default Camera</option>';
      } else {
        videoInputs.forEach((device, index) => {
          const opt = document.createElement('option');
          opt.value = device.deviceId;
          opt.textContent = device.label || `Camera ${index + 1}`;
          if (device.deviceId === selectedCamId) opt.selected = true;
          selectCamDevice.appendChild(opt);
        });
      }
    } catch (err) {
      console.warn('Error enumerating devices:', err);
    }
  }

  await loadDevices();

  // Smart Hot-Swap Auto-Recovery
  if (navigator.mediaDevices.ondevicechange !== undefined) {
    navigator.mediaDevices.ondevicechange = async () => {
      await loadDevices();
      if (!currentMicStream || currentMicStream.getAudioTracks().length === 0 || currentMicStream.getAudioTracks()[0].readyState === 'ended') {
        await updateMicrophone('');
      }
    };
  }

  // Request Microphone Stream
  async function updateMicrophone(deviceId = '') {
    try {
      selectedMicId = deviceId;
      if (currentMicStream) {
        currentMicStream.getTracks().forEach(t => t.stop());
      }
      
      const isNoiseEnabled = toggleNoiseSuppression ? toggleNoiseSuppression.checked : true;
      const audioConstraints = {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: isNoiseEnabled,
        noiseSuppression: isNoiseEnabled,
        autoGainControl: true,
        channelCount: 2,
        sampleRate: 48000,
        googEchoCancellation: isNoiseEnabled,
        googAutoGainControl: true,
        googNoiseSuppression: isNoiseEnabled,
        googHighpassFilter: isNoiseEnabled,
        googTypingNoiseDetection: isNoiseEnabled
      };

      currentMicStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false });
      
      const audioTrack = currentMicStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.onended = async () => {
          await updateMicrophone('');
        };
      }

      if (isMicMuted) {
        currentMicStream.getAudioTracks().forEach(t => t.enabled = false);
      }
      
      startVisualizer(currentMicStream);
    } catch (err) {
      console.warn('Microphone permission not granted or device lost:', err);
      if (deviceId !== '') {
        await updateMicrophone('');
      } else if (micStatusLabel) {
        micStatusLabel.textContent = 'Mic Disabled';
        micStatusLabel.style.color = '#FF453A';
      }
    }
  }

  selectMicDevice.addEventListener('change', (e) => {
    updateMicrophone(e.target.value);
  });

  selectCamDevice.addEventListener('change', async (e) => {
    selectedCamId = e.target.value;
    const selectedCamLabel = selectCamDevice.options[selectCamDevice.selectedIndex] ? selectCamDevice.options[selectCamDevice.selectedIndex].text : '';
    window.fligoRecorder.setCameraDeviceId(selectedCamId);

    if (window.fligoRecorder.currentMode === 'camera') {
      await stopCameraFeeds();
      currentCamStream = await window.fligoRecorder.startCamera(selectedCamId);
      if (currentCamStream && previewVideo) {
        previewVideo.srcObject = currentCamStream;
        previewVideo.play().catch(() => {});
      }
    } else if (window.fligoRecorder.currentMode === 'dual') {
      if (window.electronAPI && window.electronAPI.openCameraOverlay) {
        window.electronAPI.openCameraOverlay({
          shape: window.fligoRecorder.cameraShape,
          size: window.fligoRecorder.cameraSize,
          deviceId: selectedCamId,
          deviceLabel: selectedCamLabel
        });
      }
    }
  });

  // Strict Hardware Camera Killer
  async function stopCameraFeeds() {
    if (currentCamStream) {
      currentCamStream.getTracks().forEach(t => t.stop());
      currentCamStream = null;
    }
    if (pipCameraVideo && pipCameraVideo.srcObject) {
      pipCameraVideo.srcObject.getTracks().forEach(t => t.stop());
      pipCameraVideo.srcObject = null;
    }
    if (previewVideo && previewVideo.srcObject && window.fligoRecorder.currentMode !== 'camera' && previewVideo.srcObject !== currentScreenStream) {
      previewVideo.srcObject.getTracks().forEach(t => t.stop());
    }
    await window.fligoRecorder.stopCamera();
    if (window.electronAPI && window.electronAPI.closeCameraOverlay) {
      window.electronAPI.closeCameraOverlay();
    }
  }

  // Unified Camera Filter Broadcaster (Brightness, Smoothness & Noise Reduction)
  function broadcastCameraFilters() {
    const b = sliderBrightness ? parseInt(sliderBrightness.value) : 100;
    const s = sliderSmoothness ? parseInt(sliderSmoothness.value) : 0;
    const n = sliderNoiseReduction ? parseInt(sliderNoiseReduction.value) : 0;

    if (window.fligoRecorder) {
      window.fligoRecorder.setCameraBrightness(b);
      window.fligoRecorder.setCameraSmoothness(s);
      window.fligoRecorder.setCameraNoiseReduction(n);
    }

    if (window.fligoRecorder.currentMode === 'camera' && previewVideo) {
      previewVideo.style.filter = window.fligoRecorder.getCameraFilterString();
    }

    if (window.electronAPI && window.electronAPI.setCameraFilters) {
      window.electronAPI.setCameraFilters({
        brightness: b,
        smoothness: s,
        noiseReduction: n
      });
    }
  }

  // Camera Sliders Event Listeners
  if (sliderBrightness) {
    sliderBrightness.addEventListener('input', (e) => {
      if (sliderBrightness.disabled) return;
      const val = parseInt(e.target.value);
      if (brightnessValText) brightnessValText.textContent = `${val}%`;
      broadcastCameraFilters();
    });
  }

  if (sliderSmoothness) {
    sliderSmoothness.addEventListener('input', (e) => {
      if (sliderSmoothness.disabled) return;
      const val = parseInt(e.target.value);
      if (smoothnessValText) smoothnessValText.textContent = `${val}%`;
      broadcastCameraFilters();
    });
  }

  if (sliderNoiseReduction) {
    sliderNoiseReduction.addEventListener('input', (e) => {
      if (sliderNoiseReduction.disabled) return;
      const val = parseInt(e.target.value);
      if (noiseReductionValText) noiseReductionValText.textContent = `${val}%`;
      broadcastCameraFilters();
    });
  }

  // Freeze / Unfreeze Camera Controls helper
  function updateCamControlsState(isCameraMode) {
    const rows = [rowCamBrightness, rowCamSmoothness, rowCamNoiseReduction];
    const sliders = [sliderBrightness, sliderSmoothness, sliderNoiseReduction];

    if (isCameraMode) {
      rows.forEach(r => {
        if (r) {
          r.style.opacity = '1';
          r.style.pointerEvents = 'auto';
        }
      });
      sliders.forEach(s => {
        if (s) s.disabled = false;
      });
      if (groupCamDevice) groupCamDevice.style.display = 'flex';
    } else {
      rows.forEach(r => {
        if (r) {
          r.style.opacity = '0.35';
          r.style.pointerEvents = 'none';
        }
      });
      sliders.forEach(s => {
        if (s) s.disabled = true;
      });
      if (groupCamDevice) groupCamDevice.style.display = 'none';
    }
  }

  // Initialize Mode Preview
  async function initPreview(mode = 'fullscreen') {
    window.fligoRecorder.setMode(mode);

    if (mode === 'camera') {
      regionActionBar.style.display = 'none';
      pipCameraBox.style.display = 'none';
      rowCamShape.style.display = 'none';
      updateCamControlsState(true);
      if (window.electronAPI && window.electronAPI.hideCropBorder) window.electronAPI.hideCropBorder();

      await stopCameraFeeds();
      if (previewVideo) {
        previewVideo.style.transform = 'scaleX(-1)';
        previewVideo.style.filter = window.fligoRecorder.getCameraFilterString();
        previewVideo.srcObject = null;
      }

      currentCamStream = await window.fligoRecorder.startCamera(selectedCamId);
      if (currentCamStream && previewVideo) {
        previewVideo.srcObject = currentCamStream;
        previewVideo.play().catch(() => {});
      }
    } else if (mode === 'dual') {
      pipCameraBox.style.display = 'none';
      regionActionBar.style.display = 'none';
      rowCamShape.style.display = 'flex';
      updateCamControlsState(true);
      if (window.electronAPI && window.electronAPI.hideCropBorder) window.electronAPI.hideCropBorder();

      if (previewVideo) {
        previewVideo.style.filter = 'none';
        previewVideo.style.transform = 'none';
      }

      await stopCameraFeeds();
      currentScreenStream = await window.fligoRecorder.startScreenStream();
      if (currentScreenStream && previewVideo) {
        previewVideo.srcObject = currentScreenStream;
        previewVideo.play().catch(() => {});
      }

      const selectedCamLabel = selectCamDevice.options[selectCamDevice.selectedIndex] ? selectCamDevice.options[selectCamDevice.selectedIndex].text : '';
      if (window.electronAPI) {
        window.electronAPI.openCameraOverlay({
          shape: window.fligoRecorder.cameraShape,
          size: window.fligoRecorder.cameraSize,
          deviceId: selectedCamId,
          deviceLabel: selectedCamLabel
        });
        broadcastCameraFilters();
      }
    } else if (mode === 'region') {
      pipCameraBox.style.display = 'none';
      regionActionBar.style.display = 'flex';
      rowCamShape.style.display = 'none';
      updateCamControlsState(false);

      if (previewVideo) {
        previewVideo.style.filter = 'none';
        previewVideo.style.transform = 'none';
      }

      await stopCameraFeeds();

      currentScreenStream = await window.fligoRecorder.startScreenStream();
      if (currentScreenStream) {
        previewVideo.srcObject = currentScreenStream;
        previewVideo.play().catch(() => {});
      }

      // Always close old crop border and open fresh region selector on mode switch
      if (window.electronAPI) {
        window.electronAPI.hideCropBorder();
        window.electronAPI.openRegionSelector();
      }
    } else {
      // Full Screen Mode
      pipCameraBox.style.display = 'none';
      regionActionBar.style.display = 'none';
      rowCamShape.style.display = 'none';
      updateCamControlsState(false);
      if (window.electronAPI && window.electronAPI.hideCropBorder) window.electronAPI.hideCropBorder();

      if (previewVideo) {
        previewVideo.style.filter = 'none';
        previewVideo.style.transform = 'none';
      }

      await stopCameraFeeds();

      currentScreenStream = await window.fligoRecorder.startScreenStream();
      if (currentScreenStream) {
        previewVideo.srcObject = currentScreenStream;
        previewVideo.play().catch(() => {});
      }
    }
  }

  // Mode Selection
  modeItems.forEach(item => {
    item.addEventListener('click', () => {
      modeItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const mode = item.getAttribute('data-mode');
      initPreview(mode);
    });
  });

  // Region Selector Hooks & Live Position Updates
  if (window.electronAPI) {
    window.electronAPI.onRegionSelected((region) => {
      window.fligoRecorder.setRegion(region);
      regionCoordsText.textContent = `${region.width} × ${region.height} px`;
    });

    btnReselectRegion.addEventListener('click', () => {
      if (window.electronAPI) {
        window.electronAPI.hideCropBorder();
        window.electronAPI.openRegionSelector();
      }
    });
  }

  // Shape Selection
  shapeOptBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      shapeOptBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const shape = btn.getAttribute('data-shape');
      window.fligoRecorder.setCameraShape(shape);

      pipCameraBox.className = `pip-cam-preview shape-${shape}`;
      if (window.electronAPI) {
        window.electronAPI.setCameraShape(shape);
      }
    });
  });

  // Audio Toggles
  toggleNoiseSuppression.addEventListener('change', (e) => {
    if (window.fligoAudioEngine) {
      window.fligoAudioEngine.setNoiseSuppression(e.target.checked);
    }
    updateMicrophone(selectedMicId);
  });

  toggleSilenceRemoval.addEventListener('change', (e) => {
    if (window.fligoAudioEngine) {
      window.fligoAudioEngine.setSilenceRemoval(e.target.checked);
    }
  });

  // Record Button
  async function handleToggleRecording() {
    if (window.fligoRecorder.isRecording) {
      await window.fligoRecorder.stopRecording();
    } else {
      await window.fligoRecorder.startRecording(
        currentMicStream,
        toggleSystemAudio.checked ? currentScreenStream : null
      );
    }
  }

  btnToggleRecord.addEventListener('click', handleToggleRecording);

  btnScreenshot.addEventListener('click', async () => {
    await window.fligoRecorder.takeScreenshot();
    statusText.textContent = 'PHOTO SAVED!';
    setTimeout(() => {
      statusText.textContent = window.fligoRecorder.isRecording ? 'RECORDING' : 'CAPTO STUDIO';
    }, 2000);
  });

  // Recorder State Callback
  window.fligoRecorder.onRecordingStateChange = (state) => {
    if (state === 'recording') {
      btnRecordLabel.textContent = 'STOP RECORDING';
      statusText.textContent = 'RECORDING';
      statusDot.style.background = '#FF453A';
      statusDot.style.boxShadow = '0 0 10px #FF453A';
    } else {
      btnRecordLabel.textContent = 'START RECORDING';
      statusText.textContent = 'CAPTO STUDIO';
      statusDot.style.background = '#30D158';
      statusDot.style.boxShadow = '0 0 8px #30D158';
      mainTimer.textContent = '00:00:00';
    }
  };

  // Timer Tick
  window.fligoRecorder.onTimerTick = (timeStr) => {
    mainTimer.textContent = timeStr;
    if (window.electronAPI) {
      window.electronAPI.updateToolbarTimer(timeStr);
    }
  };

  // Hotkeys & Toolbar Integration
  if (window.electronAPI) {
    window.electronAPI.onHotkeyRecord(handleToggleRecording);
    window.electronAPI.onHotkeyPause(() => window.fligoRecorder.pauseRecording());
    window.electronAPI.onFromToolbar((action) => {
      if (action === 'stop') handleToggleRecording();
      else if (action === 'pause') window.fligoRecorder.pauseRecording();
      else if (action === 'screenshot') window.fligoRecorder.takeScreenshot();
      else if (action === 'toggle-mute') toggleMicMute();
    });
  }

  // Start Default Mic & Preview
  await updateMicrophone();
  await initPreview('fullscreen');
});
