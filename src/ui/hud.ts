// HUD and Interaction Controller (Emil Kowalski Design Engineering)

import { WaveField } from '../sim/waveField';
import { ParticleSystem } from '../sim/particles';
import { PlateRenderer, OverlayMode } from '../render/renderer';
import { PlateAudio } from '../audio/plateAudio';
import { PALETTES, PALETTE_LIST, Palette } from '../render/palettes';
import { HARMONIC_MODES, PLATE_PRESETS } from '../sim/presets';
import { createSlider, createChipGroup } from './components';

export interface HUDCallbacks {
  onPaletteChange: (palette: Palette) => void;
  onOverlayChange: (mode: OverlayMode) => void;
  onCenterImpulse: () => void;
  onRedistributeSand: () => void;
  onSnapshot: () => void;
}

export class HUD {
  private root: HTMLElement;
  private panel: HTMLElement;
  private body: HTMLElement;
  private isCollapsed: boolean = false;

  private wave: WaveField;
  private particles: ParticleSystem;
  private renderer: PlateRenderer;
  private audio: PlateAudio;
  private callbacks: HUDCallbacks;

  // Sliders for programmatic updates
  private dampingSlider: { container: HTMLElement; updateValue: (v: number) => void } | null = null;
  private speedSlider: { container: HTMLElement; updateValue: (v: number) => void } | null = null;
  private jitterSlider: { container: HTMLElement; updateValue: (v: number) => void } | null = null;
  private descentSlider: { container: HTMLElement; updateValue: (v: number) => void } | null = null;

  // Telemetry elements
  private fpsVal: HTMLElement | null = null;
  private energyVal: HTMLElement | null = null;
  private particlesVal: HTMLElement | null = null;
  private peakVelVal: HTMLElement | null = null;
  private audioVal: HTMLElement | null = null;
  private modeVal: HTMLElement | null = null;

  // Buttons
  private audioBtn: HTMLButtonElement | null = null;
  private overlayBtn: HTMLButtonElement | null = null;
  private collapseBtn: HTMLButtonElement | null = null;

  constructor(
    rootElement: HTMLElement,
    wave: WaveField,
    particles: ParticleSystem,
    renderer: PlateRenderer,
    audio: PlateAudio,
    callbacks: HUDCallbacks
  ) {
    this.root = rootElement;
    this.wave = wave;
    this.particles = particles;
    this.renderer = renderer;
    this.audio = audio;
    this.callbacks = callbacks;

    this.panel = document.createElement('div');
    this.panel.className = 'hud-panel';

    this.body = document.createElement('div');
    this.body.className = 'hud-body';

    this.build();
    this.setupKeyboardShortcuts();
  }

  private build(): void {
    this.panel.appendChild(this.buildHeader());
    this.buildBodyContent();
    this.panel.appendChild(this.body);
    this.root.appendChild(this.panel);
  }

  private buildHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'hud-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'hud-title-group';

    const title = document.createElement('div');
    title.className = 'hud-title';
    title.innerHTML = `<span class="pulse-indicator"></span>REVERBERATION`;

    const tag = document.createElement('span');
    tag.className = 'hud-title-tag';
    tag.textContent = '2D FDTD CYMATICS';

    titleGroup.appendChild(title);
    titleGroup.appendChild(tag);

    const actions = document.createElement('div');
    actions.className = 'hud-actions';

    // Sound toggle button
    this.audioBtn = document.createElement('button');
    this.audioBtn.type = 'button';
    this.audioBtn.className = 'btn-icon active';
    this.audioBtn.title = 'Toggle Audio [M]';
    this.audioBtn.innerHTML = `🔊`;
    this.audioBtn.addEventListener('click', () => this.toggleAudio());

    // Overlay toggle button
    this.overlayBtn = document.createElement('button');
    this.overlayBtn.type = 'button';
    this.overlayBtn.className = 'btn-icon';
    this.overlayBtn.title = 'Cycle Wave Field Overlay [V]';
    this.overlayBtn.innerHTML = `🌊`;
    this.overlayBtn.addEventListener('click', () => this.cycleOverlay());

    // Snapshot button
    const snapBtn = document.createElement('button');
    snapBtn.type = 'button';
    snapBtn.className = 'btn-icon';
    snapBtn.title = 'Export PNG Snapshot [S]';
    snapBtn.innerHTML = `📸`;
    snapBtn.addEventListener('click', () => this.callbacks.onSnapshot());

    // Collapse toggle button
    this.collapseBtn = document.createElement('button');
    this.collapseBtn.type = 'button';
    this.collapseBtn.className = 'btn-icon';
    this.collapseBtn.title = 'Toggle HUD Controls [H]';
    this.collapseBtn.innerHTML = `▲`;
    this.collapseBtn.addEventListener('click', () => this.toggleCollapse());

    actions.appendChild(this.audioBtn);
    actions.appendChild(this.overlayBtn);
    actions.appendChild(snapBtn);
    actions.appendChild(this.collapseBtn);

    header.appendChild(titleGroup);
    header.appendChild(actions);

    return header;
  }

  private buildBodyContent(): void {
    // 1. Vibrant Color Schemes
    const colorSection = document.createElement('div');
    colorSection.className = 'hud-section';
    const colorHeader = document.createElement('div');
    colorHeader.className = 'section-header';
    colorHeader.innerHTML = `<span class="section-tag">VIBRANT PALETTE</span><span class="section-caption">[C] TO CYCLE</span>`;
    colorSection.appendChild(colorHeader);

    const paletteItems = PALETTE_LIST.map(p => ({
      id: p.id,
      label: p.name.split(' ')[0],
      swatches: [p.primaryHex, p.secondaryHex, p.sandColors[2] ? `rgb(${p.sandColors[2].r},${p.sandColors[2].g},${p.sandColors[2].b})` : p.primaryHex]
    }));

    const paletteChips = createChipGroup(
      paletteItems,
      'electric',
      3,
      (id) => {
        const pal = PALETTES[id];
        if (pal) {
          this.applyPaletteTheme(pal);
          this.callbacks.onPaletteChange(pal);
        }
      }
    );
    colorSection.appendChild(paletteChips.container);
    this.body.appendChild(colorSection);

    // 2. Harmonic Cymatics Generator
    const cymaticSection = document.createElement('div');
    cymaticSection.className = 'hud-section';
    const cymaticHeader = document.createElement('div');
    cymaticHeader.className = 'section-header';
    cymaticHeader.innerHTML = `<span class="section-tag">CYMATIC STANDING MODES</span><span class="section-caption">CONTINUOUS EXCITATION</span>`;
    cymaticSection.appendChild(cymaticHeader);

    const modeItems = [
      { id: 'free', label: 'FREEFORM' },
      ...HARMONIC_MODES.map(m => ({ id: m.id, label: `${m.name}` }))
    ];

    const modeChips = createChipGroup(
      modeItems,
      'free',
      3,
      (id) => {
        if (id === 'free') {
          this.wave.cymaticActive = false;
          this.audio.setCymaticTone(false);
        } else {
          const mode = HARMONIC_MODES.find(m => m.id === id);
          if (mode) {
            this.wave.cymaticActive = true;
            this.wave.cymaticModeM = mode.m;
            this.wave.cymaticModeN = mode.n;
            this.wave.cymaticFreq = (mode.frequencyHz / 440) * 0.18;
            this.audio.setCymaticTone(true, mode.frequencyHz);
          }
        }
      }
    );
    cymaticSection.appendChild(modeChips.container);
    this.body.appendChild(cymaticSection);

    // 3. Acoustic Plate Presets
    const presetSection = document.createElement('div');
    presetSection.className = 'hud-section';
    const presetHeader = document.createElement('div');
    presetHeader.className = 'section-header';
    presetHeader.innerHTML = `<span class="section-tag">ACOUSTIC PLATE MATERIAL</span>`;
    presetSection.appendChild(presetHeader);

    const presetItems = PLATE_PRESETS.map(p => ({
      id: p.id,
      label: p.name.split(' ')[0]
    }));

    const presetChips = createChipGroup(
      presetItems,
      'aluminum',
      4,
      (id) => {
        const p = PLATE_PRESETS.find(pr => pr.id === id);
        if (p) {
          this.wave.waveSpeed = p.waveSpeed;
          this.wave.damping = p.damping;
          this.particles.jitterStrength = p.jitter;
          this.particles.descentRate = p.descentRate;

          this.speedSlider?.updateValue(p.waveSpeed);
          this.dampingSlider?.updateValue(p.damping);
          this.jitterSlider?.updateValue(p.jitter);
          this.descentSlider?.updateValue(p.descentRate);
        }
      }
    );
    presetSection.appendChild(presetChips.container);
    this.body.appendChild(presetSection);

    // 4. Physical Parameters (Sliders)
    const paramSection = document.createElement('div');
    paramSection.className = 'hud-section';
    const paramHeader = document.createElement('div');
    paramHeader.className = 'section-header';
    paramHeader.innerHTML = `<span class="section-tag">PHYSICS TUNING</span>`;
    paramSection.appendChild(paramHeader);

    this.dampingSlider = createSlider('damping', 'Plate Damping', 0.992, 0.9995, 0.0005, this.wave.damping, '', (v) => {
      this.wave.damping = v;
    });
    paramSection.appendChild(this.dampingSlider.container);

    this.speedSlider = createSlider('speed', 'Wave Speed (c)', 0.30, 0.68, 0.02, this.wave.waveSpeed, '', (v) => {
      this.wave.waveSpeed = v;
    });
    paramSection.appendChild(this.speedSlider.container);

    const grainSlider = createSlider('particles', 'Sand Density', 3000, 16000, 1000, this.particles.count, ' grains', (v) => {
      this.particles.resize(v, this.wave.width, this.wave.height);
    });
    paramSection.appendChild(grainSlider.container);

    this.jitterSlider = createSlider('jitter', 'Brownian Jitter', 0.01, 0.25, 0.01, this.particles.jitterStrength, '', (v) => {
      this.particles.jitterStrength = v;
    });
    paramSection.appendChild(this.jitterSlider.container);

    this.descentSlider = createSlider('descent', 'Nodal Drift Rate', 0.5, 3.0, 0.1, this.particles.descentRate, 'x', (v) => {
      this.particles.descentRate = v;
    });
    paramSection.appendChild(this.descentSlider.container);

    const forceSlider = createSlider('force', 'Strike Impulse Force', 0.8, 4.5, 0.1, this.wave.impulseStrength, 'x', (v) => {
      this.wave.impulseStrength = v;
    });
    paramSection.appendChild(forceSlider.container);

    this.body.appendChild(paramSection);

    // 5. Telemetry Matrix (Geist Mono ALL CAPS)
    const teleSection = document.createElement('div');
    teleSection.className = 'hud-section';
    const teleHeader = document.createElement('div');
    teleHeader.className = 'section-header';
    teleHeader.innerHTML = `<span class="section-tag">LIVE TELEMETRY</span><span class="section-caption">ACOUSTIC STATE</span>`;
    teleSection.appendChild(teleHeader);

    const teleGrid = document.createElement('div');
    teleGrid.className = 'telemetry-grid';

    teleGrid.innerHTML = `
      <div class="telemetry-item">
        <span class="telemetry-label">FPS</span>
        <span id="tele-fps" class="telemetry-val">60.0</span>
      </div>
      <div class="telemetry-item">
        <span class="telemetry-label">TOTAL ENERGY</span>
        <span id="tele-energy" class="telemetry-val">0.00 J</span>
      </div>
      <div class="telemetry-item">
        <span class="telemetry-label">GRAIN COUNT</span>
        <span id="tele-particles" class="telemetry-val">10,000</span>
      </div>
      <div class="telemetry-item">
        <span class="telemetry-label">PEAK VELOCITY</span>
        <span id="tele-peak" class="telemetry-val">0.00</span>
      </div>
      <div class="telemetry-item">
        <span class="telemetry-label">EXCITER</span>
        <span id="tele-mode" class="telemetry-val">FREEFORM</span>
      </div>
      <div class="telemetry-item">
        <span class="telemetry-label">SYNTH ENGINE</span>
        <span id="tele-audio" class="telemetry-val">ONLINE</span>
      </div>
    `;

    teleSection.appendChild(teleGrid);
    this.body.appendChild(teleSection);

    // Save references to telemetry spans
    this.fpsVal = teleGrid.querySelector('#tele-fps');
    this.energyVal = teleGrid.querySelector('#tele-energy');
    this.particlesVal = teleGrid.querySelector('#tele-particles');
    this.peakVelVal = teleGrid.querySelector('#tele-peak');
    this.modeVal = teleGrid.querySelector('#tele-mode');
    this.audioVal = teleGrid.querySelector('#tele-audio');

    // 6. Action Button Bar
    const actionSection = document.createElement('div');
    actionSection.className = 'action-row';

    const pulseBtn = document.createElement('button');
    pulseBtn.type = 'button';
    pulseBtn.className = 'action-btn primary';
    pulseBtn.innerHTML = `<span>STRIKE CENTER</span><span class="hotkey">SPACE</span>`;
    pulseBtn.addEventListener('click', () => this.callbacks.onCenterImpulse());

    const scatterBtn = document.createElement('button');
    scatterBtn.type = 'button';
    scatterBtn.className = 'action-btn';
    scatterBtn.innerHTML = `<span>SCATTER SAND</span><span class="hotkey">R</span>`;
    scatterBtn.addEventListener('click', () => this.callbacks.onRedistributeSand());

    actionSection.appendChild(pulseBtn);
    actionSection.appendChild(scatterBtn);
    this.body.appendChild(actionSection);
  }

  public applyPaletteTheme(palette: Palette): void {
    document.documentElement.style.setProperty('--accent-primary', palette.primaryHex);
    document.documentElement.style.setProperty('--accent-secondary', palette.secondaryHex);
    document.documentElement.style.setProperty('--accent-glow', palette.glowHex);
  }

  public toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
    if (this.isCollapsed) {
      this.body.classList.add('collapsed');
      if (this.collapseBtn) this.collapseBtn.innerHTML = `▼`;
    } else {
      this.body.classList.remove('collapsed');
      if (this.collapseBtn) this.collapseBtn.innerHTML = `▲`;
    }
  }

  public toggleAudio(): void {
    const isUnmuted = this.audio.toggleMute();
    if (this.audioBtn) {
      if (isUnmuted) {
        this.audioBtn.classList.add('active');
        this.audioBtn.innerHTML = `🔊`;
        if (this.audioVal) this.audioVal.textContent = 'ONLINE';
      } else {
        this.audioBtn.classList.remove('active');
        this.audioBtn.innerHTML = `🔇`;
        if (this.audioVal) this.audioVal.textContent = 'MUTED';
      }
    }
  }

  public cycleOverlay(): void {
    const modes: OverlayMode[] = ['none', 'wave', 'energy', 'nodal'];
    const curIdx = modes.indexOf(this.renderer.overlayMode);
    const nextMode = modes[(curIdx + 1) % modes.length];
    this.renderer.overlayMode = nextMode;

    if (this.overlayBtn) {
      if (nextMode === 'none') {
        this.overlayBtn.classList.remove('active');
      } else {
        this.overlayBtn.classList.add('active');
      }
    }

    this.callbacks.onOverlayChange(nextMode);
  }

  public updateTelemetry(fps: number): void {
    if (this.fpsVal) this.fpsVal.textContent = fps.toFixed(1);
    if (this.energyVal) this.energyVal.textContent = `${this.wave.totalEnergy.toFixed(2)} J`;
    if (this.particlesVal) this.particlesVal.textContent = this.particles.count.toLocaleString();
    if (this.peakVelVal) this.peakVelVal.textContent = this.wave.maxVelocity.toFixed(3);
    if (this.modeVal) {
      this.modeVal.textContent = this.wave.cymaticActive
        ? `(${this.wave.cymaticModeM},${this.wave.cymaticModeN})`
        : 'FREEFORM';
    }
  }

  private setupKeyboardShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      // Don't trigger if focus is in an input
      if (e.target instanceof HTMLInputElement) return;

      const key = e.key.toLowerCase();
      if (key === ' ' || e.code === 'Space') {
        e.preventDefault();
        this.callbacks.onCenterImpulse();
      } else if (key === 'h') {
        this.toggleCollapse();
      } else if (key === 'm') {
        this.toggleAudio();
      } else if (key === 'v') {
        this.cycleOverlay();
      } else if (key === 'r') {
        this.callbacks.onRedistributeSand();
      } else if (key === 's') {
        this.callbacks.onSnapshot();
      } else if (key === 'c') {
        // Cycle palette
        const keys = Object.keys(PALETTES);
        const curIdx = keys.findIndex(k => PALETTES[k].id === this.renderer.canvas.dataset.paletteId);
        const nextId = keys[(curIdx + 1) % keys.length];
        const nextPal = PALETTES[nextId];
        if (nextPal) {
          this.applyPaletteTheme(nextPal);
          this.callbacks.onPaletteChange(nextPal);
        }
      }
    });
  }
}
