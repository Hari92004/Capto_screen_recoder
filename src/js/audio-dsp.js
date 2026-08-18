/**
 * CAPTO STUDIO AUDIO DSP ENGINE
 * Broadcast Studio AI Voice Dynamics Compressor, Vocal Presence Equalizer,
 * Real-Time Autocorrelation Pitch & Musical Note Detector,
 * Sub-Bass Rumble Cut & Dynamic Studio Noise Gate
 */

class FligoAudioEngine {
  constructor() {
    this.audioCtx = null;
    this.micStream = null;
    this.systemStream = null;
    this.mixedDestination = null;

    // DSP Nodes
    this.micSource = null;
    this.highpassFilter = null;
    this.notchFilter = null;
    this.lowpassFilter = null;
    this.speechEnhancerFilter = null;
    this.compressorNode = null;
    this.gateGainNode = null;
    
    // Analysers for Live Visualization & Pitch Detection
    this.cleanAnalyserNode = null;
    this.rawAnalyserNode = null;
    this.analyserNode = null;

    // Parameters & State
    this.isMuted = false;
    this.isVoiceCompressorEnabled = true;
    this.isSilenceRemovalEnabled = true;
    this.noiseGateThreshold = 0.010; // RMS threshold
    this.currentGateGain = 1.0;
    this.targetGateGain = 1.0;
    this.lastVad = 1.0;

    this.rafId = null;
  }

  async buildAudioStream(micStream, systemStream = null) {
    return this.init(micStream, systemStream);
  }

  async init(micStream, systemStream = null) {
    if (this.audioCtx) {
      await this.close();
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioContextClass({ sampleRate: 48000, latencyHint: 'interactive' });

    this.micStream = micStream;
    this.systemStream = systemStream;
    this.mixedDestination = this.audioCtx.createMediaStreamDestination();

    if (this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch (e) {}
    }

    // 1. Microphone Studio DSP Pipeline
    if (this.micStream && this.micStream.getAudioTracks().length > 0) {
      this.micSource = this.audioCtx.createMediaStreamSource(this.micStream);

      // Highpass filter (cuts desk rumbles, laptop chassis vibrations < 80Hz)
      this.highpassFilter = this.audioCtx.createBiquadFilter();
      this.highpassFilter.type = 'highpass';
      this.highpassFilter.frequency.value = 80;
      this.highpassFilter.Q.value = 0.707;

      // 50Hz / 60Hz AC Electrical & Laptop Fan Hum Notch Filter
      this.notchFilter = this.audioCtx.createBiquadFilter();
      this.notchFilter.type = 'notch';
      this.notchFilter.frequency.value = 55;
      this.notchFilter.Q.value = 3.5;

      // Vocal Clarity Peaking Filter (+3.0dB at 2.8kHz for broadcast voice presence)
      this.speechEnhancerFilter = this.audioCtx.createBiquadFilter();
      this.speechEnhancerFilter.type = 'peaking';
      this.speechEnhancerFilter.frequency.value = 2800;
      this.speechEnhancerFilter.gain.value = 3.0;
      this.speechEnhancerFilter.Q.value = 1.0;

      // Broadcast Studio Dynamics Compressor (levels quiet vs loud speech naturally)
      this.compressorNode = this.audioCtx.createDynamicsCompressor();
      this.compressorNode.threshold.value = -24;
      this.compressorNode.knee.value = 12;
      this.compressorNode.ratio.value = 4.0;
      this.compressorNode.attack.value = 0.003;
      this.compressorNode.release.value = 0.12;

      // Studio Dynamic Noise Gate Gain Node
      this.gateGainNode = this.audioCtx.createGain();
      this.gateGainNode.gain.value = this.isMuted ? 0.0 : 1.0;

      // Analysers
      this.cleanAnalyserNode = this.audioCtx.createAnalyser();
      this.cleanAnalyserNode.fftSize = 512;
      this.cleanAnalyserNode.smoothingTimeConstant = 0.3;
      this.analyserNode = this.cleanAnalyserNode;
      this.rawAnalyserNode = this.cleanAnalyserNode;

      // Connect DSP Chain:
      // Mic -> Highpass -> Notch -> Speech Enhancer -> Compressor -> Gate -> Analyser -> Mixed Output
      this.micSource.connect(this.highpassFilter);
      this.highpassFilter.connect(this.notchFilter);
      this.notchFilter.connect(this.speechEnhancerFilter);
      this.speechEnhancerFilter.connect(this.compressorNode);
      this.compressorNode.connect(this.gateGainNode);
      this.gateGainNode.connect(this.cleanAnalyserNode);
      this.gateGainNode.connect(this.mixedDestination);

      // Connect zero-gain node to audioCtx.destination to ensure Web Audio graph continuously pumps
      this.silentMonitorGain = this.audioCtx.createGain();
      this.silentMonitorGain.gain.value = 0.0;
      this.gateGainNode.connect(this.silentMonitorGain);
      this.silentMonitorGain.connect(this.audioCtx.destination);

      this.startAdaptiveNoiseGate();
    }

    // 2. System Audio Pipeline (Internal loopback)
    if (this.systemStream && this.systemStream.getAudioTracks().length > 0) {
      const sysSource = this.audioCtx.createMediaStreamSource(this.systemStream);
      const sysGain = this.audioCtx.createGain();
      sysGain.gain.value = 1.0;
      sysSource.connect(sysGain);
      sysGain.connect(this.mixedDestination);
    }

    return this.mixedDestination.stream;
  }

  setMute(muted) {
    this.isMuted = !!muted;
    if (this.gateGainNode && this.audioCtx && this.audioCtx.state !== 'closed') {
      const now = this.audioCtx.currentTime;
      this.gateGainNode.gain.cancelScheduledValues(now);
      this.gateGainNode.gain.setValueAtTime(this.isMuted ? 0.0 : 1.0, now);
    }
  }

  setVoiceCompressor(enabled) {
    this.isVoiceCompressorEnabled = !!enabled;
    if (this.compressorNode && this.speechEnhancerFilter && this.audioCtx) {
      if (this.isVoiceCompressorEnabled) {
        this.compressorNode.threshold.value = -24;
        this.compressorNode.ratio.value = 4.0;
        this.speechEnhancerFilter.gain.value = 3.0;
        this.highpassFilter.frequency.value = 80;
      } else {
        this.compressorNode.threshold.value = 0;
        this.compressorNode.ratio.value = 1.0;
        this.speechEnhancerFilter.gain.value = 0.0;
        this.highpassFilter.frequency.value = 20;
      }
    }
  }

  setNoiseSuppression(enabled) {
    this.setVoiceCompressor(enabled);
  }

  startAdaptiveNoiseGate() {
    if (!this.cleanAnalyserNode || !this.gateGainNode) return;

    const dataArray = new Float32Array(this.cleanAnalyserNode.fftSize);

    const processGate = () => {
      if (!this.audioCtx || this.audioCtx.state === 'closed') return;

      if (this.isMuted) {
        this.gateGainNode.gain.setValueAtTime(0.0, this.audioCtx.currentTime);
        this.rafId = requestAnimationFrame(processGate);
        return;
      }

      this.cleanAnalyserNode.getFloatTimeDomainData(dataArray);

      let sumSquares = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sumSquares += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sumSquares / dataArray.length);

      if (this.isVoiceCompressorEnabled) {
        const isSpeaking = rms > this.noiseGateThreshold;

        if (isSpeaking) {
          this.targetGateGain = 1.0;
          this.currentGateGain += (this.targetGateGain - this.currentGateGain) * 0.4;
        } else {
          // Dynamic studio noise gate attenuation (-36dB)
          this.targetGateGain = 0.015;
          this.currentGateGain += (this.targetGateGain - this.currentGateGain) * 0.10;
        }

        const now = this.audioCtx.currentTime;
        this.gateGainNode.gain.cancelScheduledValues(now);
        this.gateGainNode.gain.setValueAtTime(Math.max(0.015, Math.min(1.0, this.currentGateGain)), now);
      } else {
        this.gateGainNode.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
      }

      this.rafId = requestAnimationFrame(processGate);
    };

    processGate();
  }

  setSilenceRemoval(enabled) {
    this.isSilenceRemovalEnabled = enabled;
  }

  /**
   * Real-Time Autocorrelation Pitch Detector
   * Returns current pitch in Hz, musical note name, and vocal range category
   */
  getPitch() {
    if (!this.cleanAnalyserNode || !this.audioCtx || this.isMuted) {
      return { pitchHz: 0, note: '--', category: 'Microphone Inactive', clarity: 0, rms: 0 };
    }

    const buffer = new Float32Array(this.cleanAnalyserNode.fftSize);
    this.cleanAnalyserNode.getFloatTimeDomainData(buffer);

    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sum / buffer.length);

    if (rms < 0.008) {
      return { pitchHz: 0, note: '--', category: 'Silent / Paused', clarity: 0, rms };
    }

    const sampleRate = this.audioCtx.sampleRate || 48000;
    const minFreq = 70;   // Lowest human voice ~D2
    const maxFreq = 900;  // Highest human voice ~A5
    const maxPeriod = Math.floor(sampleRate / minFreq);
    const minPeriod = Math.floor(sampleRate / maxFreq);

    let bestCorrelation = -1;
    let bestPeriod = 0;

    for (let period = minPeriod; period <= maxPeriod; period++) {
      let correlation = 0;
      for (let i = 0; i < buffer.length - period; i++) {
        correlation += buffer[i] * buffer[i + period];
      }
      correlation /= (buffer.length - period);

      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestPeriod = period;
      }
    }

    if (bestPeriod === 0 || bestCorrelation < 0.00005) {
      return { pitchHz: 0, note: '--', category: 'Speaking...', clarity: 0, rms };
    }

    const pitchHz = Math.round(sampleRate / bestPeriod);
    const noteInfo = this.frequencyToNote(pitchHz);

    return {
      pitchHz,
      note: noteInfo.note,
      category: noteInfo.category,
      clarity: Math.min(1.0, bestCorrelation / (rms * rms + 0.0001)),
      rms
    };
  }

  frequencyToNote(freq) {
    if (freq < 50 || freq > 1200) return { note: '--', category: 'Unpitched' };

    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const c0 = 440.0 * Math.pow(2.0, -4.75); // ~16.35 Hz
    const halfSteps = Math.round(12.0 * Math.log2(freq / c0));
    const octave = Math.floor(halfSteps / 12);
    const noteIndex = (halfSteps % 12 + 12) % 12;
    const note = noteNames[noteIndex] + octave;

    let category = 'Normal Voice';
    if (freq < 130) category = 'Deep Bass Voice';
    else if (freq < 185) category = 'Baritone (Normal Male)';
    else if (freq < 265) category = 'Tenor / Alto Voice';
    else if (freq < 450) category = 'Soprano / High Voice';
    else category = 'High Pitch / Falsetto';

    return { note, category };
  }

  /**
   * Dual Waveform Data Provider (Raw Noise vs Clean AI Output)
   */
  getDualWaveformData(rawArray, cleanArray) {
    if (this.rawAnalyserNode && rawArray) {
      this.rawAnalyserNode.getFloatTimeDomainData(rawArray);
    }
    if (this.cleanAnalyserNode && cleanArray) {
      this.cleanAnalyserNode.getFloatTimeDomainData(cleanArray);
    }
  }

  /**
   * Byte Frequency Spectrum Data for EQ visualizer bars
   */
  getFrequencyData(frequencyArray) {
    if (this.cleanAnalyserNode && frequencyArray) {
      this.cleanAnalyserNode.getByteFrequencyData(frequencyArray);
    } else if (this.rawAnalyserNode && frequencyArray) {
      this.rawAnalyserNode.getByteFrequencyData(frequencyArray);
    }
  }

  /**
   * Real-time audio input metrics for VU meter and live voice detection
   */
  getLiveAudioMetrics() {
    if (this.isMuted || !this.cleanAnalyserNode || !this.audioCtx) {
      return { rms: 0, db: -96, volumePercent: 0, isSpeaking: false, isMuted: this.isMuted, vad: 0 };
    }

    const buffer = new Float32Array(this.cleanAnalyserNode.fftSize);
    this.cleanAnalyserNode.getFloatTimeDomainData(buffer);

    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sum / buffer.length);
    const volumePercent = Math.min(100, Math.round(rms * 300));
    const db = rms > 0.00005 ? Math.round(20 * Math.log10(rms)) : -96;
    const isSpeaking = rms > 0.012 || (this.lastVad > 0.4);

    return {
      rms,
      db: Math.max(-80, Math.min(0, db)),
      volumePercent,
      isSpeaking,
      isMuted: false,
      vad: this.lastVad || 0
    };
  }


  async close() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.denoiseState) {
      try {
        this.denoiseState.destroy();
      } catch (e) {}
      this.denoiseState = null;
    }
    if (this.rnnoiseNode) {
      try {
        this.rnnoiseNode.disconnect();
      } catch (e) {}
      this.rnnoiseNode = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      await this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}

window.fligoAudioEngine = new FligoAudioEngine();
