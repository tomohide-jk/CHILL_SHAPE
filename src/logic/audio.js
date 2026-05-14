/**
 * REBOOT_GATE — Audio Engine
 * Procedural audio generation using Web Audio API
 * No external audio files needed
 */

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.analyser = null;
    this.frequencyData = null;
    this.isInitialized = false;
    this.isPlaying = false;

    // Active sound nodes
    this.ambientNodes = [];
    this.dropNodes = [];
    this.activeSources = [];

    // Analysis bands
    this.bands = { low: 0, mid: 0, high: 0 };
  }

  /**
   * Initialize AudioContext (must be called from user interaction)
   */
  async init() {
    if (this.isInitialized) return;

    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Master gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.7;
    this.masterGain.connect(this.ctx.destination);

    // Analyser
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.8;
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

    this.analyser.connect(this.masterGain);

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.isInitialized = true;
  }

  /**
   * Get frequency band data (called every frame)
   */
  update() {
    if (!this.analyser || !this.frequencyData) return this.bands;

    this.analyser.getByteFrequencyData(this.frequencyData);

    const binCount = this.frequencyData.length;
    const lowEnd = Math.floor(binCount * 0.1);
    const midEnd = Math.floor(binCount * 0.5);

    let lowSum = 0, midSum = 0, highSum = 0;
    for (let i = 0; i < binCount; i++) {
      const val = this.frequencyData[i] / 255;
      if (i < lowEnd) lowSum += val;
      else if (i < midEnd) midSum += val;
      else highSum += val;
    }

    this.bands.low = lowEnd > 0 ? lowSum / lowEnd : 0;
    this.bands.mid = (midEnd - lowEnd) > 0 ? midSum / (midEnd - lowEnd) : 0;
    this.bands.high = (binCount - midEnd) > 0 ? highSum / (binCount - midEnd) : 0;

    return this.bands;
  }

  /**
   * Create a noise buffer for percussive sounds
   */
  _createNoiseBuffer(duration = 1) {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * Start ambient BGM (dark, ominous drone)
   */
  startAmbient() {
    if (!this.isInitialized) return;
    this.stopAmbient();

    const now = this.ctx.currentTime;
    const ambientGain = this.ctx.createGain();
    ambientGain.gain.value = 0;
    ambientGain.gain.linearRampToValueAtTime(0.3, now + 3);
    ambientGain.connect(this.analyser);

    // Low drone oscillators
    const droneFreqs = [55, 55.5, 82.5, 110];
    droneFreqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i < 2 ? 'sawtooth' : 'sine';
      osc.frequency.value = freq;

      // Slow LFO modulation
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = 0.1 + i * 0.05;
      lfoGain.gain.value = 2 + i;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(now);

      // Filter
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 200 + i * 100;
      filter.Q.value = 2;

      // LFO on filter
      const filterLfo = this.ctx.createOscillator();
      const filterLfoGain = this.ctx.createGain();
      filterLfo.frequency.value = 0.05 + i * 0.02;
      filterLfoGain.gain.value = 100;
      filterLfo.connect(filterLfoGain);
      filterLfoGain.connect(filter.frequency);
      filterLfo.start(now);

      const oscGain = this.ctx.createGain();
      oscGain.gain.value = 0.15 / droneFreqs.length;

      osc.connect(filter);
      filter.connect(oscGain);
      oscGain.connect(ambientGain);
      osc.start(now);

      this.ambientNodes.push(osc, lfo, filterLfo, oscGain, filter, lfoGain, filterLfoGain);
    });

    // Occasional metallic ping
    this._scheduleRandomPings(ambientGain);

    this.ambientNodes.push(ambientGain);
    this.isPlaying = true;
  }

  _scheduleRandomPings(destination) {
    const schedulePing = () => {
      if (!this.isPlaying) return;
      const delay = 2 + Math.random() * 6;
      setTimeout(() => {
        if (!this.isPlaying || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 800 + Math.random() * 3000;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = osc.frequency.value;
        filter.Q.value = 20;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(destination);
        osc.start(now);
        osc.stop(now + 0.8);

        schedulePing();
      }, delay * 1000);
    };
    schedulePing();
  }

  stopAmbient() {
    this.ambientNodes.forEach(node => {
      try {
        if (node.stop) node.stop();
        node.disconnect();
      } catch (e) { /* ignore */ }
    });
    this.ambientNodes = [];
  }

  /**
   * Start the drop (high-energy dance music)
   */
  startDrop() {
    if (!this.isInitialized) return;

    const now = this.ctx.currentTime;
    const bpm = 150;
    const beatDur = 60 / bpm;

    const dropGain = this.ctx.createGain();
    dropGain.gain.value = 0;
    dropGain.gain.linearRampToValueAtTime(0.5, now + 0.5);
    dropGain.connect(this.analyser);

    // Kick drum pattern
    this._scheduleKickPattern(now, beatDur, dropGain, 16);

    // Hi-hat pattern
    this._scheduleHiHatPattern(now, beatDur, dropGain, 32);

    // Bass line (PSYQUI-style arpeggio)
    this._scheduleBassArpeggio(now, beatDur, dropGain);

    // Lead synth
    this._scheduleLeadSynth(now, beatDur, dropGain);

    this.dropNodes.push(dropGain);
  }

  _scheduleKickPattern(startTime, beatDur, destination, beats) {
    for (let i = 0; i < beats; i++) {
      const t = startTime + i * beatDur;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(destination);
      osc.start(t);
      osc.stop(t + 0.25);

      this.dropNodes.push(osc, gain);
    }
  }

  _scheduleHiHatPattern(startTime, beatDur, destination, beats) {
    const noiseBuffer = this._createNoiseBuffer(0.1);
    for (let i = 0; i < beats; i++) {
      const t = startTime + i * (beatDur / 2);
      const isOffbeat = i % 2 === 1;

      const source = this.ctx.createBufferSource();
      source.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 8000;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(isOffbeat ? 0.08 : 0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(destination);
      source.start(t);

      this.dropNodes.push(source, filter, gain);
    }
  }

  _scheduleBassArpeggio(startTime, beatDur, destination) {
    // PSYQUI-style fast arpeggio pattern
    const notes = [110, 146.83, 174.61, 220, 174.61, 146.83, 110, 87.31];
    const stepDur = beatDur / 2;

    for (let rep = 0; rep < 2; rep++) {
      notes.forEach((freq, i) => {
        const t = startTime + (rep * notes.length + i) * stepDur;

        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, t);
        filter.frequency.exponentialRampToValueAtTime(200, t + stepDur * 0.9);
        filter.Q.value = 8;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + stepDur * 0.95);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(destination);
        osc.start(t);
        osc.stop(t + stepDur);

        this.dropNodes.push(osc, filter, gain);
      });
    }
  }

  _scheduleLeadSynth(startTime, beatDur, destination) {
    const melody = [440, 523.25, 659.25, 783.99, 659.25, 523.25, 440, 392];
    const stepDur = beatDur;

    melody.forEach((freq, i) => {
      const t = startTime + i * stepDur;

      // Supersaw-like: stack detuned oscillators
      for (let d = -2; d <= 2; d++) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq * Math.pow(2, d * 5 / 1200); // ±5 cents

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.03, t);
        gain.gain.setValueAtTime(0.03, t + stepDur * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, t + stepDur * 0.95);

        osc.connect(gain);
        gain.connect(destination);
        osc.start(t);
        osc.stop(t + stepDur);

        this.dropNodes.push(osc, gain);
      }
    });
  }

  stopDrop() {
    this.dropNodes.forEach(node => {
      try {
        if (node.stop) node.stop();
        node.disconnect();
      } catch (e) { /* ignore */ }
    });
    this.dropNodes = [];
  }

  // --- Sound Effects ---

  playClickSE() {
    if (!this.isInitialized) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.06);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.analyser);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playCorrectSE() {
    if (!this.isInitialized) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.12, now + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);

      osc.connect(gain);
      gain.connect(this.analyser);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.3);
    });
  }

  playErrorSE() {
    if (!this.isInitialized) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.analyser);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playFaderSE(value) {
    if (!this.isInitialized) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 300 + value * 1200;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.analyser);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  playPowerOnSE() {
    if (!this.isInitialized) return;
    const now = this.ctx.currentTime;

    // Rising sweep
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(50, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 1);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, now);
    filter.frequency.exponentialRampToValueAtTime(4000, now + 1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.setValueAtTime(0.15, now + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.analyser);
    osc.start(now);
    osc.stop(now + 1.2);
  }

  /**
   * Get raw frequency data for visualizer canvas
   */
  getFrequencyData() {
    return this.frequencyData;
  }

  dispose() {
    this.isPlaying = false;
    this.stopAmbient();
    this.stopDrop();
    if (this.ctx) {
      this.ctx.close();
    }
  }
}
