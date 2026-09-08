// Cymatic Harmonic Modes and Plate Presets

export interface HarmonicMode {
  id: string;
  name: string;
  m: number;
  n: number;
  frequencyHz: number;
  description: string;
}

export interface PlatePreset {
  id: string;
  name: string;
  material: string;
  waveSpeed: number;
  damping: number;
  jitter: number;
  descentRate: number;
}

export const HARMONIC_MODES: HarmonicMode[] = [
  {
    id: 'mode-1-1',
    name: 'Mode (1,1)',
    m: 1,
    n: 1,
    frequencyHz: 110,
    description: 'Fundamental dual-lobe resonance'
  },
  {
    id: 'mode-2-1',
    name: 'Mode (2,1)',
    m: 2,
    n: 1,
    frequencyHz: 220,
    description: 'Asymmetric diagonal nodal splits'
  },
  {
    id: 'mode-2-2',
    name: 'Mode (2,2)',
    m: 2,
    n: 2,
    frequencyHz: 440,
    description: 'Classic 4-quadrant Chladni cross'
  },
  {
    id: 'mode-3-2',
    name: 'Mode (3,2)',
    m: 3,
    n: 2,
    frequencyHz: 660,
    description: 'Harmonic interlocking ribs'
  },
  {
    id: 'mode-3-3',
    name: 'Mode (3,3)',
    m: 3,
    n: 3,
    frequencyHz: 880,
    description: 'High-order symmetric lattice matrix'
  },
  {
    id: 'mode-4-2',
    name: 'Mode (4,2)',
    m: 4,
    n: 2,
    frequencyHz: 1100,
    description: 'Ornate rosette cymatic geometry'
  }
];

export const PLATE_PRESETS: PlatePreset[] = [
  {
    id: 'aluminum',
    name: 'Aluminum Plate',
    material: 'Anodized 6061',
    waveSpeed: 0.54,
    damping: 0.9982,
    jitter: 0.08,
    descentRate: 1.5
  },
  {
    id: 'brass',
    name: 'Brass Acoustic',
    material: 'Bell Metal 70/30',
    waveSpeed: 0.48,
    damping: 0.9972,
    jitter: 0.09,
    descentRate: 1.4
  },
  {
    id: 'silicon',
    name: 'Silicon Membrane',
    material: 'Monocrystalline',
    waveSpeed: 0.62,
    damping: 0.9991,
    jitter: 0.06,
    descentRate: 1.8
  },
  {
    id: 'carbon',
    name: 'Carbon Composite',
    material: 'Toray 3K Twill',
    waveSpeed: 0.51,
    damping: 0.9950,
    jitter: 0.10,
    descentRate: 1.3
  }
];
