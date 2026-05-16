# Cody Hsieh Portfolio

An interactive falling-sand portfolio for [codyhsieh.com](https://codyhsieh.com). Draw elements, watch them interact, tilt your phone to shift gravity, stamp photos into the world, and open Cody's resume from the simulation.

## Stack

- Plain JavaScript (no framework)
- HTML Canvas 2D rendering
- Webpack 5 for bundling
- No runtime dependencies beyond the browser

## Live Site & Deploy

- Live site: `https://codyhsieh.com`
- Custom domain: `CNAME`
- Browser tab title: `Cody Hsieh Portfolio`
- Favicon: `assets/favicon.svg`
- GitHub Pages deploys the production `dist` artifact from `.github/workflows/deploy-pages.yml`
- Webpack emits the browser bundle as `app.mobile-aspect.js`; `index.html` loads that file from the site root

## Architecture

```
bootstrap.js → index.js (main loop)
                 ├── simulation.js   Cellular automaton engine
                 ├── render.js       Canvas 2D pixel renderer
                 ├── ui.js           HUD overlay (canvas-drawn, not DOM)
                 ├── state.js        App state & element registry
                 └── photos.js       Photo stamp loading
```

The main loop runs via `requestAnimationFrame`. Each frame:
1. **Simulation** scans the grid bottom-to-top (alternating X direction) and updates each active cell
2. **Renderer** repaints only dirty pixels via `putImageData` with tight bounds
3. **HUD** draws the toolbar overlay on a separate canvas layer

### Key data structures

- `types[w*h]` — Uint8Array, element type per cell
- `data[w*h]` — Uint8Array, per-cell state (lifetime, fuel, direction, etc.)
- `marks[w*h]` — Uint32Array, frame token to avoid double-processing
- Active and dirty bounding boxes — tight rectangular regions for simulation and rendering work

## Elements & Physics

All movement is driven by a normalized gravity vector `(gx, gy)`. Candidate directions are scored by dot product against gravity; only directions exceeding a per-element threshold are used. Frame-based jitter (not randomness) breaks directional ties for organic motion.

### Sand

| Property | Value |
|----------|-------|
| Gravity threshold | 0.16 |
| Lifetime | Indefinite |

Falls along gravity. Displaces water, oil, and fire via cell swaps. Initial data seeded as `(x*9 + y*3) & 31` for tonal variation.

### Water

| Property | Value |
|----------|-------|
| Gravity threshold | 0.12 |
| Lateral pressure range | 20 cells |
| Lifetime | Indefinite |

Two-phase movement:
1. **Gravity phase** — falls and slides diagonally along gravity
2. **Pressure phase** — if water exists above, spreads horizontally up to 20 cells, searching for an empty cell to flow into

Extinguishes fire on contact. Lateral direction alternates L/R based on `(frame + position) & 1`.

### Stone

Static and immovable. Used for terrain, borders, and letter rendering. No update logic.

### Wood

Static structure. Every 4 frames, checks all 8 neighbors for fire. Ignites if fire is adjacent (`(frame + nx + ny) & 3 === 0`, ~25% chance per neighbor per check).

### Fire

| Property | Value |
|----------|-------|
| Lifetime | 0–255, decrements each frame |
| Initial life | `28 + ((x*7 + y*13) % 52)` |
| Spread chance | 25% per neighbor per frame |

Rises upward; if blocked, drifts horizontally. Ignites wood, oil, and photo pixels on contact. Instantly extinguished by adjacent water. Burns out when life reaches 0.

### Oil

| Property | Value |
|----------|-------|
| Gravity threshold | 0.12 |
| Lifetime | Indefinite |

Dark liquid that flows like water but without pressure spreading. Checks 6 neighbors for fire; ignites immediately on contact. Does not displace water.

### Firework

Three-phase lifecycle encoded in a single data byte:

**Rocket** (data >= 192):
- Fuel = `data - 192` (0–63)
- Ascends 1 cell every 3 frames
- Detonates when fuel runs out or near canvas top (y <= 8)

**Shell** (data >= 128):
- Timer = `data - 128` (0–31)
- Stationary countdown, decrements every other frame
- Detonates into secondary burst at timer = 0

**Spark** (data < 128):
- Encoding: `((directionIndex & 7) << 4) | (life & 15)`
- 8 spoke directions: `[0,-3], [2,-2], [3,0], [2,2], [0,3], [-2,2], [-3,0], [-2,-2]`
- Life: 4-bit (0–15), decay rate accelerates below life 10
- Ignites wood/oil/photo on contact

**Burst pattern:**
- Primary (from rocket): 8 spokes x 6 sparks (distances 1–6, life=15) + 3 secondary shells at distances 8, 16, 24
- Secondary (from shell): 8 spokes x 3 sparks (distances 1–3, life=13–15)

### Black Hole

| Property | Value |
|----------|-------|
| Effective radius | 44 cells |
| Core radius | 3 cells (distSq <= 9) |

Static singularity that consumes nearby matter with an orbital swirl effect.

- **Core**: Consumes matter every ~10 frames at a random cadence
- **Halo**: Particles orbit inward via tangent + radial vectors
- **Swirl bias**: Inner region (<28% radius) pulls inward 4:1; middle 2:1; outer equal
- **Movement sequence**: Try tangent, try tangent+inward, try inward (order alternates by frame)
- **Consumption cadence per offset**: `max(4, floor(6 + normalized^2 * 24))` — closer = faster
- **Bounded scan**: The singularity checks a fixed radius of 44 cells, so the cost stays capped per black hole.

### Photo

Static image pixels stamped onto the grid. Generated stamps preserve each source image's aspect ratio and store per-pixel colors in a separate `photoColors` array as 32-bit RGBA. They can be ignited by fire and fireworks. Resume pixels (data=251) are clickable.

### Erase

Drawing tool that sets cells to EMPTY. Not a simulated element.

## Rendering

1. **Sky** — procedural gradient (warm white → pale green) with sun glow at `(0.54w, 0.16h)` and hash-based grain noise
2. **Elements** — pre-computed color palettes: 10 species x 256 tones built at startup. Each species has a base RGB and a per-tone offset range for dithering
3. **Black hole halos** — empty pixels near black holes are tinted darker/purplish based on distance
4. **Firework colors** — dynamic per-frame: rockets are orange, shells cycle an 8-color palette, sparks transition orange → palette → white-hot

Only dirty pixels are repainted. The simulation tracks a dirty bounding box each frame.

## HUD & Controls

The HUD is drawn entirely on a second canvas (no DOM elements). Layout adapts between compact (<760px) and desktop modes.

**Toolbar sections:**
- **Dock** — tool selector, pause, scene buttons, photo controls
- **Tools** — 10 element buttons + 5 brush sizes (2, 4, 8, 12, 18 px)
- **World** — 4 preset scenes: Dunes, Fountain, Bonfire, Cascade
- **More** — Reseed, Clear, Photo stamp navigation

Buttons use multi-layer glow effects with pulsing animation for the selected state.

## Mobile Support

- **Tilt gravity**: DeviceMotion/DeviceOrientation sensors with permission request flow
  - Acceleration normalized by 9.80665 m/s^2
  - Screen rotation compensation (0/90/180/270 deg)
  - Dead zone: 0.055 magnitude, smoothing factor: 0.18
- **Touch**: pointer events with canvas capture for drag
- **Aspect-aware grid**: mobile uses a smaller minimum world size so photos and the resume keep their proportions instead of stretching
- **Default water**: the mobile Dunes start scene uses about 40% less water than desktop
- **Safe areas**: CSS env() insets for notched devices
- **Overscroll**: disabled on body and HUD

## Scenes

| Scene | Description |
|-------|-------------|
| Dunes | "CODY" text rendered in stone, sand piles (default) |
| Fountain | Elevated water source in center, sand on sides |
| Bonfire | Central wood/sand/fire structure with oil and fireworks |
| Cascade | Water at top, sand avalanches, oil pools below |

## Performance

- **Activity culling** — only cells in the active region are processed each frame
- **Dirty rendering** — `putImageData` clipped to changed bounds
- **Visit tokens** — 32-bit counter avoids clearing the marks array each frame
- **Pre-computed palettes** — 2560 colors built once at startup
- **Frame adaptation** — tick budget reduces when FPS drops below 56
- **DPR capping** — device pixel ratio limited to 1.5

## Generated Assets

`scripts/generate_photo_stamps.py` converts source images into `js/photoStamps.generated.js`. The generated stamp metadata includes width, height, and RGB pixel data so non-square assets render correctly in the sand grid.

## Commands

```bash
npm install
npm run dev      # Dev server with hot reload
npm run build    # Production build with source maps
npm test         # E2E coverage for fireworks, black holes, birds + build
```

## Algorithmic Analysis

Let **N = W x H** (total grid cells), **A** = active region area, **P** = particle count, **B** = number of black holes, and **D** = dirty region area.

### Simulation tick — `tick()`

| Phase | Complexity | Notes |
|-------|-----------|-------|
| Grid scan | O(A) | Only cells inside the active bounding box are visited |
| Visit check | O(1) per cell | Token comparison against `Uint32Array`, no clearing needed |
| Per-cell update | O(1) amortized | Most elements check a fixed neighbor set (6–8) |
| Water pressure flow | O(20) worst case | Linear scan up to 20 cells laterally, bounded constant |
| Black hole update | O(r^2) per hole | Bounded radius of 44 cells, about 6,000 checked positions |
| Black hole total | O(B x 6000) | Simulation cost scales with black holes; renderer halo checks are capped separately |
| Firework burst | O(72) | 8 spokes x 6 sparks + 8 x 3 shells = 72 cells written |
| Active region swap | O(1) | Next-frame region is a single bounding box, swapped by assignment |

**Overall tick**: O(A + B x 6000). When nothing moves, A shrinks to zero and the simulation skips entirely (`hasActiveRegion = false`). In the worst case (everything active, many black holes), A approaches N.

### Activity culling

The simulation maintains two bounding boxes — current frame and next frame — rather than per-cell activity flags. When a cell changes, it expands the next-frame box by a type-dependent radius:

| Element | Activity radius |
|---------|----------------|
| Black hole | 22 cells |
| Firework | 8 cells |
| Sand, Water, Oil, Fire | 2 cells |
| Everything else | 1 cell |

This means a single moving sand grain activates a 5x5 patch, not the full grid. When the simulation reaches equilibrium (no cell changes), `hasActiveRegion` becomes false and `tick()` returns in O(1).

### Visit token system

Instead of clearing the `marks[N]` array each frame (O(N)), the simulation increments a 32-bit `visitToken` counter. A cell is "visited this frame" when `marks[index] === visitToken`. The array is only bulk-cleared when the token wraps at 2^32 - 1, amortizing the cost to O(1) per frame over ~4 billion frames.

### Rendering — `render()`

| Phase | Complexity | Notes |
|-------|-----------|-------|
| Dirty region read | O(1) | Single bounding box consumed from simulation |
| Pixel loop | O(D) | Only dirty pixels are iterated |
| Black hole halo tint | O(D x min(B, 12)) | Each dirty pixel checks distance to up to 12 black hole regions |
| `putImageData` | O(D) | Clipped to dirty bounds via the 4-argument overload |
| Sky generation | O(N) | Built once on resize, not per frame |
| Color table lookup | O(1) per pixel | Pre-built `Uint32Array[256]` per species, direct index |

**Overall render**: O(D x B) per frame. When nothing changes, D = 0 and rendering is skipped entirely.

### Memory layout

| Array | Type | Size | Purpose |
|-------|------|------|---------|
| `types` | Uint8Array | N bytes | Species ID per cell |
| `data` | Uint8Array | N bytes | Per-cell state (life, fuel, direction) |
| `marks` | Uint32Array | 4N bytes | Visit token per cell |
| `photoColors` | Uint32Array | 4N bytes | RGBA for photo pixels |
| `locked` | Uint8Array | N bytes | Immovable flag |
| `output32` | Uint32Array | 4N bytes | Render output buffer |
| `sky32` | Uint32Array | 4N bytes | Pre-built sky gradient |
| Color tables | Uint32Array | 10 x 256 x 4 bytes | 10 KB total, negligible |

**Total**: ~18N bytes + 10 KB. At a typical 300x200 grid (60,000 cells), this is ~1.08 MB.

### Gravity direction computation — `gravityStepDirections()`

Runs per moving cell per frame. Scores 8 candidate directions by dot product against the gravity vector, filters by threshold, sorts descending. Sorting 8 elements is effectively O(1) (bounded constant). The result is not cached — recomputed per cell to incorporate position-dependent jitter that breaks directional bias.

### Scan order correctness

The Y-scan direction flips with gravity: bottom-to-top when gravity points down, top-to-bottom when inverted. X-scan alternates every frame. This prevents systematic bias where particles on one side consistently "win" cell moves, producing even flow without randomness.

### Asymptotic summary

| Operation | Best case | Typical | Worst case |
|-----------|-----------|---------|------------|
| Simulation tick | O(1) | O(A) | O(N + B x 6000) |
| Render frame | O(1) | O(D) | O(N x B) |
| Full frame | O(1) | O(A + D) | O(N x B) |
| Memory | 18N bytes | 18N bytes | 18N bytes |

The simulation is designed to degrade gracefully: an idle screen costs nothing, a few falling grains cost proportional to their local neighborhood, and only a screen full of active black holes approaches worst-case bounds.

## Design

The design doc lives at [docs/sand-game-design.md](docs/sand-game-design.md).
