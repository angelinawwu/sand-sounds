// High DPI Canvas Visualizer for Sand Particles and Acoustic Wave Fields

import { WaveField } from '../sim/waveField';
import { ParticleSystem } from '../sim/particles';
import { Palette, samplePaletteColor } from './palettes';

export type OverlayMode = 'none' | 'wave' | 'energy' | 'nodal';

export class PlateRenderer {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public width: number = 0;
  public height: number = 0;
  public dpr: number = 1;

  public overlayMode: OverlayMode = 'none';
  public trailPersistence: number = 0.28; // Trail fade factor (0 = hard clear, 0.4 = glowing trails)
  public showGrid: boolean = true;
  public particleGlow: boolean = true;

  // Offscreen canvas for wave/overlay field rendering
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private fieldImageData: ImageData | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not obtain 2D rendering context');
    this.ctx = context;

    this.offscreenCanvas = document.createElement('canvas');
    const offCtx = this.offscreenCanvas.getContext('2d');
    if (!offCtx) throw new Error('Could not create offscreen context');
    this.offscreenCtx = offCtx;

    this.resize();
  }

  public resize(): void {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  /**
   * Render the entire scene (Plate + Wave Overlay + Sand Particles)
   */
  public render(wave: WaveField, particles: ParticleSystem, palette: Palette): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Clear plate background with trail persistence
    if (this.trailPersistence > 0.05 && this.overlayMode === 'none') {
      ctx.fillStyle = `rgba(8, 9, 12, ${1 - this.trailPersistence})`;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = palette.plateColor;
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Render Optional Wave / Energy / Nodal Field Overlay
    if (this.overlayMode !== 'none') {
      this.renderFieldOverlay(wave, palette);
    }

    // 3. Render Subtle Geometric Resonant Plate Grid
    if (this.showGrid) {
      this.renderPlateGrid(palette);
    }

    // 4. Render Sand Particles
    this.renderSandParticles(wave, particles, palette);
  }

  /**
   * Render field overlay onto offscreen canvas then scale up with smoothing
   */
  private renderFieldOverlay(wave: WaveField, palette: Palette): void {
    const W = wave.width;
    const H = wave.height;

    if (this.offscreenCanvas.width !== W || this.offscreenCanvas.height !== H) {
      this.offscreenCanvas.width = W;
      this.offscreenCanvas.height = H;
      this.fieldImageData = this.offscreenCtx.createImageData(W, H);
    }

    if (!this.fieldImageData) return;
    const data = this.fieldImageData.data;
    const hField = wave.h;
    const vMag = wave.vMag;
    const mode = this.overlayMode;

    for (let i = 0; i < wave.size; i++) {
      const pIdx = i * 4;
      if (mode === 'wave') {
        // Monochromatic height wave ripples
        const val = Math.max(-1, Math.min(1, hField[i] * 0.45));
        if (val > 0) {
          // Crest (cyan tint)
          data[pIdx] = Math.floor(val * 40);
          data[pIdx + 1] = Math.floor(val * 200);
          data[pIdx + 2] = Math.floor(val * 255);
        } else {
          // Trough (magenta tint)
          const neg = -val;
          data[pIdx] = Math.floor(neg * 220);
          data[pIdx + 1] = 0;
          data[pIdx + 2] = Math.floor(neg * 140);
        }
        data[pIdx + 3] = 160;
      } else if (mode === 'energy') {
        // Kinetic velocity heatmap
        const energyNorm = Math.min(1.0, vMag[i] * 4.0);
        const col = samplePaletteColor(palette, energyNorm);
        data[pIdx] = col.r;
        data[pIdx + 1] = col.g;
        data[pIdx + 2] = col.b;
        data[pIdx + 3] = Math.floor(energyNorm * 180 + 20);
      } else if (mode === 'nodal') {
        // Nodal line proximity (high alpha where |v| is close to 0)
        const stillness = Math.max(0, 1.0 - vMag[i] * 6.0);
        data[pIdx] = 0;
        data[pIdx + 1] = Math.floor(stillness * 240);
        data[pIdx + 2] = Math.floor(stillness * 255);
        data[pIdx + 3] = Math.floor(stillness * 140);
      }
    }

    this.offscreenCtx.putImageData(this.fieldImageData, 0, 0);

    // Composite scaled offscreen canvas
    this.ctx.save();
    this.ctx.globalAlpha = 0.55;
    this.ctx.drawImage(this.offscreenCanvas, 0, 0, this.width, this.height);
    this.ctx.restore();
  }

  /**
   * Render subtle acoustic plate guidelines and corner markings
   */
  private renderPlateGrid(palette: Palette): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.save();
    ctx.strokeStyle = palette.gridLineColor;
    ctx.lineWidth = 1;

    // Corner alignment brackets (Strict Sharp Corners)
    const bracketSize = 24;
    const pad = 20;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(pad, pad + bracketSize);
    ctx.lineTo(pad, pad);
    ctx.lineTo(pad + bracketSize, pad);
    // Top-Right
    ctx.moveTo(w - pad - bracketSize, pad);
    ctx.lineTo(w - pad, pad);
    ctx.lineTo(w - pad, pad + bracketSize);
    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(pad, h - pad - bracketSize);
    ctx.lineTo(pad, h - pad);
    ctx.lineTo(pad + bracketSize, h - pad);
    // Bottom-Right
    ctx.moveTo(w - pad - bracketSize, h - pad);
    ctx.lineTo(w - pad, h - pad);
    ctx.lineTo(w - pad, h - pad - bracketSize);
    ctx.stroke();

    // Center Crosshair
    const cx = w * 0.5;
    const cy = h * 0.5;
    const crossSize = 10;
    ctx.beginPath();
    ctx.moveTo(cx - crossSize, cy);
    ctx.lineTo(cx + crossSize, cy);
    ctx.moveTo(cx, cy - crossSize);
    ctx.lineTo(cx, cy + crossSize);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Render sand particles with spectral velocity tinting
   */
  private renderSandParticles(wave: WaveField, particles: ParticleSystem, palette: Palette): void {
    const ctx = this.ctx;
    const count = particles.count;
    const posX = particles.posX;
    const posY = particles.posY;
    const excitation = particles.excitation;

    const scaleX = this.width / wave.width;
    const scaleY = this.height / wave.height;
    const baseGrain = particles.grainSize;

    // Group rendering by color buckets or render individually with fast rects
    // Canvas fillRect for sharp microscopic sand grains is extremely fast and sharp!
    for (let i = 0; i < count; i++) {
      const px = posX[i] * scaleX;
      const py = posY[i] * scaleY;
      const ex = excitation[i];

      const col = samplePaletteColor(palette, ex);
      ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${col.a})`;

      const size = baseGrain * (1.0 + ex * 0.4);
      // Sharp square sand grains
      ctx.fillRect(px - size * 0.5, py - size * 0.5, size, size);
    }
  }

  /**
   * Export high-res snapshot of current plate pattern
   */
  public exportSnapshot(): void {
    const dataUrl = this.canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `reverberation-chladni-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }
}
