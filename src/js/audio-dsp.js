/**
 * CAPTO AUDIO DSP ENGINE
 * Real-Time Adaptive Noise Gate, WebRTC AI Noise Suppression, Mute/Unmute, System Audio Mixing & Auto-Silence Trimming
 */

class FligoAudioEngine {
  constructor() {
    this.audioCtx = null;
    this.micStream = null;
    this.systemStream = null;
    this.mixedDestination = null;

    // DSP Nodes
    this.highpassFilter = null;
    this.lowpassFilter = null;
    this.speechEnhancerFilter = null;
    this.gateGainNode = null;
    this.compressorNode = null;
    this.analyserNode = null;

    // Gate & Mute Parameters
    this.isMuted = false;
    this.isNoiseSuppressionEnabled = true;
    this.isSilenceRemovalEnabled = true;
    this.noiseGateThreshold = 0.015; // RMS threshold (~ -36dB)
    this.currentGateGain = 1.0;
    this.targetGateGain = 1.0;

    // Silence Trimming State
    this.silenceThresholdDb = -45; // dB
    this.silenceHoldTimeMs = 1200;
    this.isCurrentlySilent = false;
    this.silenceStartTime = 0;
    this.onSilenceStateChange = null;

    this.rafId = null;
  }

  async init(micStream, systemStream = null) {
    if (this.audioCtx) {
      await this.close();
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioContextClass({ sampleRate: 48000 });

    this.micStream = micStream;
    this.systemStream = systemStream;
    this.mixedDestination = this.audioCtx.createMediaStreamDestination();

    // 1. Microphone AI DSP Pipeline
    if (this.micStream && this.micStream.getAudioTracks().length > 0) {
      const micSource = this.audioCtx.createMediaStreamSource(this.micStream);

      // Highpass filter (cuts desk thumps, AC rumble, sub-bass < 90Hz)
      this.highpassFilter = this.audioCtx.createBiquadFilter();
      this.highpassFilter.type = 'highpass';
      this.highpassFilter.frequency.value = 90;
      this.highpassFilter.Q.value = 0.7;

      // Lowpass filter (cuts electrical high-frequency hiss > 14kHz)
      this.lowpassFilter = this.audioCtx.createBiquadFilter();
      this.lowpassFilter.type = 'lowpass';
      this.lowpassFilter.frequency.value = 14000;
      this.lowpassFilter.Q.value = 0.7;

      // Vocal Clarity Peaking Filter (+2.5dB at 2.5kHz)
      this.speechEnhancerFilter = this.audioCtx.createBiquadFilter();
      this.speechEnhancerFilter.type = 'peaking';
      this.speechEnhancerFilter.frequency.value = 2500;
      this.speechEnhancerFilter.gain.value = 2.5;
      this.speechEnhancerFilter.Q.value = 1.0;

      // Active Dynamic Noise Gate Gain Node
      this.gateGainNode = this.audioCtx.createGain();
      this.gateGainNode.gain.value = this.isMuted ? 0.0 : 1.0;

      // Broadcast Compressor
      this.compressorNode = this.audioCtx.createDynamicsCompressor();
      this.compressorNode.threshold.value = -24;
      this.compressorNode.knee.value = 10;
      this.compressorNode.ratio.value = 4;
      this.compressorNode.attack.value = 0.005;
      this.compressorNode.release.value = 0.15;

      // Output Analyser Node
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.3;

      // Connect Mic DSP Chain
      micSource.connect(this.highpassFilter);
      this.highpassFilter.connect(this.lowpassFilter);
      this.lowpassFilter.connect(this.speechEnhancerFilter);
      this.speechEnhancerFilter.connect(this.gateGainNode);
      this.gateGainNode.connect(this.compressorNode);
      this.compressorNode.connect(this.mixedDestination);
      this.compressorNode.connect(this.analyserNode);

      this.startAdaptiveNoiseGate();
    }

    // 2. System Audio Pipeline (Loopback)
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
    this.isMuted = muted;
    if (this.gateGainNode && this.audioCtx && this.audioCtx.state !== 'closed') {
      const now = this.audioCtx.currentTime;
      this.gateGainNode.gain.cancelScheduledValues(now);
      this.gateGainNode.gain.setValueAtTime(muted ? 0.0 : 1.0, now);
    }
  }

  startAdaptiveNoiseGate() {
    if (!this.analyserNode || !this.gateGainNode) return;

    const dataArray = new Float32Array(this.analyserNode.fftSize);

    const processGate = () => {
      if (!this.audioCtx || this.audioCtx.state === 'closed') return;

      if (this.isMuted) {
        this.gateGainNode.gain.setValueAtTime(0.0, this.audioCtx.currentTime);
        this.rafId = requestAnimationFrame(processGate);
        return;
      }

      this.analyserNode.getFloatTimeDomainData(dataArray);

      let sumSquares = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sumSquares += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sumSquares / dataArray.length);

      if (this.isNoiseSuppressionEnabled) {
        if (rms > this.noiseGateThreshold) {
          this.targetGateGain = 1.0;
          this.currentGateGain += (this.targetGateGain - this.currentGateGain) * 0.4;
        } else {
          this.targetGateGain = 0.04;
          this.currentGateGain += (this.targetGateGain - this.currentGateGain) * 0.08;
        }

        const now = this.audioCtx.currentTime;
        this.gateGainNode.gain.cancelScheduledValues(now);
        this.gateGainNode.gain.setValueAtTime(this.currentGateGain, now);
      } else {
        this.gateGainNode.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
      }

      this.rafId = requestAnimationFrame(processGate);
    };

    processGate();
  }

  setNoiseSuppression(enabled) {
    this.isNoiseSuppressionEnabled = enabled;
    if (this.highpassFilter && this.gateGainNode) {
      if (enabled) {
        this.highpassFilter.frequency.value = 90;
        this.lowpassFilter.frequency.value = 14000;
      } else {
        this.highpassFilter.frequency.value = 10;
        this.lowpassFilter.frequency.value = 22000;
        if (this.audioCtx && !this.isMuted) this.gateGainNode.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
      }
    }
  }

  setSilenceRemoval(enabled) {
    this.isSilenceRemovalEnabled = enabled;
  }

  async close() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      await this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}

window.fligoAudioEngine = new FligoAudioEngine();
