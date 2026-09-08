// Main Application Entry Point for Reverberation (Sand Sounds)

import { WaveField } from './sim/waveField';
import { ParticleSystem } from './sim/particles';
import { PlateRenderer } from './render/renderer';
import { PlateAudio } from './audio/plateAudio';
import { PALETTES, Palette } from './render/palettes';
import { HUD } from './ui/hud';

class ReverberationApp {
  private canvas: HTMLCanvasElement;
  private wave: WaveField;
  private particles: ParticleSystem;
  private renderer: PlateRenderer;
  private audio: PlateAudio;
  private hud: HUD;
  private currentPalette: Palette;

  // Pointer interaction state
  private isPointerDown: boolean = false;
  private lastPointerX: number = 0;
  private lastPointerY: number = 0;
  private lastPointerTime: number = 0;
  private hasInteracted: boolean = false;

  // Performance telemetry
  private fps: number = 60;
  private frameCount: number = 0;
  private fpsUpdateTime: number = performance.now();

  constructor() {
    const canvasElement = document.getElementById('sim-canvas') as HTMLCanvasElement;
    if (!canvasElement) throw new Error('Simulation canvas not found');
    this.canvas = canvasElement;

    // Default palette
    this.currentPalette = PALETTES.electric;
    this.canvas.dataset.paletteId = this.currentPalette.id;

    // Simulation grid: 220x220 for ideal resolution / FDTD stability
    this.wave = new WaveField({
      width: 220,
      height: 220,
      waveSpeed: 0.54,
      damping: 0.9982
    });

    // 10,000 sand grains initially
    this.particles = new ParticleSystem(10000, {
      jitterStrength: 0.08,
      descentRate: 1.5,
      friction: 0.88,
      maxSpeed: 1.8
    });

    // Renderer
    this.renderer = new PlateRenderer(this.canvas);

    // Audio synthesizer
    this.audio = new PlateAudio();

    // Setup HUD
    const hudRoot = document.getElementById('hud-root');
    if (!hudRoot) throw new Error('HUD root element not found');

    this.hud = new HUD(
      hudRoot,
      this.wave,
      this.particles,
      this.renderer,
      this.audio,
      {
        onPaletteChange: (pal) => {
          this.currentPalette = pal;
          this.canvas.dataset.paletteId = pal.id;
        },
        onOverlayChange: (_mode) => {
          // overlay mode updated in renderer
        },
        onCenterImpulse: () => {
          this.triggerCenterImpulse();
        },
        onRedistributeSand: () => {
          this.particles.distributeUniformly(this.wave.width, this.wave.height);
        },
        onSnapshot: () => {
          this.renderer.exportSnapshot();
        }
      }
    );

    this.setupPointerEvents();
    this.setupResizeListener();
    this.startLoop();
  }

  /**
   * Convert screen pointer (clientX, clientY) to simulation grid coordinates (x, y)
   */
  private screenToGrid(clientX: number, clientY: number): { gx: number; gy: number; normX: number; normY: number } {
    const rect = this.canvas.getBoundingClientRect();
    const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    const gx = normX * (this.wave.width - 1);
    const gy = normY * (this.wave.height - 1);

    return { gx, gy, normX, normY };
  }

  private setupPointerEvents(): void {
    const canvas = this.canvas;

    const onPointerDown = (e: PointerEvent) => {
      this.isPointerDown = true;
      canvas.setPointerCapture(e.pointerId);

      const { gx, gy, normX, normY } = this.screenToGrid(e.clientX, e.clientY);
      this.lastPointerX = gx;
      this.lastPointerY = gy;
      this.lastPointerTime = performance.now();

      // Trigger discrete tap impulse
      this.wave.injectImpulse(gx, gy, this.wave.impulseStrength, this.wave.impulseRadius);

      // Play physical acoustic modal strike
      this.audio.playStrike(normX, normY, 1.0);

      this.dismissHint();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.isPointerDown) return;

      const now = performance.now();
      const dt = Math.max(1, now - this.lastPointerTime);
      const { gx, gy, normX, normY } = this.screenToGrid(e.clientX, e.clientY);

      const dx = gx - this.lastPointerX;
      const dy = gy - this.lastPointerY;
      const dist = Math.hypot(dx, dy);
      const speed = (dist / dt) * 16.67; // normalized speed per 60fps frame

      // Inject continuous drag impulse
      if (dist > 0.5) {
        this.wave.injectDrag(this.lastPointerX, this.lastPointerY, gx, gy, speed);
        this.audio.updateDrag(speed, normX, normY);
      }

      this.lastPointerX = gx;
      this.lastPointerY = gy;
      this.lastPointerTime = now;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!this.isPointerDown) return;
      this.isPointerDown = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // ignore if not captured
      }
      this.audio.stopDrag();
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
  }

  private dismissHint(): void {
    if (this.hasInteracted) return;
    this.hasInteracted = true;
    const hint = document.getElementById('interaction-hint');
    if (hint) {
      hint.classList.add('fade-out');
      setTimeout(() => hint.remove(), 400);
    }
  }

  private triggerCenterImpulse(): void {
    const cx = this.wave.width * 0.5;
    const cy = this.wave.height * 0.5;
    this.wave.injectImpulse(cx, cy, this.wave.impulseStrength * 1.3, this.wave.impulseRadius * 1.2);
    this.audio.playStrike(0.5, 0.5, 1.4);
    this.dismissHint();
  }

  private setupResizeListener(): void {
    let resizeTimer: number;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        this.renderer.resize();
      }, 100);
    });
  }

  private startLoop(): void {
    const loop = (timestamp: number) => {
      // FPS computation
      this.frameCount++;

      if (timestamp - this.fpsUpdateTime > 400) {
        this.fps = (this.frameCount * 1000) / (timestamp - this.fpsUpdateTime);
        this.frameCount = 0;
        this.fpsUpdateTime = timestamp;
        this.hud.updateTelemetry(this.fps);
      }

      // 1. Advance Wave Field Simulation
      this.wave.step();

      // 2. Update Sand Particle Positions
      this.particles.update(this.wave);

      // 3. Render Canvas Frame
      this.renderer.render(this.wave, this.particles, this.currentPalette);

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new ReverberationApp();
});
