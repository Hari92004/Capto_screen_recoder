/**
 * CAPTO AUDIO DSP ENGINE
 * Real-Time Offline AI Active Noise Cancellation (RNNoise Neural Network WASM)
 * Dual Waveform Analysers (Raw vs Clean), Live Pitch & Vocal Range Detection,
 * Dynamic RMS Noise Gate & Multi-Stream Mixing
 */

class FligoAudioEngine {
  constructor() {
    this.audioCtx = null;
    this.micStream = null;
    this.systemStream = null;
    this.mixedDestination = null;

    // RNNoise Neural Network State
    this.rnnoise = null;
    this.denoiseState = null;
    this.isRnnoiseLoaded = false;
    this.isAiAncEnabled = true;
    this.ancStrength = 1.0; // 0.0 to 1.0 (100% Neural Suppression)
    this.lastVad = 0.0;
    this.frameSize = 480; // 10ms at 48kHz

    // DSP Nodes
    this.micSource = null;
    this.highpassFilter = null;
    this.lowpassFilter = null;
    this.rnnoiseNode = null;
    this.speechEnhancerFilter = null;
    this.gateGainNode = null;
    this.compressorNode = null;
    
    // Dual Analysers for Before vs After AI ANC Visualization
    this.rawAnalyserNode = null;
    this.cleanAnalyserNode = null;
    this.analyserNode = null; // Alias to cleanAnalyserNode

    // Gate & Parameters
    this.isMuted = false;
    this.isNoiseSuppressionEnabled = true;
    this.isSilenceRemovalEnabled = true;
    this.noiseGateThreshold = 0.012; // RMS threshold
    this.currentGateGain = 1.0;
    this.targetGateGain = 1.0;

    // Silence Trimming & VAD State
    this.silenceThresholdDb = -45;
    this.silenceHoldTimeMs = 1200;
    this.isCurrentlySilent = false;
    this.silenceStartTime = 0;
    this.onSilenceStateChange = null;

    this.rafId = null;

    // Pre-warm RNNoise WASM
    this.preloadRnnoise();
  }

  async preloadRnnoise() {
    if (this.isRnnoiseLoaded) return;
    try {
      const { Rnnoise } = await import('./rnnoise.js');
      this.rnnoise = await Rnnoise.load();
      this.frameSize = this.rnnoise.frameSize || 480;
      this.isRnnoiseLoaded = true;
      console.log('[Capto AI ANC] RNNoise Neural Network WASM Engine successfully initialized (Frame Size: ' + this.frameSize + ')');
    } catch (err) {
      console.warn('[Capto AI ANC] RNNoise pre-load fallback:', err);
    }
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

    // Ensure AudioContext is active and not suspended
    if (this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch (e) {}
    }

    // Ensure RNNoise is loaded
    if (!this.isRnnoiseLoaded) {
      await this.preloadRnnoise();
    }

    // 1. Microphone AI DSP Pipeline
    if (this.micStream && this.micStream.getAudioTracks().length > 0) {
      this.micSource = this.audioCtx.createMediaStreamSource(this.micStream);

      // Highpass filter (cuts desk rumbles, laptop chassis vibrations < 85Hz)
      this.highpassFilter = this.audioCtx.createBiquadFilter();
      this.highpassFilter.type = 'highpass';
      this.highpassFilter.frequency.value = 85;
      this.highpassFilter.Q.value = 0.7;

      // Lowpass filter (cuts high-frequency electrical hiss > 15kHz)
      this.lowpassFilter = this.audioCtx.createBiquadFilter();
      this.lowpassFilter.type = 'lowpass';
      this.lowpassFilter.frequency.value = 15000;
      this.lowpassFilter.Q.value = 0.7;

      // Raw Analyser Node (Captures audio BEFORE AI ANC denoise)
      this.rawAnalyserNode = this.audioCtx.createAnalyser();
      this.rawAnalyserNode.fftSize = 512;
      this.rawAnalyserNode.smoothingTimeConstant = 0.3;

      // Real-Time RNNoise WASM Neural Processor Node
      this.rnnoiseNode = this.createRnnoiseProcessor();

      // Vocal Clarity Peaking Filter (+2.2dB at 2.6kHz for broadcast voice presence)
      this.speechEnhancerFilter = this.audioCtx.createBiquadFilter();
      this.speechEnhancerFilter.type = 'peaking';
      this.speechEnhancerFilter.frequency.value = 2600;
      this.speechEnhancerFilter.gain.value = 2.2;
      this.speechEnhancerFilter.Q.value = 0.9;

      // Active Dynamic Noise Gate Gain Node
      this.gateGainNode = this.audioCtx.createGain();
      this.gateGainNode.gain.value = this.isMuted ? 0.0 : 1.0;

      // Broadcast Studio Dynamics Compressor
      this.compressorNode = this.audioCtx.createDynamicsCompressor();
      this.compressorNode.threshold.value = -24;
      this.compressorNode.knee.value = 12;
      this.compressorNode.ratio.value = 3.5;
      this.compressorNode.attack.value = 0.003;
      this.compressorNode.release.value = 0.12;

      // Clean Output Analyser Node (Captures audio AFTER AI ANC denoise)
      this.cleanAnalyserNode = this.audioCtx.createAnalyser();
      this.cleanAnalyserNode.fftSize = 512;
      this.cleanAnalyserNode.smoothingTimeConstant = 0.3;
      this.analyserNode = this.cleanAnalyserNode;

      // Connect Mic DSP Chain:
      // Mic -> Highpass -> Lowpass -> [Raw Analyser] & [RNNoise AI ANC]
      this.micSource.connect(this.highpassFilter);
      this.highpassFilter.connect(this.lowpassFilter);
      this.lowpassFilter.connect(this.rawAnalyserNode);
      this.lowpassFilter.connect(this.rnnoiseNode);

      // RNNoise -> Speech Enhancer -> Noise Gate -> Compressor -> [Clean Analyser] & Mixed Output
      this.rnnoiseNode.connect(this.speechEnhancerFilter);
      this.speechEnhancerFilter.connect(this.gateGainNode);
      this.gateGainNode.connect(this.compressorNode);
      this.compressorNode.connect(this.cleanAnalyserNode);
      this.compressorNode.connect(this.mixedDestination);

      // Connect zero-gain node to audioCtx.destination to ensure Web Audio graph continuously pumps
      this.silentMonitorGain = this.audioCtx.createGain();
      this.silentMonitorGain.gain.value = 0.0;
      this.compressorNode.connect(this.silentMonitorGain);
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

  createRnnoiseProcessor() {
    const bufferSize = 1024;
    const processor = this.audioCtx.createScriptProcessor(bufferSize, 1, 1);

    if (this.rnnoise && !this.denoiseState) {
      try {
        this.denoiseState = this.rnnoise.createDenoiseState();
      } catch (e) {
        console.warn('[Capto AI ANC] Error creating DenoiseState:', e);
      }
    }

    const frameSize = this.frameSize || 480;
    const inputFifo = [];
    const outputFifo = [];
    const frameBuffer = new Float32Array(frameSize);
    const rawFrameBuffer = new Float32Array(frameSize);

    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const output = e.outputBuffer.getChannelData(0);

      if (this.isMuted) {
        output.fill(0);
        return;
      }

      // If AI ANC is disabled or WASM state is not ready, pass raw audio through directly
      if (!this.isAiAncEnabled || !this.denoiseState || !this.isNoiseSuppressionEnabled) {
        output.set(input);
        return;
      }

      // Push incoming samples into FIFO
      for (let i = 0; i < input.length; i++) {
        inputFifo.push(input[i]);
      }

      // Process complete 480-sample frames with RNNoise AI model
      while (inputFifo.length >= frameSize) {
        for (let i = 0; i < frameSize; i++) {
          const s = inputFifo.shift();
          rawFrameBuffer[i] = s;
          frameBuffer[i] = s * 32767.0; // Scale float [-1.0, 1.0] to 16-bit PCM range
        }

        let vadProb = 0;
        try {
          vadProb = this.denoiseState.processFrame(frameBuffer);
          this.lastVad = vadProb;
        } catch (procErr) {
          console.warn('[Capto AI ANC] Frame processing error:', procErr);
          for (let i = 0; i < frameSize; i++) {
            frameBuffer[i] = rawFrameBuffer[i] * 32767.0;
          }
        }

        const strength = Math.max(0.0, Math.min(1.0, this.ancStrength));

        // Push denoised samples with strength blend to output FIFO
        for (let i = 0; i < frameSize; i++) {
          const denoised = frameBuffer[i] / 32767.0;
          const blended = (1.0 - strength) * rawFrameBuffer[i] + strength * denoised;
          outputFifo.push(blended);
        }
      }

      // Write available denoised samples to output buffer
      for (let i = 0; i < output.length; i++) {
        if (outputFifo.length > 0) {
          output[i] = outputFifo.shift();
        } else {
          output[i] = input[i]; // Fallback if underflow
        }
      }
    };

    return processor;
  }

  setMute(muted) {
    this.isMuted = muted;
    if (this.gateGainNode && this.audioCtx && this.audioCtx.state !== 'closed') {
      const now = this.audioCtx.currentTime;
      this.gateGainNode.gain.cancelScheduledValues(now);
      this.gateGainNode.gain.setValueAtTime(muted ? 0.0 : 1.0, now);
    }
  }

  setAiAncEnabled(enabled) {
    this.isAiAncEnabled = !!enabled;
    console.log('[Capto AI ANC] Deep Neural ANC state set to:', this.isAiAncEnabled);
  }

  setAncStrength(strength) {
    this.ancStrength = Math.max(0.0, Math.min(1.0, strength));
    console.log('[Capto AI ANC] ANC Strength adjusted to:', Math.round(this.ancStrength * 100) + '%');
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

      if (this.isNoiseSuppressionEnabled) {
        const isSpeaking = rms > this.noiseGateThreshold || (this.isAiAncEnabled && this.lastVad > 0.5);

        if (isSpeaking) {
          this.targetGateGain = 1.0;
          this.currentGateGain += (this.targetGateGain - this.currentGateGain) * 0.4;
        } else {
          this.targetGateGain = 0.02;
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
    this.setAiAncEnabled(enabled);
    if (this.highpassFilter && this.gateGainNode) {
      if (enabled) {
        this.highpassFilter.frequency.value = 85;
        this.lowpassFilter.frequency.value = 15000;
      } else {
        this.highpassFilter.frequency.value = 10;
        this.lowpassFilter.frequency.value = 22000;
        if (this.audioCtx && !this.isMuted) {
          this.gateGainNode.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
        }
      }
    }
  }

  setSilenceRemoval(enabled) {
    this.isSilenceRemovalEnabled = enabled;
  }

  setMute(muted) {
    this.isMuted = !!muted;
    if (this.gateGainNode && this.audioCtx) {
      const targetGain = this.isMuted ? 0.0 : 1.0;
      this.gateGainNode.gain.setValueAtTime(targetGain, this.audioCtx.currentTime);
    }
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
