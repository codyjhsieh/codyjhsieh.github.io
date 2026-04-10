import { SPECIES } from "./simulation";

function packColor(r, g, b, a = 255) {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

function clamp(value) {
  return value < 0 ? 0 : value > 255 ? 255 : value;
}

function mixChannel(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function noise2d(x, y) {
  let value = Math.imul(x ^ 0x2c1b3c6d, 0x297a2d39) ^ Math.imul(y ^ 0x165667b1, 0x85ebca6b);
  value ^= value >>> 15;
  value = Math.imul(value, 0x27d4eb2d);
  value ^= value >>> 13;
  return value & 255;
}

function buildSky(width, height) {
  const sky = new Uint32Array(width * height);
  const top = [255, 253, 248];
  const horizon = [243, 247, 242];
  const lower = [221, 233, 232];
  const sun = [255, 250, 236];
  const sunX = width * 0.54;
  const sunY = height * 0.16;
  const sunRadius = Math.max(width, height) * 0.42;

  for (let y = 0; y < height; y += 1) {
    const vertical = height <= 1 ? 0 : y / (height - 1);
    const baseT = Math.min(1, vertical * 1.28);
    const base = vertical < 0.68
      ? [
          mixChannel(top[0], horizon[0], baseT),
          mixChannel(top[1], horizon[1], baseT),
          mixChannel(top[2], horizon[2], baseT),
        ]
      : [
          mixChannel(horizon[0], lower[0], (vertical - 0.68) / 0.32),
          mixChannel(horizon[1], lower[1], (vertical - 0.68) / 0.32),
          mixChannel(horizon[2], lower[2], (vertical - 0.68) / 0.32),
        ];

    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      const dx = x - sunX;
      const dy = y - sunY;
      const glow = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / sunRadius);
      const grain = (noise2d(x >> 1, y >> 1) - 128) * 0.012;
      const t = Math.min(0.22, glow * 0.18 + grain);
      sky[row + x] = packColor(
        clamp(mixChannel(base[0], sun[0], t)),
        clamp(mixChannel(base[1], sun[1], t)),
        clamp(mixChannel(base[2], sun[2], t)),
      );
    }
  }

  return sky;
}

function buildTables() {
  const base = Array.from({ length: 10 }, () => new Uint32Array(256));

  const colors = {
    [SPECIES.EMPTY]: [218, 212, 201],
    [SPECIES.SAND]: [195, 168, 121],
    [SPECIES.WATER]: [102, 127, 148],
    [SPECIES.STONE]: [122, 116, 113],
    [SPECIES.WOOD]: [123, 96, 69],
    [SPECIES.FIRE]: [232, 116, 58],
    [SPECIES.OIL]: [60, 63, 72],
    [SPECIES.PHOTO]: [176, 165, 151],
    [SPECIES.FIREWORK]: [238, 188, 110],
    [SPECIES.BLACK_HOLE]: [4, 5, 8],
  };

  for (const [speciesKey, color] of Object.entries(colors)) {
    const species = Number(speciesKey);
    for (let tone = 0; tone < 256; tone += 1) {
      const pulse =
        species === SPECIES.FIRE ? Math.min(78, tone >> 1) :
        species === SPECIES.FIREWORK ? Math.min(68, ((tone * 5) & 127) >> 1) :
        species === SPECIES.BLACK_HOLE ? -Math.min(12, tone & 15) :
        species === SPECIES.WATER ? ((tone % 18) - 8) :
        species === SPECIES.OIL ? ((tone % 9) - 4) :
        species === SPECIES.PHOTO ? ((tone - 128) * 0.4) :
        species === SPECIES.SAND ? ((tone % 12) - 5) :
        species === SPECIES.STONE ? ((tone % 8) - 3) :
        species === SPECIES.WOOD ? ((tone % 10) - 4) :
        0;

      let r = color[0];
      let g = color[1];
      let b = color[2];

      if (species === SPECIES.WATER) {
        r = clamp(r + pulse - 4);
        g = clamp(g + pulse);
        b = clamp(b + pulse + 8);
      } else if (species === SPECIES.SAND) {
        r = clamp(r + pulse + 4);
        g = clamp(g + pulse + 1);
        b = clamp(b + pulse - 6);
      } else if (species === SPECIES.STONE) {
        r = clamp(r + pulse);
        g = clamp(g + pulse - 1);
        b = clamp(b + pulse + 2);
      } else if (species === SPECIES.WOOD) {
        r = clamp(r + pulse + 2);
        g = clamp(g + pulse - 2);
        b = clamp(b + pulse - 5);
      } else if (species === SPECIES.FIRE) {
        r = clamp(r + pulse + 12);
        g = clamp(g + Math.floor(pulse * 0.25));
        b = clamp(b - Math.floor(pulse * 0.4));
      } else if (species === SPECIES.FIREWORK) {
        r = clamp(r + pulse + 6);
        g = clamp(g + Math.floor(pulse * 0.2));
        b = clamp(b - Math.floor(pulse * 0.32));
      } else if (species === SPECIES.OIL) {
        r = clamp(r + pulse - 2);
        g = clamp(g + pulse);
        b = clamp(b + pulse + 4);
      } else if (species === SPECIES.BLACK_HOLE) {
        r = clamp(r + Math.floor(pulse * 0.25));
        g = clamp(g + Math.floor(pulse * 0.25));
        b = clamp(b + Math.floor(pulse * 0.4));
      } else {
        r = clamp(r + pulse);
        g = clamp(g + pulse);
        b = clamp(b + pulse);
      }

      base[species][tone] = packColor(r, g, b, 255);
    }
  }

  return { base };
}

const TABLES = buildTables();
const BLACK_HOLE_HALO_RADIUS = 44;
const BLACK_HOLE_HALO_RADIUS_SQ = BLACK_HOLE_HALO_RADIUS * BLACK_HOLE_HALO_RADIUS;
const FIREWORK_ROCKET_BASE = 192;
const FIREWORK_SHELL_BASE = 128;
const FIREWORK_ORANGE = [238, 188, 110];
const FIREWORK_PALETTE = [
  [255, 240, 72],
  [0, 210, 255],
  [255, 46, 166],
  [45, 255, 86],
  [255, 80, 34],
  [154, 84, 255],
  [255, 255, 255],
  [0, 255, 214],
];

function tintToward(packed, tintR, tintG, tintB, strength) {
  const r = packed & 255;
  const g = (packed >>> 8) & 255;
  const b = (packed >>> 16) & 255;
  return packColor(
    clamp(mixChannel(r, tintR, strength)),
    clamp(mixChannel(g, tintG, strength)),
    clamp(mixChannel(b, tintB, strength)),
  );
}

function fireworkColor(state, frame) {
  let base = FIREWORK_ORANGE;
  let life = 15;
  let intensity = 1.18;

  if (state >= FIREWORK_ROCKET_BASE) {
    base = FIREWORK_ORANGE;
    intensity = 1.22;
  } else if (state >= FIREWORK_SHELL_BASE) {
    const timer = state - FIREWORK_SHELL_BASE;
    base = FIREWORK_PALETTE[(timer + (timer >> 2)) & 7];
    intensity = 1.08 + (((frame + timer) & 3) * 0.05);
  } else {
    const directionIndex = (state >> 4) & 7;
    life = state & 15;
    base = life > 9 ? FIREWORK_ORANGE : FIREWORK_PALETTE[(directionIndex + 2 + (life <= 5 ? 3 : 0)) & 7];
    intensity = 0.82 + (life / 15) * 0.42;
  }

  const shimmer = (((frame + state * 3) & 7) - 3) * 9;
  const whiteHot = state >= FIREWORK_ROCKET_BASE || life > 11 ? 0.2 : life > 7 ? 0.08 : 0;
  return packColor(
    clamp(mixChannel(base[0] * intensity + shimmer, 255, whiteHot)),
    clamp(mixChannel(base[1] * intensity + shimmer, 248, whiteHot)),
    clamp(mixChannel(base[2] * intensity + shimmer, 218, whiteHot)),
  );
}

class CanvasRenderer {
  constructor({ canvas, simulation }) {
    this.canvas = canvas;
    this.simulation = simulation;
    this.ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
    this.resize();
  }

  resize() {
    this.imageData = this.ctx.createImageData(this.simulation.width, this.simulation.height);
    this.output32 = new Uint32Array(this.imageData.data.buffer);
    this.sky32 = buildSky(this.simulation.width, this.simulation.height);
    this.canvas.width = this.simulation.width;
    this.canvas.height = this.simulation.height;
  }

  render() {
    const dirty = this.simulation.consumeDirtyRegion();
    if (!dirty) {
      return;
    }

    const { types, data, photoColors, width, frame } = this.simulation;
    const output = this.output32;
    const stoneBase = TABLES.base[SPECIES.STONE][0];
    const sky = this.sky32;
    const blackHoles = [];
    const minX = dirty.minX;
    const minY = dirty.minY;
    const maxX = dirty.maxX;
    const maxY = dirty.maxY;

    for (const idx of this.simulation.blackHoleIndices) {
      if (blackHoles.length >= 12) break;
      blackHoles.push({ x: idx % width, y: (idx / width) | 0 });
    }

    for (let y = minY; y <= maxY; y += 1) {
      let index = y * width + minX;
      for (let x = minX; x <= maxX; x += 1, index += 1) {
        const species = types[index];
        const tone = (data[index] + frame) & 255;

        if (species === SPECIES.EMPTY) {
          let emptyColor = sky[index];
          for (let i = 0; i < blackHoles.length; i += 1) {
            const dx = x - blackHoles[i].x;
            const dy = y - blackHoles[i].y;
            const distSq = dx * dx + dy * dy;
            if (distSq <= 5) {
              emptyColor = tintToward(emptyColor, 8, 9, 14, 0.86);
              break;
            }
            if (distSq <= 13) {
              emptyColor = tintToward(emptyColor, 74, 60, 88, 0.32);
              break;
            }
            if (distSq >= BLACK_HOLE_HALO_RADIUS_SQ) {
              continue;
            }
            const falloff = (BLACK_HOLE_HALO_RADIUS_SQ - distSq) / BLACK_HOLE_HALO_RADIUS_SQ;
            const strength = Math.min(0.08, falloff * falloff * 0.08);
            emptyColor = tintToward(emptyColor, 220, 214, 228, strength);
            break;
          }
          output[index] = emptyColor;
          continue;
        }

        if (species === SPECIES.PHOTO) {
          output[index] = photoColors[index] || stoneBase;
          continue;
        }

        if (species === SPECIES.FIREWORK) {
          output[index] = fireworkColor(data[index], frame);
          continue;
        }

        output[index] = TABLES.base[species][tone];
      }
    }

    this.ctx.putImageData(
      this.imageData,
      0,
      0,
      minX,
      minY,
      maxX - minX + 1,
      maxY - minY + 1,
    );
  }
}

export { CanvasRenderer };
