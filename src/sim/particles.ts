// Sand Particle System for Chladni Cymatic Nodal Line Settling

import { WaveField } from './waveField';

export interface ParticleOptions {
  count: number;
  jitterStrength: number;
  descentRate: number;
  friction: number;
  maxSpeed: number;
}

export class ParticleSystem {
  public count: number;
  public posX: Float32Array;
  public posY: Float32Array;
  public velX: Float32Array;
  public velY: Float32Array;
  public excitation: Float32Array; // Normalized kinetic activity for color coding

  public jitterStrength: number;
  public descentRate: number;
  public friction: number;
  public maxSpeed: number;
  public grainSize: number = 1.2;

  constructor(count: number = 10000, options: Partial<ParticleOptions> = {}) {
    this.count = count;
    this.jitterStrength = options.jitterStrength ?? 0.08;
    this.descentRate = options.descentRate ?? 1.45;
    this.friction = options.friction ?? 0.88;
    this.maxSpeed = options.maxSpeed ?? 1.8;

    this.posX = new Float32Array(count);
    this.posY = new Float32Array(count);
    this.velX = new Float32Array(count);
    this.velY = new Float32Array(count);
    this.excitation = new Float32Array(count);

    this.distributeUniformly(200, 200);
  }

  /**
   * Distribute sand uniformly across the simulation domain
   */
  public distributeUniformly(gridWidth: number, gridHeight: number): void {
    const margin = 4;
    const w = gridWidth - margin * 2;
    const h = gridHeight - margin * 2;

    for (let i = 0; i < this.count; i++) {
      this.posX[i] = margin + Math.random() * w;
      this.posY[i] = margin + Math.random() * h;
      this.velX[i] = (Math.random() - 0.5) * 0.1;
      this.velY[i] = (Math.random() - 0.5) * 0.1;
      this.excitation[i] = 0;
    }
  }

  /**
   * Reallocate buffer sizes when particle count changes
   */
  public resize(newCount: number, gridWidth: number, gridHeight: number): void {
    if (newCount === this.count) return;

    const oldX = this.posX;
    const oldY = this.posY;
    const oldVX = this.velX;
    const oldVY = this.velY;
    const oldEx = this.excitation;

    this.posX = new Float32Array(newCount);
    this.posY = new Float32Array(newCount);
    this.velX = new Float32Array(newCount);
    this.velY = new Float32Array(newCount);
    this.excitation = new Float32Array(newCount);

    const minC = Math.min(this.count, newCount);
    for (let i = 0; i < minC; i++) {
      this.posX[i] = oldX[i];
      this.posY[i] = oldY[i];
      this.velX[i] = oldVX[i];
      this.velY[i] = oldVY[i];
      this.excitation[i] = oldEx[i];
    }

    // Initialize any new particles
    const margin = 4;
    const w = gridWidth - margin * 2;
    const h = gridHeight - margin * 2;
    for (let i = minC; i < newCount; i++) {
      this.posX[i] = margin + Math.random() * w;
      this.posY[i] = margin + Math.random() * h;
      this.velX[i] = 0;
      this.velY[i] = 0;
      this.excitation[i] = 0;
    }

    this.count = newCount;
  }

  /**
   * Update particle positions based on wave field gradient descent and kinetic bounce
   */
  public update(wave: WaveField): void {
    const count = this.count;
    const posX = this.posX;
    const posY = this.posY;
    const velX = this.velX;
    const velY = this.velY;
    const excitation = this.excitation;

    const W = wave.width;
    const H = wave.height;
    const descentRate = this.descentRate;
    const jitter = this.jitterStrength;
    const friction = this.friction;
    const maxSpeed = this.maxSpeed;
    const maxSpeedSq = maxSpeed * maxSpeed;

    for (let i = 0; i < count; i++) {
      const px = posX[i];
      const py = posY[i];

      // Sample local wave velocity magnitude and gradient
      const localVMag = wave.sampleVelocityMag(px, py);
      const { gx, gy } = wave.sampleGradient(px, py);

      // Force pushes particles DOWN the velocity gradient (towards nodal lines |v| ~ 0)
      // When the plate vibrates vigorously, acceleration kicks particles up, making them slip towards quiet nodes
      const kick = Math.min(3.0, localVMag * 8.0);
      const forceX = -gx * descentRate * (0.6 + kick);
      const forceY = -gy * descentRate * (0.6 + kick);

      // Brownian jitter scaled by local vibration
      const brownianX = (Math.random() - 0.5) * jitter * (1.0 + kick * 2.5);
      const brownianY = (Math.random() - 0.5) * jitter * (1.0 + kick * 2.5);

      // Integrate velocity
      let vx = (velX[i] + forceX + brownianX) * friction;
      let vy = (velY[i] + forceY + brownianY) * friction;

      // Speed clamp
      const speedSq = vx * vx + vy * vy;
      if (speedSq > maxSpeedSq) {
        const factor = maxSpeed / Math.sqrt(speedSq);
        vx *= factor;
        vy *= factor;
      }

      velX[i] = vx;
      velY[i] = vy;

      // Update position
      let nx = px + vx;
      let ny = py + vy;

      // Boundary bouncing with gentle inward restitution
      const margin = 2.0;
      if (nx < margin) {
        nx = margin + (margin - nx) * 0.5;
        velX[i] = Math.abs(vx) * 0.4;
      } else if (nx > W - margin) {
        nx = (W - margin) - (nx - (W - margin)) * 0.5;
        velX[i] = -Math.abs(vx) * 0.4;
      }

      if (ny < margin) {
        ny = margin + (margin - ny) * 0.5;
        velY[i] = Math.abs(vy) * 0.4;
      } else if (ny > H - margin) {
        ny = (H - margin) - (ny - (H - margin)) * 0.5;
        velY[i] = -Math.abs(vy) * 0.4;
      }

      posX[i] = nx;
      posY[i] = ny;

      // Update excitation metric (for vibrant rendering)
      const currentActivity = (Math.sqrt(speedSq) * 0.5 + localVMag * 3.5);
      excitation[i] = excitation[i] * 0.85 + Math.min(1.0, currentActivity) * 0.15;
    }
  }
}
