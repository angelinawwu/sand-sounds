# Build Spec: Reverberation (working title)

## Concept
A 2D sand-on-speaker surface. Every small action a viewer takes — a tap or a drag — sends an impulse into a shared wave field. Waves reflect off the edges of the plate and keep echoing, so no action stays isolated: it keeps colliding and interfering with everything that comes after it. Sand settles along the nodal lines of the *current, ever-shifting* field, so the pattern is a live composite of every input so far. There is no reset and no "correcting" a past action — the piece is meant to get more visually rich as more small actions accumulate, not more broken.

## 1. Core simulation — the wave field
A 2D scalar wave equation solved on a grid (finite-difference time-domain / "ripple tank" method).

- **Grid:** height field `h[x][y]`, plus previous-frame field `h_prev[x][y]`, at a resolution independent of screen size (e.g. 200×200 sim cells, upscaled visually to fill the canvas).
- **Update rule per frame**, for each interior cell:
  ```
  laplacian = h[x+1][y] + h[x-1][y] + h[x][y+1] + h[x][y-1] - 4*h[x][y]
  h_new[x][y] = damping * (2*h[x][y] - h_prev[x][y] + c^2 * laplacian)
  ```
  where `c` is wave speed and `damping` (~0.995–0.999) causes slow energy loss so the plate doesn't ring forever, but does *not* erase texture quickly — reverberation should be felt for several seconds.
- **Boundary condition:** reflecting edges (Neumann-style — edge cells mirror their neighbor), so waves bounce back into the plate rather than absorbing at the border. This is what makes reverberation literal.
- **Velocity field:** derive `v[x][y] = h[x][y] - h_prev[x][y]` each frame — this drives the sand behavior (see §3), not the raw height.

## 2. Interaction model — two input types, one shared field

**Tap (discrete):**
- On click/tap at `(x, y)`, add a smooth radial Gaussian impulse to `h` centered there: `h[x][y] += amplitude * gaussian(distance, radius)`.
- One-shot, fixed energy budget per tap.

**Drag (continuous):**
- While the pointer is down and moving, inject a smaller impulse *every frame* at the current pointer position, scaled down so a full drag doesn't dump vastly more total energy than a tap (otherwise dragging trivially dominates the piece).
- Optionally scale injected amplitude by pointer speed, so a slow drag "bows" the plate gently and a fast drag "strikes" it more sharply — gives the two input types a continuum rather than a hard split.

Both input types share the exact same field — there's no separate "tap layer" and "drag layer." That's what guarantees compounding: every new action's ripples travel through and interact with whatever is already there.

## 3. Particle system — the sand
- A fixed population of particles (e.g. 3,000–8,000 for a 200×200 grid), each with a position in the same coordinate space as the sim grid.
- Each frame, per particle:
  1. Sample local velocity magnitude `|v[x][y]|` (and optionally its gradient) at the particle's position.
  2. Move the particle a small step *down the velocity-magnitude gradient* — i.e., away from areas that are moving a lot right now, toward areas that are momentarily still. Add a small random jitter so particles don't perfectly freeze (real Chladni sand has some looseness).
  3. Clamp particle motion speed so the pattern reorganizes visibly but doesn't teleport.
- Render particles as small dots or short-lived trail segments. This — not the height field itself — is the primary visual. The wave field is the invisible physics; the sand is the picture.

## 4. Visual style
- Dark or neutral plate background; bright, high-contrast sand (single warm/cool tone, or the fragment-color palette you've used elsewhere if you want continuity across the project — magenta/cyan/orange/white/green would also work as per-particle color-by-velocity coding).
- No UI chrome, no score, no labels. The plate is the whole screen.
- Optional: a very subtle, slow ambient impulse (like a faint heartbeat) if the plate is otherwise idle for a while, so the piece isn't a dead flat surface before anyone interacts with it — worth prototyping with and without to see which feels right.

## 5. Accumulation & state
- No reset button, no "undo," no session boundary that clears the field. If the piece runs indefinitely, cap total accumulated energy softly via the damping rate rather than a hard clear, so the *long-run* pattern stabilizes into complexity rather than diverging to noise or dying out to flatness.
- If this needs to persist across a page reload (e.g. shared/public installation), the height field itself doesn't need to be saved — a live shared session (if multiplayer) or just per-visit state (if solo) are both reasonable; decide based on whether you want it to feel like *one continuous plate everyone contributes to* or *a fresh plate per visitor*.

## 6. Performance notes
- 200×200 grid FDTD + a few thousand particles is comfortably real-time on Canvas2D at 60fps for prototyping; if you want a larger grid or a public installation, port the FDTD step to a WebGL fragment shader (ping-pong between two textures for `h` and `h_prev`) and keep particles on the CPU or move them to a GPU compute pass later.
- Sample the velocity field for particles via nearest-cell or bilinear lookup — bilinear will look noticeably smoother for cheap.

## 7. Suggested build order
1. **Wave field only**, rendered directly as grayscale height (no particles yet) — confirms the FDTD step, damping, and reflecting boundaries feel right, and that a single tap visibly reverberates for several seconds.
2. **Add particles** on top, tuned against the working wave field — this is where the "sand-on-speaker" feeling either clicks or doesn't; expect to spend the most iteration time here.
3. **Add drag as continuous injection**, tuned so it doesn't overpower taps.
4. **Style pass** — color, particle rendering, background, idle behavior.
5. **Tuning pass** — damping rate, impulse amplitude, particle jitter/speed — these four numbers are what separate "chaotic mud" from "gorgeous compounding pattern," so budget real time for this rather than treating it as a final polish step.

## Open parameters to tune by feel (not fixed here)
- Wave speed `c` and damping rate
- Tap vs. drag relative energy
- Particle count, jitter amount, max particle speed
- Grid resolution vs. visual upscale factor
