// Web Audio API Resonant Modal Plate Synthesizer

export class PlateAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private frictionGain: GainNode | null = null;
  private frictionFilter: BiquadFilterNode | null = null;
  private frictionSource: AudioBufferSourceNode | null = null;
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;

  public enabled: boolean = true;
  public volume: number = 0.4;
  private isMuted: boolean = false;
  private initialized: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  public init(): void {
    if (this.initialized) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Setup continuous drag friction noise generator
      this.setupFrictionNoise();

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  private setupFrictionNoise(): void {
    if (!this.ctx || !this.masterGain) return;

    // Generate 2 seconds of looping filtered pink/brownian noise
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2) * 0.15;
    }

    this.frictionSource = this.ctx.createBufferSource();
    this.frictionSource.buffer = noiseBuffer;
    this.frictionSource.loop = true;

    this.frictionFilter = this.ctx.createBiquadFilter();
    this.frictionFilter.type = 'bandpass';
    this.frictionFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
    this.frictionFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    this.frictionGain = this.ctx.createGain();
    this.frictionGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.frictionSource.connect(this.frictionFilter);
    this.frictionFilter.connect(this.frictionGain);
    this.frictionGain.connect(this.masterGain);

    this.frictionSource.start(0);
  }

  /**
   * Ensure audio context is running (resume if suspended by browser autoplay policy)
   */
  public resume(): void {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Synthesize acoustic impulse strike chime (Chladni modal plate resonator)
   */
  public playStrike(normX: number, normY: number, force: number = 1.0): void {
    if (!this.enabled || this.isMuted || !this.ctx || !this.masterGain) return;
    this.resume();

    const now = this.ctx.currentTime;
    const baseFreq = 140 + normX * 180 + normY * 120; // Spatial tuning

    // Chladni modal overtone ratios for 2D square plate
    const modeRatios = [1.0, 1.58, 2.06, 2.82, 3.45];
    const duration = 1.2 + Math.min(1.8, force * 0.8);

    modeRatios.forEach((ratio, index) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = index === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(baseFreq * ratio, now);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(baseFreq * ratio, now);
      filter.Q.setValueAtTime(8 + index * 4, now);

      const amp = (0.22 / (index + 1)) * Math.min(1.0, force * 0.7);
      gain.gain.setValueAtTime(amp, now);
      // Exponential acoustic decay
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration / (1 + index * 0.4));

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + duration + 0.1);
    });
  }

  /**
   * Update continuous drag friction audio
   */
  public updateDrag(speed: number, normX: number, normY: number): void {
    if (!this.enabled || this.isMuted || !this.ctx || !this.frictionGain || !this.frictionFilter) return;

    const now = this.ctx.currentTime;
    const targetGain = Math.min(0.28, speed * 0.045);
    const targetFreq = 250 + normX * 600 + normY * 400 + speed * 30;

    this.frictionGain.gain.setTargetAtTime(targetGain, now, 0.05);
    this.frictionFilter.frequency.setTargetAtTime(Math.min(3000, targetFreq), now, 0.05);
  }

  /**
   * Stop drag friction audio
   */
  public stopDrag(): void {
    if (!this.ctx || !this.frictionGain) return;
    this.frictionGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
  }

  /**
   * Set continuous cymatic tone
   */
  public setCymaticTone(active: boolean, freqHz: number = 440): void {
    if (!this.enabled || this.isMuted) return;
    if (!this.ctx || !this.masterGain) return;
    this.resume();

    const now = this.ctx.currentTime;
    if (active) {
      if (!this.droneOsc) {
        this.droneOsc = this.ctx.createOscillator();
        this.droneGain = this.ctx.createGain();
        this.droneOsc.type = 'sine';
        this.droneOsc.frequency.setValueAtTime(freqHz, now);
        this.droneGain.gain.setValueAtTime(0, now);
        this.droneGain.gain.linearRampToValueAtTime(0.12, now + 0.25);
        this.droneOsc.connect(this.droneGain);
        this.droneGain.connect(this.masterGain);
        this.droneOsc.start(now);
      } else {
        this.droneOsc.frequency.setTargetAtTime(freqHz, now, 0.1);
        if (this.droneGain) {
          this.droneGain.gain.setTargetAtTime(0.12, now, 0.1);
        }
      }
    } else {
      if (this.droneGain && this.droneOsc) {
        this.droneGain.gain.setTargetAtTime(0, now, 0.15);
        setTimeout(() => {
          if (!this.droneOsc) return;
          try {
            this.droneOsc.stop();
            this.droneOsc.disconnect();
          } catch {
            // ignore if already stopped
          }
          this.droneOsc = null;
          this.droneGain = null;
        }, 200);
      }
    }
  }

  /**
   * Toggle mute
   */
  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
    return !this.isMuted;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}
