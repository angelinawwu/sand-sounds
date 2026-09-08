import { WaveField } from './src/sim/waveField.ts';
import { ParticleSystem } from './src/sim/particles.ts';
import { PALETTES, samplePaletteColor } from './src/render/palettes.ts';

console.log('--- Starting Physics & Cymatics Test Suite ---');

// 1. Initialize Wave Field
const wave = new WaveField({
  width: 220,
  height: 220,
  waveSpeed: 0.54,
  damping: 0.9982
});

console.log(`[PASS] WaveField created: ${wave.width}x${wave.height}, size=${wave.size}`);

// 2. Inject Tap Impulse
wave.injectImpulse(110, 110, 2.5, 7.0);
console.log(`[PASS] Injected impulse at center (110, 110). Center height: ${wave.h[110 * 220 + 110]}`);

// 3. Step simulation for 300 frames
let maxRecordedEnergy = 0;
for (let step = 0; step < 300; step++) {
  wave.step();
  if (wave.totalEnergy > maxRecordedEnergy) maxRecordedEnergy = wave.totalEnergy;
  
  if (isNaN(wave.totalEnergy) || !isFinite(wave.totalEnergy)) {
    throw new Error(`Simulation diverged to NaN/Infinity at step ${step}!`);
  }
}
console.log(`[PASS] 300 FDTD simulation steps completed. Max Energy: ${maxRecordedEnergy.toFixed(4)}, Final Energy: ${wave.totalEnergy.toFixed(4)}`);

// 4. Test Drag Injection
wave.injectDrag(50, 50, 150, 150, 1.2);
console.log(`[PASS] Injected continuous drag segment.`);
for (let step = 0; step < 100; step++) {
  wave.step();
  if (isNaN(wave.totalEnergy) || !isFinite(wave.totalEnergy)) {
    throw new Error(`Simulation diverged after drag at step ${step}!`);
  }
}
console.log(`[PASS] Post-drag 100 steps completed cleanly.`);

// 5. Test Cymatics Continuous Mode
wave.cymaticActive = true;
wave.cymaticModeM = 2;
wave.cymaticModeN = 2;
wave.cymaticFreq = 0.18;
for (let step = 0; step < 200; step++) {
  wave.step();
  if (isNaN(wave.totalEnergy) || !isFinite(wave.totalEnergy)) {
    throw new Error(`Cymatics mode diverged at step ${step}!`);
  }
}
console.log(`[PASS] Cymatics harmonic standing mode (2,2) ran 200 steps successfully.`);

// 6. Test Particle System
const particles = new ParticleSystem(8000, {
  jitterStrength: 0.08,
  descentRate: 1.5,
  friction: 0.88,
  maxSpeed: 1.8
});
console.log(`[PASS] ParticleSystem initialized with ${particles.count} sand grains.`);

for (let step = 0; step < 150; step++) {
  particles.update(wave);
  if (isNaN(particles.posX[0]) || isNaN(particles.posY[0])) {
    throw new Error(`Particle position became NaN at step ${step}!`);
  }
}
console.log(`[PASS] 150 particle descent iterations completed without errors.`);

// 7. Test Color Sampling
const color = samplePaletteColor(PALETTES.electric, 0.5);
console.log(`[PASS] Sampled palette color at t=0.5: rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`);

console.log('--- ALL SIMULATION & CYMATICS TESTS PASSED! ---');
