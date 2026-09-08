// Vibrant Color Palettes for Sand Sounds Simulation

export interface ColorStop {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface Palette {
  id: string;
  name: string;
  primaryHex: string;
  secondaryHex: string;
  glowHex: string;
  // Colors for sand particles based on velocity/energy gradient
  sandColors: ColorStop[];
  // Background gradient or clear tone
  plateColor: string;
  gridLineColor: string;
}

export const PALETTES: Record<string, Palette> = {
  electric: {
    id: 'electric',
    name: 'Electric Spectral',
    primaryHex: '#00f0ff',
    secondaryHex: '#ff007f',
    glowHex: 'rgba(0, 240, 255, 0.4)',
    plateColor: '#07090e',
    gridLineColor: 'rgba(0, 240, 255, 0.06)',
    sandColors: [
      { r: 240, g: 245, b: 255, a: 0.95 }, // still (low velocity) - crisp bright white-blue
      { r: 0,   g: 240, b: 255, a: 0.92 }, // low-mid - electric cyan
      { r: 0,   g: 255, b: 136, a: 0.95 }, // mid - laser green
      { r: 255, g: 183, b: 0,   a: 0.98 }, // mid-high - solar amber
      { r: 255, g: 0,   b: 127, a: 1.0  }, // high velocity - hot magenta
    ]
  },
  hyperdrive: {
    id: 'hyperdrive',
    name: 'Hyperdrive Neon',
    primaryHex: '#ff4500',
    secondaryHex: '#a3ff00',
    glowHex: 'rgba(255, 69, 0, 0.45)',
    plateColor: '#09070a',
    gridLineColor: 'rgba(255, 69, 0, 0.07)',
    sandColors: [
      { r: 255, g: 250, b: 240, a: 0.95 },
      { r: 163, g: 255, b: 0,   a: 0.92 }, // acid lime
      { r: 255, g: 230, b: 0,   a: 0.95 }, // neon yellow
      { r: 255, g: 69,  b: 0,   a: 0.98 }, // vivid flame
      { r: 255, g: 20,  b: 147, a: 1.0  }, // hot pink
    ]
  },
  phosphor: {
    id: 'phosphor',
    name: 'Phosphor Glow',
    primaryHex: '#00ffcc',
    secondaryHex: '#00ff66',
    glowHex: 'rgba(0, 255, 204, 0.4)',
    plateColor: '#060a08',
    gridLineColor: 'rgba(0, 255, 204, 0.06)',
    sandColors: [
      { r: 240, g: 255, b: 250, a: 0.95 },
      { r: 0,   g: 255, b: 204, a: 0.92 }, // phosphor cyan
      { r: 0,   g: 255, b: 102, a: 0.95 }, // neon emerald
      { r: 255, g: 215, b: 0,   a: 0.98 }, // bright gold
      { r: 255, g: 0,   b: 85,  a: 1.0  }, // crimson pulse
    ]
  },
  violet: {
    id: 'violet',
    name: 'Cosmic Violet',
    primaryHex: '#c084fc',
    secondaryHex: '#38bdf8',
    glowHex: 'rgba(192, 132, 252, 0.45)',
    plateColor: '#090710',
    gridLineColor: 'rgba(192, 132, 252, 0.07)',
    sandColors: [
      { r: 255, g: 255, b: 255, a: 0.95 },
      { r: 56,  g: 189, b: 248, a: 0.92 }, // sky azure
      { r: 192, g: 132, b: 252, a: 0.95 }, // electric violet
      { r: 244, g: 63,  b: 94,  a: 0.98 }, // fuchsia rose
      { r: 251, g: 191, b: 36,  a: 1.0  }, // radiant amber
    ]
  },
  acid: {
    id: 'acid',
    name: 'Acid Cyberpunk',
    primaryHex: '#e0ff00',
    secondaryHex: '#00f0ff',
    glowHex: 'rgba(224, 255, 0, 0.4)',
    plateColor: '#08080a',
    gridLineColor: 'rgba(224, 255, 0, 0.06)',
    sandColors: [
      { r: 255, g: 255, b: 255, a: 0.95 },
      { r: 224, g: 255, b: 0,   a: 0.92 }, // acid yellow
      { r: 0,   g: 240, b: 255, a: 0.95 }, // neon cyan
      { r: 255, g: 0,   b: 85,  a: 0.98 }, // sharp magenta
      { r: 123, g: 44,  b: 191, a: 1.0  }, // deep purple
    ]
  }
};

export const PALETTE_LIST = Object.values(PALETTES);

/**
 * Bilinearly interpolate between colors in palette based on normalized velocity t in [0, 1]
 */
export function samplePaletteColor(palette: Palette, t: number): { r: number; g: number; b: number; a: number } {
  const colors = palette.sandColors;
  const clampedT = Math.max(0, Math.min(1, t));
  const segment = clampedT * (colors.length - 1);
  const index = Math.floor(segment);
  const frac = segment - index;
  
  if (index >= colors.length - 1) {
    const c = colors[colors.length - 1];
    return { r: c.r, g: c.g, b: c.b, a: c.a ?? 1 };
  }
  
  const c0 = colors[index];
  const c1 = colors[index + 1];
  
  return {
    r: Math.round(c0.r + frac * (c1.r - c0.r)),
    g: Math.round(c0.g + frac * (c1.g - c0.g)),
    b: Math.round(c0.b + frac * (c1.b - c0.b)),
    a: (c0.a ?? 1) + frac * ((c1.a ?? 1) - (c0.a ?? 1))
  };
}
