/**
 * CAPTO APP CONTROLLER
 * Multi-Tab Studio & Voice Recording Dashboard, Dual Real-Time Spectrum & Pitch Detection,
 * Fail-Safe Audio Hotplug, Resizable Crop Border & VU Visualizer
 */

document.addEventListener('DOMContentLoaded', async () => {
  const btnClose = document.getElementById('btn-close');
  const btnMinimize = document.getElementById('btn-minimize');

  // Navigation Tabs & Views
  const tabStudio = document.getElementById('tab-studio');
  const tabVoice = document.getElementById('tab-voice');
  const tabGallery = document.getElementById('tab-gallery');
  const studioView = document.getElementById('studio-view');
  const voiceView = document.getElementById('voice-view');
  const galleryView = document.getElementById('gallery-view');

  // Studio View Controls
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

  const toggleCamFlip = document.getElementById('toggle-cam-flip');
  const rowCamFlip = document.getElementById('row-cam-flip');

  const toggleNoiseSuppression = document.getElementById('toggle-noise-suppression');
  const sliderAncStrength = document.getElementById('slider-anc-strength');
  const ancStrengthValText = document.getElementById('anc-strength-val-text');
  const rowAncStrength = document.getElementById('row-anc-strength');
  const toggleSilenceRemoval = document.getElementById('toggle-silence-removal');
  const toggleSystemAudio = document.getElementById('toggle-system-audio');
  const shapeOptBtns = document.querySelectorAll('.shape-opt-btn');

  // Voice Studio View Controls
  const voicePitchNote = document.getElementById('voice-pitch-note');
  const voicePitchHz = document.getElementById('voice-pitch-hz');
  const voiceVocalCategory = document.getElementById('voice-vocal-category');
  const voicePitchClarity = document.getElementById('voice-pitch-clarity');
  const voicePitchPointer = document.getElementById('voice-pitch-pointer');
  const voiceDualCanvas = document.getElementById('voice-dual-canvas');
  const voiceMetricDb = document.getElementById('voice-metric-db');
  const voiceMetricVad = document.getElementById('voice-metric-vad');
  const voiceMetricNoise = document.getElementById('voice-metric-noise');
  const voiceLiveDot = document.getElementById('voice-live-dot');
  const voiceLiveText = document.getElementById('voice-live-text');
  const voiceDbLevel = document.getElementById('voice-db-level');
  const voiceVuBarFill = document.getElementById('voice-vu-bar-fill');
  const voiceEqBars = document.querySelectorAll('.v-eq-bar');
  const voiceLiveVuCard = document.querySelector('.voice-live-vu-card');

  const btnVoiceToggleRecord = document.getElementById('btn-voice-toggle-record');
  const btnVoiceRecordLabel = document.getElementById('btn-voice-record-label');
  const btnVoiceToggleMute = document.getElementById('btn-voice-toggle-mute');
  const voiceMuteBtnIcon = document.getElementById('voice-mute-btn-icon');
  const voiceMainTimer = document.getElementById('voice-main-timer');
  const selectVoiceMicDevice = document.getElementById('select-voice-mic-device');
  const voiceMicStatusLabel = document.getElementById('voice-mic-status-label');
  const toggleVoiceNoiseSuppression = document.getElementById('toggle-voice-noise-suppression');
  const sliderVoiceAncStrength = document.getElementById('slider-voice-anc-strength');
  const voiceAncStrengthValText = document.getElementById('voice-anc-strength-val-text');
  const rowVoiceAncStrength = document.getElementById('row-voice-anc-strength');
  const toggleVoiceSilenceRemoval = document.getElementById('toggle-voice-silence-removal');

  let currentScreenStream = null;
  let currentMicStream = null;
  let currentCamStream = null;
  let selectedMicId = '';
  let selectedCamId = '';
  let isMicMuted = false;
  let currentActiveTab = 'studio'; // 'studio' | 'voice' | 'gallery'

  // Web Audio Visualizer Pipeline
  let audioCtx = null;
  let analyser = null;
  let micSourceNode = null;
  let visualizerRafId = null;
  let voiceDualCanvasRafId = null;

  // Window Controls
  if (window.electronAPI) {
    if (btnClose) btnClose.addEventListener('click', () => window.electronAPI.closeWindow());
    if (btnMinimize) btnMinimize.addEventListener('click', () => window.electronAPI.minimizeWindow());
  }

  // Navigation Tabs Switcher
  async function switchTab(target) {
    const prevTab = currentActiveTab;
    currentActiveTab = target;
    tabStudio.classList.toggle('active', target === 'studio');
    tabVoice.classList.toggle('active', target === 'voice');
    tabGallery.classList.toggle('active', target === 'gallery');

    if (studioView) studioView.style.display = target === 'studio' ? 'flex' : 'none';
    if (voiceView) voiceView.style.display = target === 'voice' ? 'flex' : 'none';
    if (galleryView) {
      galleryView.style.display = target === 'gallery' ? 'flex' : 'none';
      galleryView.classList.toggle('active', target === 'gallery');
    }

    if (target === 'gallery') {
      if (window.fligoGallery) {
        window.fligoGallery.loadRecordings();
      } else if (window.refreshGallery) {
        window.refreshGallery();
      }
    } else {
      if (window.fligoGallery && window.fligoGallery.pauseAllVideos) {
        window.fligoGallery.pauseAllVideos();
      }
    }

    if (target !== 'studio') {
      // Auto-turn OFF camera hardware & close floating overlay when leaving Studio
      try {
        await stopCameraFeeds();
      } catch (e) {}
    } else if (prevTab && prevTab !== 'studio') {
      // Returning to Studio - restore active camera mode feed if needed
      try {
        const mode = window.fligoRecorder.currentMode;
        if (mode === 'camera') {
          currentCamStream = await window.fligoRecorder.startCamera(selectedCamId);
          if (currentCamStream && previewVideo) {
            previewVideo.srcObject = currentCamStream;
            previewVideo.style.transform = (toggleCamFlip && toggleCamFlip.checked) ? 'scaleX(-1)' : 'none';
            previewVideo.play().catch(() => {});
            broadcastCameraFilters();
          }
        } else if (mode === 'dual') {
          await initPreview('dual');
          const selectedCamLabel = selectCamDevice.options[selectCamDevice.selectedIndex]?.text || '';
          if (window.electronAPI && window.electronAPI.openCameraOverlay) {
            window.electronAPI.openCameraOverlay({
              shape: window.fligoRecorder.cameraShape,
              size: window.fligoRecorder.cameraSize,
              deviceId: selectedCamId,
              deviceLabel: selectedCamLabel
            });
          }
        }
      } catch (e) {}
    }

    if (target === 'voice') {
      startVoiceDualVisualizer();
    } else {
      stopVoiceDualVisualizer();
    }
  }

  tabStudio.addEventListener('click', () => switchTab('studio'));
  tabVoice.addEventListener('click', () => switchTab('voice'));
  tabGallery.addEventListener('click', () => {
    switchTab('gallery');
    if (window.fligoGallery) {
      window.fligoGallery.loadRecordings();
    }
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

    const icon = isMicMuted ? '🔇' : '🎙️';
    if (muteBtnIcon) muteBtnIcon.textContent = icon;
    if (voiceMuteBtnIcon) voiceMuteBtnIcon.textContent = icon;

    if (btnToggleMute) {
      btnToggleMute.style.background = isMicMuted ? 'rgba(255, 69, 58, 0.35)' : '';
      btnToggleMute.style.borderColor = isMicMuted ? '#FF453A' : '';
    }
    if (btnVoiceToggleMute) {
      btnVoiceToggleMute.style.background = isMicMuted ? 'rgba(255, 69, 58, 0.35)' : '';
      btnVoiceToggleMute.style.borderColor = isMicMuted ? '#FF453A' : '';
    }

    if (isMicMuted) {
      if (micStatusLabel) {
        micStatusLabel.textContent = 'Muted';
        micStatusLabel.style.color = '#FF453A';
        micStatusLabel.style.background = 'rgba(255, 69, 58, 0.15)';
      }
      if (voiceMicStatusLabel) {
        voiceMicStatusLabel.textContent = 'Muted';
        voiceMicStatusLabel.style.color = '#FF453A';
        voiceMicStatusLabel.style.background = 'rgba(255, 69, 58, 0.15)';
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
      if (voiceMicStatusLabel) {
        voiceMicStatusLabel.textContent = 'Mic Active';
        voiceMicStatusLabel.style.color = '#30D158';
        voiceMicStatusLabel.style.background = 'rgba(48, 209, 88, 0.15)';
      }
      if (audioPulseDot) {
        audioPulseDot.style.background = '#30D158';
        audioPulseDot.style.boxShadow = '0 0 6px #30D158';
      }
      if (previewAudioText) previewAudioText.textContent = 'MIC ON';
    }
  }

  if (btnToggleMute) btnToggleMute.addEventListener('click', toggleMicMute);
  if (btnVoiceToggleMute) btnVoiceToggleMute.addEventListener('click', toggleMicMute);

  // Real-Time Studio VU Meter & Equalizer Visualizer
  function startVisualizer(stream) {
    if (!stream || stream.getAudioTracks().length === 0) return;

    try {
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.6;

      micSourceNode = audioCtx.createMediaStreamSource(stream);
      micSourceNode.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const timeDataArray = new Uint8Array(analyser.fftSize);

      function updateVisualizer() {
        if (isMicMuted) {
          if (vuMeterFill) vuMeterFill.style.width = '0%';
          eqBars.forEach(b => b.style.height = '4px');
          miniBars.forEach(b => b.style.height = '4px');
          visualizerRafId = requestAnimationFrame(updateVisualizer);
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        analyser.getByteTimeDomainData(timeDataArray);

        let sumSquares = 0;
        for (let i = 0; i < timeDataArray.length; i++) {
          const val = (timeDataArray[i] - 128) / 128;
          sumSquares += val * val;
        }
        const rms = Math.sqrt(sumSquares / timeDataArray.length);
        const volumePercent = Math.min(100, Math.round(rms * 280));

        if (vuMeterFill) {
          vuMeterFill.style.width = `${volumePercent}%`;
          if (volumePercent > 75) {
            vuMeterFill.style.background = '#FF453A';
          } else if (volumePercent > 45) {
            vuMeterFill.style.background = 'var(--ios-orange)';
          } else {
            vuMeterFill.style.background = '#30D158';
          }
        }

        if (micStatusLabel) {
          if (volumePercent > 6) {
            micStatusLabel.textContent = 'Speaking...';
            micStatusLabel.style.color = '#30D158';
            micStatusLabel.style.background = 'rgba(48, 209, 88, 0.2)';
          } else {
            micStatusLabel.textContent = 'Mic Ready';
            micStatusLabel.style.color = 'var(--text-secondary)';
            micStatusLabel.style.background = 'rgba(255, 255, 255, 0.08)';
          }
        }

        for (let i = 0; i < eqBars.length; i++) {
          const val = dataArray[i] || 0;
          const barHeight = Math.max(4, Math.round((val / 255) * 22));
          eqBars[i].style.height = `${barHeight}px`;
        }

        for (let i = 0; i < miniBars.length; i++) {
          const val = dataArray[i * 2] || 0;
          const barHeight = Math.max(3, Math.round((val / 255) * 12));
          miniBars[i].style.height = `${barHeight}px`;
        }

        visualizerRafId = requestAnimationFrame(updateVisualizer);
      }

      updateVisualizer();
    } catch (err) {
      console.warn('Visualizer init error:', err);
    }
  }

  // Dual Spectrum, VU Meter & Pitch Detection Loop for Voice Studio View
  function startVoiceDualVisualizer() {
    if (!voiceDualCanvas) return;
    const ctx = voiceDualCanvas.getContext('2d');
    const width = voiceDualCanvas.width;
    const height = voiceDualCanvas.height;

    const rawArray = new Float32Array(256);
    const cleanArray = new Float32Array(256);
    const freqArray = new Uint8Array(64);

    function renderVoiceVisualizer() {
      if (currentActiveTab !== 'voice') return;

      const isRecordingNow = window.fligoRecorder && window.fligoRecorder.isRecording && window.fligoRecorder.currentMode === 'voice';

      // 1. Get Live Audio Data & Metrics
      if (window.fligoAudioEngine) {
        window.fligoAudioEngine.getDualWaveformData(rawArray, cleanArray);
        if (typeof window.fligoAudioEngine.getFrequencyData === 'function') {
          window.fligoAudioEngine.getFrequencyData(freqArray);
        }
        const metrics = typeof window.fligoAudioEngine.getLiveAudioMetrics === 'function' 
          ? window.fligoAudioEngine.getLiveAudioMetrics() 
          : { rms: 0, db: -96, volumePercent: 0, isSpeaking: false, isMuted: isMicMuted, vad: 0 };
        const pitchData = window.fligoAudioEngine.getPitch();

        // A. Update VU Meter Bar Fill
        if (voiceVuBarFill) {
          const fillWidth = isMicMuted ? 0 : metrics.volumePercent;
          voiceVuBarFill.style.width = `${fillWidth}%`;
          if (fillWidth > 75) {
            voiceVuBarFill.style.background = '#FF453A';
          } else if (fillWidth > 40) {
            voiceVuBarFill.style.background = '#FF9F0A';
          } else {
            voiceVuBarFill.style.background = 'linear-gradient(90deg, #30D158, #34C759)';
          }
        }

        // B. Update Live Decibel Readout
        if (voiceDbLevel) {
          if (isMicMuted) {
            voiceDbLevel.textContent = 'MUTED';
            voiceDbLevel.style.color = '#FF9F0A';
          } else if (metrics.db <= -70) {
            voiceDbLevel.textContent = `${metrics.db} dB (Silence)`;
            voiceDbLevel.style.color = 'var(--text-secondary)';
          } else {
            voiceDbLevel.textContent = `${metrics.db} dB`;
            voiceDbLevel.style.color = metrics.isSpeaking ? '#30D158' : 'var(--text-secondary)';
          }
        }

        // C. Update 16-Band Equalizer Frequency Bars
        if (voiceEqBars && voiceEqBars.length > 0) {
          for (let i = 0; i < voiceEqBars.length; i++) {
            if (isMicMuted) {
              voiceEqBars[i].style.height = '3px';
            } else {
              const freqVal = freqArray[i * 2] || 0;
              const barHeight = Math.max(3, Math.min(20, Math.round((freqVal / 255) * 20) + (metrics.isSpeaking ? 2 : 0)));
              voiceEqBars[i].style.height = `${barHeight}px`;
              if (isRecordingNow) {
                voiceEqBars[i].style.background = 'linear-gradient(180deg, #FF453A, #FF9F0A)';
              } else {
                voiceEqBars[i].style.background = 'linear-gradient(180deg, #5E5CE6, #30D158)';
              }
            }
          }
        }

        // D. Update Mic Live Status Dot & Live Status Text
        if (voiceLiveDot && voiceLiveText) {
          voiceLiveDot.className = 'voice-live-dot';
          voiceLiveText.className = 'voice-live-text';

          if (isMicMuted) {
            voiceLiveDot.classList.add('muted');
            voiceLiveText.classList.add('muted');
            voiceLiveText.textContent = isRecordingNow ? 'RECORDING • MIC MUTED' : 'MIC MUTED (NO AUDIO)';
          } else if (isRecordingNow) {
            voiceLiveDot.classList.add('active-recording');
            voiceLiveText.classList.add('active-recording');
            if (metrics.isSpeaking) {
              voiceLiveText.textContent = '🔴 VOICE RECORDING • AUDIO DETECTED';
            } else {
              voiceLiveText.textContent = '🔴 VOICE RECORDING • LISTENING...';
            }
          } else {
            if (metrics.isSpeaking) {
              voiceLiveDot.classList.add('active-speaking');
              voiceLiveText.classList.add('active-speaking');
              voiceLiveText.textContent = '🎙️ MIC ACTIVE • SOUND DETECTED';
            } else {
              voiceLiveText.textContent = '🎙️ MIC READY • LISTENING...';
            }
          }
        }

        // E. Update Voice Live VU Card border during active recording
        if (voiceLiveVuCard) {
          voiceLiveVuCard.classList.toggle('is-recording', isRecordingNow);
        }

        // F. Update Pitch & Musical Note Display
        if (pitchData && voicePitchNote && voicePitchHz && voiceVocalCategory) {
          if (pitchData.pitchHz > 0 && !isMicMuted) {
            voicePitchNote.textContent = pitchData.note;
            voicePitchHz.textContent = `${pitchData.pitchHz} Hz`;
            voiceVocalCategory.textContent = pitchData.category;
            voiceVocalCategory.style.color = '#30D158';
            voiceVocalCategory.style.background = 'rgba(48, 209, 88, 0.15)';
            if (voicePitchClarity) voicePitchClarity.textContent = `Clarity: ${Math.round(pitchData.clarity * 100)}%`;

            // Position Pitch Pointer on scale (80Hz to 480Hz)
            if (voicePitchPointer) {
              const clamped = Math.max(80, Math.min(480, pitchData.pitchHz));
              const pct = ((clamped - 80) / (480 - 80)) * 100;
              voicePitchPointer.style.left = `${pct}%`;
            }
          } else {
            voicePitchNote.textContent = '--';
            voicePitchHz.textContent = isMicMuted ? 'Muted' : '0 Hz';
            voiceVocalCategory.textContent = isMicMuted ? 'Muted' : 'Listening...';
            voiceVocalCategory.style.color = 'var(--text-secondary)';
            voiceVocalCategory.style.background = 'rgba(255, 255, 255, 0.08)';
            if (voicePitchClarity) voicePitchClarity.textContent = 'Clarity: --';
          }
        }

        // G. Live Metrics Badges
        if (voiceMetricDb) {
          const db = isMicMuted ? -96 : metrics.db;
          voiceMetricDb.textContent = `${db} dB`;
        }
        if (voiceMetricVad) {
          const vadPct = isMicMuted ? 0 : Math.round((window.fligoAudioEngine.lastVad || 0) * 100);
          voiceMetricVad.textContent = vadPct > 45 ? `${vadPct}% AI Voice Match` : (metrics.isSpeaking ? 'Voice Detected' : 'Room Silence');
          voiceMetricVad.style.color = (vadPct > 45 || metrics.isSpeaking) ? '#30D158' : 'var(--text-secondary)';
        }
        if (voiceMetricNoise) {
          const cut = window.fligoAudioEngine.isAiAncEnabled ? Math.round(window.fligoAudioEngine.ancStrength * 28 + 4) : 0;
          voiceMetricNoise.textContent = `-${cut} dB Cut`;
          voiceMetricNoise.style.color = window.fligoAudioEngine.isAiAncEnabled ? '#5E5CE6' : 'var(--text-tertiary)';
        }

        if (voiceMicStatusLabel) {
          if (isMicMuted) {
            voiceMicStatusLabel.textContent = 'Muted';
            voiceMicStatusLabel.style.color = '#FF453A';
            voiceMicStatusLabel.style.background = 'rgba(255, 69, 58, 0.15)';
          } else if (metrics.isSpeaking) {
            voiceMicStatusLabel.textContent = 'Speaking...';
            voiceMicStatusLabel.style.color = '#30D158';
            voiceMicStatusLabel.style.background = 'rgba(48, 209, 88, 0.2)';
          } else {
            voiceMicStatusLabel.textContent = 'Mic Ready';
            voiceMicStatusLabel.style.color = 'var(--text-secondary)';
            voiceMicStatusLabel.style.background = 'rgba(255, 255, 255, 0.08)';
          }
        }
      }

      // 2. Draw Panoramic Studio Oscilloscope Waveform
      ctx.clearRect(0, 0, width, height);

      const panelW = width - 8;
      const panelH = height - 8;
      const panelX = 4;
      const panelY = 4;
      const centerY = panelY + panelH / 2;
      const timeOffset = performance.now() * 0.003;

      // Studio Panel Outer Glow & Container
      const borderColor = isRecordingNow ? 'rgba(255, 69, 58, 0.6)' : 'rgba(48, 209, 88, 0.5)';
      const glowColor = isRecordingNow ? 'rgba(255, 69, 58, 0.25)' : 'rgba(48, 209, 88, 0.15)';

      ctx.save();
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(panelX, panelY, panelW, panelH, 12);
      } else {
        ctx.rect(panelX, panelY, panelW, panelH);
      }
      ctx.fillStyle = 'rgba(8, 14, 20, 0.95)';
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();

      // Studio Oscilloscope Center & Grid Lines
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = isRecordingNow ? 'rgba(255, 69, 58, 0.12)' : 'rgba(48, 209, 88, 0.1)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(panelX + 16, centerY);
      ctx.lineTo(panelX + panelW - 16, centerY);
      for (let gx = 1; gx <= 5; gx++) {
        const xPos = panelX + (panelW * gx) / 6;
        ctx.moveTo(xPos, panelY + 10);
        ctx.lineTo(xPos, panelY + panelH - 10);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Header Tag
      ctx.font = '700 10px sans-serif';
      ctx.fillStyle = isRecordingNow ? '#FF453A' : '#30D158';
      ctx.fillText(isRecordingNow ? '● ACTIVE RECORDING • 48 kHz 320kbps' : '● STUDIO LIVE VOCAL MONITOR', panelX + 16, panelY + 18);

      if (isMicMuted) {
        ctx.font = '600 12px sans-serif';
        ctx.fillStyle = '#FF9F0A';
        ctx.textAlign = 'center';
        ctx.fillText('🎙️ MICROPHONE MUTED', panelX + panelW / 2, centerY + 4);
        ctx.textAlign = 'left';
      } else {
        const points = [];
        const step = panelW / (cleanArray.length - 1);
        const ampScale = panelH * 0.44;

        for (let i = 0; i < cleanArray.length; i++) {
          const val = cleanArray[i] || 0;
          const boosted = Math.tanh(val * 4.5);
          const idleWave = (Math.abs(boosted) < 0.02) ? Math.sin(timeOffset * 2.2 + i * 0.15) * 0.02 : 0;
          const y = centerY + (boosted + idleWave) * ampScale;
          const x = panelX + (i * step);
          points.push({ x, y });
        }

        // Fill Area under Vocal Waveform Curve
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(points[0].x, centerY);
        for (let i = 0; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.lineTo(points[points.length - 1].x, centerY);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, panelY, 0, panelY + panelH);
        if (isRecordingNow) {
          grad.addColorStop(0, 'rgba(255, 69, 58, 0.35)');
          grad.addColorStop(1, 'rgba(255, 69, 58, 0.0)');
        } else {
          grad.addColorStop(0, 'rgba(48, 209, 88, 0.3)');
          grad.addColorStop(0.5, 'rgba(94, 92, 230, 0.15)');
          grad.addColorStop(1, 'rgba(48, 209, 88, 0.0)');
        }
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();

        // Stroke Glowing Vocal Waveform Curve
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = isRecordingNow ? '#FF453A' : '#30D158';
        ctx.lineWidth = 2.4;
        ctx.shadowColor = isRecordingNow ? '#FF453A' : '#30D158';
        ctx.shadowBlur = 10;
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        ctx.restore();
      }

      voiceDualCanvasRafId = requestAnimationFrame(renderVoiceVisualizer);
    }

    renderVoiceVisualizer();
  }

  function stopVoiceDualVisualizer() {
    if (voiceDualCanvasRafId) {
      cancelAnimationFrame(voiceDualCanvasRafId);
      voiceDualCanvasRafId = null;
    }
  }

  // Enumerate Audio & Video Input Devices
  async function loadDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      selectMicDevice.innerHTML = '';
      if (selectVoiceMicDevice) selectVoiceMicDevice.innerHTML = '';

      if (audioInputs.length === 0) {
        selectMicDevice.innerHTML = '<option value="">Default Microphone</option>';
        if (selectVoiceMicDevice) selectVoiceMicDevice.innerHTML = '<option value="">Default Microphone</option>';
      } else {
        audioInputs.forEach((device, index) => {
          const opt = document.createElement('option');
          opt.value = device.deviceId;
          opt.textContent = device.label || `Microphone ${index + 1}`;
          if (device.deviceId === selectedMicId) opt.selected = true;
          selectMicDevice.appendChild(opt);

          if (selectVoiceMicDevice) {
            const vOpt = opt.cloneNode(true);
            selectVoiceMicDevice.appendChild(vOpt);
          }
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
      
      // Pre-warm and connect live stream to Fligo Audio DSP Engine for Voice Studio VU & Waveforms
      if (window.fligoAudioEngine) {
        try {
          await window.fligoAudioEngine.init(currentMicStream);
          window.fligoAudioEngine.setMute(isMicMuted);
        } catch (e) {
          console.warn('Audio DSP engine init notice:', e);
        }
      }

      startVisualizer(currentMicStream);
    } catch (err) {
      console.warn('Microphone permission not granted or device lost:', err);
      if (deviceId !== '') {
        await updateMicrophone('');
      } else {
        if (micStatusLabel) {
          micStatusLabel.textContent = 'Mic Disabled';
          micStatusLabel.style.color = '#FF453A';
        }
        if (voiceMicStatusLabel) {
          voiceMicStatusLabel.textContent = 'Mic Disabled';
          voiceMicStatusLabel.style.color = '#FF453A';
        }
      }
    }
  }

  selectMicDevice.addEventListener('change', (e) => {
    if (selectVoiceMicDevice) selectVoiceMicDevice.value = e.target.value;
    updateMicrophone(e.target.value);
  });

  if (selectVoiceMicDevice) {
    selectVoiceMicDevice.addEventListener('change', (e) => {
      selectMicDevice.value = e.target.value;
      updateMicrophone(e.target.value);
    });
  }

  selectCamDevice.addEventListener('change', async (e) => {
    selectedCamId = e.target.value;
    const selectedCamLabel = selectCamDevice.options[selectCamDevice.selectedIndex]?.text || '';
    if (window.fligoRecorder) {
      window.fligoRecorder.setCameraDeviceId(selectedCamId);
    }
    
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

  // Camera Feeds Controller
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
      window.electronAPI.setCameraFilters({ brightness: b, smoothness: s, noiseReduction: n });
    }
  }

  if (sliderBrightness) {
    sliderBrightness.addEventListener('input', (e) => {
      if (brightnessValText) brightnessValText.textContent = `${e.target.value}%`;
      broadcastCameraFilters();
    });
  }

  if (sliderSmoothness) {
    sliderSmoothness.addEventListener('input', (e) => {
      if (smoothnessValText) smoothnessValText.textContent = `${e.target.value}%`;
      broadcastCameraFilters();
    });
  }

  if (sliderNoiseReduction) {
    sliderNoiseReduction.addEventListener('input', (e) => {
      if (noiseReductionValText) noiseReductionValText.textContent = `${e.target.value}%`;
      broadcastCameraFilters();
    });
  }

  // Camera Flip / Mirror Controller
  function applyCameraFlip(isFlipped) {
    if (window.fligoRecorder) {
      window.fligoRecorder.setCameraFlipped(isFlipped);
    }
    if (window.fligoRecorder.currentMode === 'camera' && previewVideo) {
      previewVideo.style.transform = isFlipped ? 'scaleX(-1)' : 'none';
    }
    if (pipCameraVideo) {
      pipCameraVideo.style.transform = isFlipped ? 'scaleX(-1)' : 'none';
    }
    if (window.electronAPI && window.electronAPI.setCameraFlipped) {
      window.electronAPI.setCameraFlipped(isFlipped);
    }
  }

  if (toggleCamFlip) {
    toggleCamFlip.addEventListener('change', (e) => {
      applyCameraFlip(e.target.checked);
    });
  }

  // Mode Selection
  async function setMode(mode) {
    modeItems.forEach(item => {
      item.classList.toggle('active', item.dataset.mode === mode);
    });

    window.fligoRecorder.setMode(mode);

    if (regionActionBar) regionActionBar.style.display = mode === 'region' ? 'flex' : 'none';
    if (rowCamShape) rowCamShape.style.display = mode === 'dual' ? 'flex' : 'none';
    if (groupCamDevice) groupCamDevice.style.display = (mode === 'dual' || mode === 'camera') ? 'flex' : 'none';
    if (rowCamBrightness) rowCamBrightness.style.display = (mode === 'dual' || mode === 'camera') ? 'flex' : 'none';
    if (rowCamSmoothness) rowCamSmoothness.style.display = (mode === 'dual' || mode === 'camera') ? 'flex' : 'none';
    if (rowCamNoiseReduction) rowCamNoiseReduction.style.display = (mode === 'dual' || mode === 'camera') ? 'flex' : 'none';
    if (rowCamFlip) rowCamFlip.style.display = (mode === 'dual' || mode === 'camera') ? 'flex' : 'none';

    await stopCameraFeeds();

    if (mode === 'region') {
      if (previewVideo) previewVideo.style.transform = 'none';
      if (window.electronAPI && window.electronAPI.openRegionSelector) {
        window.electronAPI.openRegionSelector();
      }
    } else if (mode === 'camera') {
      currentCamStream = await window.fligoRecorder.startCamera(selectedCamId);
      if (currentCamStream && previewVideo) {
        previewVideo.srcObject = currentCamStream;
        previewVideo.style.transform = (toggleCamFlip && toggleCamFlip.checked) ? 'scaleX(-1)' : 'none';
        previewVideo.play().catch(() => {});
        broadcastCameraFilters();
      }
    } else if (mode === 'dual') {
      if (previewVideo) previewVideo.style.transform = 'none';
      await initPreview('dual');
      const selectedCamLabel = selectCamDevice.options[selectCamDevice.selectedIndex]?.text || '';
      if (window.electronAPI && window.electronAPI.openCameraOverlay) {
        window.electronAPI.openCameraOverlay({
          shape: window.fligoRecorder.cameraShape,
          size: window.fligoRecorder.cameraSize,
          deviceId: selectedCamId,
          deviceLabel: selectedCamLabel
        });
      }
    } else {
      if (previewVideo) previewVideo.style.transform = 'none';
      await initPreview('fullscreen');
    }
  }

  modeItems.forEach(item => {
    item.addEventListener('click', () => {
      setMode(item.dataset.mode);
    });
  });

  if (btnReselectRegion) {
    btnReselectRegion.addEventListener('click', () => {
      if (window.electronAPI && window.electronAPI.openRegionSelector) {
        window.electronAPI.openRegionSelector();
      }
    });
  }

  // Region Selection Handler
  if (window.electronAPI && window.electronAPI.onRegionSelected) {
    window.electronAPI.onRegionSelected((region) => {
      if (region) {
        window.fligoRecorder.setRegion(region);
        if (regionCoordsText) {
          regionCoordsText.textContent = `${Math.round(region.width)} × ${Math.round(region.height)}`;
        }
      }
    });
  }

  // Live Screen Preview Viewport
  async function initPreview(mode) {
    if (mode === 'camera') return;
    if (!currentScreenStream) {
      currentScreenStream = await window.fligoRecorder.startScreenStream();
    }
    if (previewVideo && currentScreenStream) {
      previewVideo.srcObject = currentScreenStream;
      previewVideo.style.filter = '';
      previewVideo.play().catch(() => {});
    }
  }

  // Camera Shape Switcher
  shapeOptBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      shapeOptBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const shape = btn.dataset.shape;
      window.fligoRecorder.setCameraShape(shape);

      pipCameraBox.className = `pip-cam-preview shape-${shape}`;
      if (window.electronAPI) {
        window.electronAPI.setCameraShape(shape);
      }
    });
  });

  // Audio Toggles & ANC Controls (Studio & Voice Synchronized)
  function syncAncControls(isChecked, strengthVal) {
    if (toggleNoiseSuppression) toggleNoiseSuppression.checked = isChecked;
    if (toggleVoiceNoiseSuppression) toggleVoiceNoiseSuppression.checked = isChecked;

    if (rowAncStrength) rowAncStrength.style.display = isChecked ? 'flex' : 'none';
    if (rowVoiceAncStrength) rowVoiceAncStrength.style.display = isChecked ? 'flex' : 'none';

    if (sliderAncStrength) sliderAncStrength.value = strengthVal;
    if (sliderVoiceAncStrength) sliderVoiceAncStrength.value = strengthVal;

    let text = `${strengthVal}% (Maximum AI)`;
    if (strengthVal < 70) text = `${strengthVal}% (Natural Studio)`;
    else if (strengthVal < 95) text = `${strengthVal}% (Balanced AI)`;

    if (ancStrengthValText) ancStrengthValText.textContent = text;
    if (voiceAncStrengthValText) voiceAncStrengthValText.textContent = text;

    if (window.fligoAudioEngine) {
      window.fligoAudioEngine.setNoiseSuppression(isChecked);
      window.fligoAudioEngine.setAncStrength(strengthVal / 100);
    }
  }

  if (toggleNoiseSuppression) {
    toggleNoiseSuppression.addEventListener('change', (e) => {
      syncAncControls(e.target.checked, sliderAncStrength ? parseInt(sliderAncStrength.value) : 100);
      updateMicrophone(selectedMicId);
    });
  }

  if (toggleVoiceNoiseSuppression) {
    toggleVoiceNoiseSuppression.addEventListener('change', (e) => {
      syncAncControls(e.target.checked, sliderVoiceAncStrength ? parseInt(sliderVoiceAncStrength.value) : 100);
      updateMicrophone(selectedMicId);
    });
  }

  if (sliderAncStrength) {
    sliderAncStrength.addEventListener('input', (e) => {
      syncAncControls(toggleNoiseSuppression ? toggleNoiseSuppression.checked : true, parseInt(e.target.value));
    });
  }

  if (sliderVoiceAncStrength) {
    sliderVoiceAncStrength.addEventListener('input', (e) => {
      syncAncControls(toggleVoiceNoiseSuppression ? toggleVoiceNoiseSuppression.checked : true, parseInt(e.target.value));
    });
  }

  if (toggleSilenceRemoval) {
    toggleSilenceRemoval.addEventListener('change', (e) => {
      if (toggleVoiceSilenceRemoval) toggleVoiceSilenceRemoval.checked = e.target.checked;
      if (window.fligoAudioEngine) window.fligoAudioEngine.setSilenceRemoval(e.target.checked);
    });
  }

  if (toggleVoiceSilenceRemoval) {
    toggleVoiceSilenceRemoval.addEventListener('change', (e) => {
      if (toggleSilenceRemoval) toggleSilenceRemoval.checked = e.target.checked;
      if (window.fligoAudioEngine) window.fligoAudioEngine.setSilenceRemoval(e.target.checked);
    });
  }

  // Record Button (Video / Screen)
  async function handleToggleRecording() {
    if (window.fligoRecorder.isRecording) {
      await window.fligoRecorder.stopRecording();
    } else {
      await window.fligoRecorder.startRecording(
        currentMicStream,
        toggleSystemAudio && toggleSystemAudio.checked ? currentScreenStream : null
      );
    }
  }

  // Record Button (Voice Recording)
  async function handleToggleVoiceRecording() {
    if (window.fligoRecorder.isRecording) {
      await window.fligoRecorder.stopRecording();
    } else {
      await window.fligoRecorder.startVoiceRecording(
        currentMicStream,
        toggleSystemAudio && toggleSystemAudio.checked ? currentScreenStream : null
      );
    }
  }

  if (btnToggleRecord) btnToggleRecord.addEventListener('click', handleToggleRecording);
  if (btnVoiceToggleRecord) btnVoiceToggleRecord.addEventListener('click', handleToggleVoiceRecording);

  if (btnScreenshot) {
    btnScreenshot.addEventListener('click', async () => {
      await window.fligoRecorder.takeScreenshot();
      statusText.textContent = 'PHOTO SAVED!';
      setTimeout(() => {
        statusText.textContent = window.fligoRecorder.isRecording ? 'RECORDING' : 'CAPTO STUDIO';
      }, 2000);
    });
  }

  // Recorder State Callback
  window.fligoRecorder.onRecordingStateChange = (state) => {
    if (state === 'recording') {
      if (btnRecordLabel) btnRecordLabel.textContent = 'STOP RECORDING';
      if (btnVoiceRecordLabel) btnVoiceRecordLabel.textContent = 'STOP VOICE RECORDING';
      if (btnVoiceToggleRecord) btnVoiceToggleRecord.classList.add('is-recording');
      statusText.textContent = window.fligoRecorder.currentMode === 'voice' ? 'VOICE RECORDING' : 'RECORDING';
      statusDot.style.background = '#FF453A';
      statusDot.style.boxShadow = '0 0 10px #FF453A';
    } else {
      if (btnRecordLabel) btnRecordLabel.textContent = 'START RECORDING';
      if (btnVoiceRecordLabel) btnVoiceRecordLabel.textContent = 'RECORD VOICE';
      if (btnVoiceToggleRecord) btnVoiceToggleRecord.classList.remove('is-recording');
      statusText.textContent = 'CAPTO STUDIO';
      statusDot.style.background = '#30D158';
      statusDot.style.boxShadow = '0 0 8px #30D158';
      if (mainTimer) mainTimer.textContent = '00:00:00';
      if (voiceMainTimer) voiceMainTimer.textContent = '00:00:00';
    }
  };

  // Timer Tick
  window.fligoRecorder.onTimerTick = (timeStr) => {
    if (mainTimer) mainTimer.textContent = timeStr;
    if (voiceMainTimer) voiceMainTimer.textContent = timeStr;
    if (window.electronAPI) {
      window.electronAPI.updateToolbarTimer(timeStr);
    }
  };

  // Hotkeys & Toolbar Integration
  if (window.electronAPI) {
    window.electronAPI.onHotkeyRecord(() => {
      if (currentActiveTab === 'voice') handleToggleVoiceRecording();
      else handleToggleRecording();
    });
    window.electronAPI.onHotkeyPause(() => window.fligoRecorder.pauseRecording());
    window.electronAPI.onFromToolbar((action) => {
      if (action === 'stop') {
        if (window.fligoRecorder.isRecording) window.fligoRecorder.stopRecording();
      } else if (action === 'pause') {
        window.fligoRecorder.pauseRecording();
      } else if (action === 'screenshot') {
        window.fligoRecorder.takeScreenshot();
      } else if (action === 'toggle-mute') {
        toggleMicMute();
      }
    });
  }

  // Start Default Mic & Preview
  await updateMicrophone();
  await initPreview('fullscreen');
});
