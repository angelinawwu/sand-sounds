// 2D FDTD Scalar Wave Equation Solver on a Resonant Plate

export interface WaveFieldOptions {
  width: number;
  height: number;
  waveSpeed: number;     // c, typically 0.45 - 0.65 (CFL limit < 0.707)
  damping: number;       // damping factor 0.995 - 0.9995
}

export class WaveField {
  public readonly width: number;
  public readonly height: number;
  public readonly size: number;

  // Float32 buffers for wave state
  public h: Float32Array;         // Current height field
  public hPrev: Float32Array;     // Previous frame height
  public hNext: Float32Array;     // Next computed height
  public v: Float32Array;         // Velocity field v = h - hPrev
  public vMag: Float32Array;      // Absolute velocity magnitude |v|
  public gradX: Float32Array;     // Gradient of |v| in X direction
  public gradY: Float32Array;     // Gradient of |v| in Y direction

  // Physical simulation parameters
  public waveSpeed: number;
  public damping: number;
  public impulseRadius: number = 7;
  public impulseStrength: number = 2.4;
  public dragStrength: number = 0.55;

  // Cymatics driver state
  public cymaticActive: boolean = false;
  public cymaticFreq: number = 0;       // Frequency in radians/step
  public cymaticModeM: number = 2;
  public cymaticModeN: number = 2;
  public cymaticTime: number = 0;
  public cymaticAmplitude: number = 0.18;

  // Ambient heartbeat state
  public ambientEnabled: boolean = true;
  public lastInteractionTime: number = Date.now();
  private heartbeatTimer: number = 0;

  // Telemetry metrics
  public totalEnergy: number = 0;
  public maxVelocity: number = 0;

  constructor(options: Partial<WaveFieldOptions> = {}) {
    this.width = options.width ?? 200;
    this.height = options.height ?? 200;
    this.size = this.width * this.height;

    this.waveSpeed = options.waveSpeed ?? 0.52;
    this.damping = options.damping ?? 0.9975;

    this.h = new Float32Array(this.size);
    this.hPrev = new Float32Array(this.size);
    this.hNext = new Float32Array(this.size);
    this.v = new Float32Array(this.size);
    this.vMag = new Float32Array(this.size);
    this.gradX = new Float32Array(this.size);
    this.gradY = new Float32Array(this.size);
  }

  /**
   * Reset the wave field to zero
   */
  public clear(): void {
    this.h.fill(0);
    this.hPrev.fill(0);
    this.hNext.fill(0);
    this.v.fill(0);
    this.vMag.fill(0);
    this.gradX.fill(0);
    this.gradY.fill(0);
    this.totalEnergy = 0;
    this.maxVelocity = 0;
    this.lastInteractionTime = Date.now();
  }

  /**
   * Advance wave simulation by one discrete time step
   */
  public step(): void {
    const W = this.width;
    const H = this.height;
    const h = this.h;
    const hPrev = this.hPrev;
    const hNext = this.hNext;
    const v = this.v;
    const vMag = this.vMag;
    const gradX = this.gradX;
    const gradY = this.gradY;

    const cSq = Math.min(0.49, this.waveSpeed * this.waveSpeed);
    const damping = this.damping;

    // 1. Compute discrete FDTD wave equation for interior cells
    for (let y = 1; y < H - 1; y++) {
      const row = y * W;
      const rowUp = (y - 1) * W;
      const rowDown = (y + 1) * W;

      for (let x = 1; x < W - 1; x++) {
        const idx = row + x;
        const laplacian = h[idx + 1] + h[idx - 1] + h[rowDown + x] + h[rowUp + x] - 4.0 * h[idx];
        hNext[idx] = damping * (2.0 * h[idx] - hPrev[idx] + cSq * laplacian);
      }
    }

    // 2. Reflecting Neumann Boundary Conditions (mirror edge cells)
    for (let x = 0; x < W; x++) {
      hNext[x] = hNext[W + x];                 // Top row mirrors row 1
      hNext[(H - 1) * W + x] = hNext[(H - 2) * W + x]; // Bottom row mirrors row H-2
    }
    for (let y = 0; y < H; y++) {
      const row = y * W;
      hNext[row] = hNext[row + 1];             // Left col mirrors col 1
      hNext[row + W - 1] = hNext[row + W - 2]; // Right col mirrors col W-2
    }

    // 3. Inject continuous cymatic excitation if active
    if (this.cymaticActive) {
      this.cymaticTime += this.cymaticFreq;
      const amp = this.cymaticAmplitude * Math.sin(this.cymaticTime);
      const m = this.cymaticModeM;
      const n = this.cymaticModeN;
      
      for (let y = 1; y < H - 1; y++) {
        const ny = (y / H) * Math.PI;
        const row = y * W;
        for (let x = 1; x < W - 1; x++) {
          const nx = (x / W) * Math.PI;
          // 2D Chladni modal pattern injection: cos(m*x)*cos(n*y) - cos(n*x)*cos(m*y)
          const modeVal = Math.cos(m * nx) * Math.cos(n * ny) - Math.cos(n * nx) * Math.cos(m * ny);
          hNext[row + x] += amp * modeVal * 0.08;
        }
      }
    }

    // 4. Ambient Heartbeat (subtle breathing pulse when idle)
    if (this.ambientEnabled && !this.cymaticActive) {
      const idleTime = Date.now() - this.lastInteractionTime;
      if (idleTime > 4000) {
        this.heartbeatTimer += 0.02;
        if (this.heartbeatTimer > Math.PI * 2) {
          this.heartbeatTimer -= Math.PI * 2;
          // Pulse center
          const cx = Math.floor(W * 0.5);
          const cy = Math.floor(H * 0.5);
          this.injectImpulse(cx, cy, 0.45, 12);
        }
      } else {
        this.heartbeatTimer = 0;
      }
    }

    // 5. Derive Velocity Field v = h_curr - h_prev and update buffer references
    let totalE = 0;
    let maxV = 0;

    for (let i = 0; i < this.size; i++) {
      const velocity = hNext[i] - h[i];
      const mag = Math.abs(velocity);
      v[i] = velocity;
      vMag[i] = mag;
      totalE += velocity * velocity;
      if (mag > maxV) maxV = mag;

      // Cycle buffers: prev = curr, curr = next
      hPrev[i] = h[i];
      h[i] = hNext[i];
    }

    this.totalEnergy = totalE;
    this.maxVelocity = maxV;

    // 6. Derive Velocity-Magnitude Gradient ∇|v| for particle descent
    for (let y = 1; y < H - 1; y++) {
      const row = y * W;
      const rowUp = (y - 1) * W;
      const rowDown = (y + 1) * W;

      for (let x = 1; x < W - 1; x++) {
        const idx = row + x;
        // Central differences
        gradX[idx] = (vMag[idx + 1] - vMag[idx - 1]) * 0.5;
        gradY[idx] = (vMag[rowDown + x] - vMag[rowUp + x]) * 0.5;
      }
    }
  }

  /**
   * Inject a smooth radial Gaussian impulse (Tap)
   */
  public injectImpulse(cx: number, cy: number, amplitude: number = this.impulseStrength, radius: number = this.impulseRadius): void {
    this.lastInteractionTime = Date.now();
    const W = this.width;
    const H = this.height;
    const rInt = Math.ceil(radius * 2.5);
    const minX = Math.max(1, Math.floor(cx - rInt));
    const maxX = Math.min(W - 2, Math.ceil(cx + rInt));
    const minY = Math.max(1, Math.floor(cy - rInt));
    const maxY = Math.min(H - 2, Math.ceil(cy + rInt));
    const rSq = radius * radius;

    for (let y = minY; y <= maxY; y++) {
      const dy = y - cy;
      const dySq = dy * dy;
      const row = y * W;
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const distSq = dx * dx + dySq;
        const weight = Math.exp(-distSq / (2 * rSq));
        this.h[row + x] += amplitude * weight;
      }
    }
  }

  /**
   * Inject continuous impulse along a drag segment
   */
  public injectDrag(x0: number, y0: number, x1: number, y1: number, speed: number): void {
    this.lastInteractionTime = Date.now();
    // Scale amplitude by speed (slow drag bows gently, fast drag strikes plate)
    const speedFactor = Math.min(2.0, 0.4 + speed * 0.08);
    const amp = this.dragStrength * speedFactor * 0.4;
    const rad = Math.max(3, this.impulseRadius * 0.65);

    // Interpolate along line if points are far
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / 2));

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = x0 + dx * t;
      const py = y0 + dy * t;
      this.injectImpulse(px, py, amp / (steps * 0.6 + 0.4), rad);
    }
  }

  /**
   * Bilinear sampling of wave height at continuous coordinates (x, y)
   */
  public sampleHeight(x: number, y: number): number {
    const W = this.width;
    const H = this.height;
    const cx = Math.max(0, Math.min(W - 2, x));
    const cy = Math.max(0, Math.min(H - 2, y));
    const x0 = Math.floor(cx);
    const y0 = Math.floor(cy);
    const fx = cx - x0;
    const fy = cy - y0;

    const row0 = y0 * W;
    const row1 = (y0 + 1) * W;

    const h00 = this.h[row0 + x0];
    const h10 = this.h[row0 + x0 + 1];
    const h01 = this.h[row1 + x0];
    const h11 = this.h[row1 + x0 + 1];

    return (1 - fx) * (1 - fy) * h00 + fx * (1 - fy) * h10 + (1 - fx) * fy * h01 + fx * fy * h11;
  }

  /**
   * Bilinear sampling of velocity magnitude |v|
   */
  public sampleVelocityMag(x: number, y: number): number {
    const W = this.width;
    const H = this.height;
    const cx = Math.max(0, Math.min(W - 2, x));
    const cy = Math.max(0, Math.min(H - 2, y));
    const x0 = Math.floor(cx);
    const y0 = Math.floor(cy);
    const fx = cx - x0;
    const fy = cy - y0;

    const row0 = y0 * W;
    const row1 = (y0 + 1) * W;

    const v00 = this.vMag[row0 + x0];
    const v10 = this.vMag[row0 + x0 + 1];
    const v01 = this.vMag[row1 + x0];
    const v11 = this.vMag[row1 + x0 + 1];

    return (1 - fx) * (1 - fy) * v00 + fx * (1 - fy) * v10 + (1 - fx) * fy * v01 + fx * fy * v11;
  }

  /**
   * Bilinear sampling of velocity gradient ∇|v| = (gx, gy)
   */
  public sampleGradient(x: number, y: number): { gx: number; gy: number } {
    const W = this.width;
    const H = this.height;
    const cx = Math.max(1, Math.min(W - 2, x));
    const cy = Math.max(1, Math.min(H - 2, y));
    const x0 = Math.floor(cx);
    const y0 = Math.floor(cy);
    const fx = cx - x0;
    const fy = cy - y0;

    const row0 = y0 * W;
    const row1 = (y0 + 1) * W;

    const gx00 = this.gradX[row0 + x0];
    const gx10 = this.gradX[row0 + x0 + 1];
    const gx01 = this.gradX[row1 + x0];
    const gx11 = this.gradX[row1 + x0 + 1];

    const gy00 = this.gradY[row0 + x0];
    const gy10 = this.gradY[row0 + x0 + 1];
    const gy01 = this.gradY[row1 + x0];
    const gy11 = this.gradY[row1 + x0 + 1];

    const gx = (1 - fx) * (1 - fy) * gx00 + fx * (1 - fy) * gx10 + (1 - fx) * fy * gx01 + fx * fy * gx11;
    const gy = (1 - fx) * (1 - fy) * gy00 + fx * (1 - fy) * gy10 + (1 - fx) * fy * gy01 + fx * fy * gy11;

    return { gx, gy };
  }
}
