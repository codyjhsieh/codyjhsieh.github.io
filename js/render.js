import { SPECIES } from "./simulation.js";

const RESUME_PHOTO_DATA = 251;

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
const BIRD_SPRITE_WIDTH = 9;
const BIRD_SUCK_RADIUS = 58;
const BIRD_SUCK_RADIUS_SQ = BIRD_SUCK_RADIUS * BIRD_SUCK_RADIUS;
const BIRD_EVENT_HORIZON_SQ = 7 * 7;
const BIRD_RESPAWN_FRAMES = 84;
const BIRD_FRAGMENT_BASE_PULL = 1.4;
const BIRD_BODY = 0;
const BIRD_WING = 1;
const BIRD_HEAD = 2;
const BIRD_BELLY = 3;
const BIRD_BEAK = 4;
const BIRD_PALETTES = [
  [
    packColor(122, 98, 78, 255),
    packColor(88, 68, 54, 255),
    packColor(68, 55, 46, 255),
    packColor(214, 201, 184, 255),
    packColor(194, 149, 85, 255),
  ],
  [
    packColor(138, 136, 130, 255),
    packColor(94, 96, 100, 255),
    packColor(58, 61, 67, 255),
    packColor(226, 224, 216, 255),
    packColor(198, 156, 92, 255),
  ],
  [
    packColor(142, 118, 92, 255),
    packColor(110, 86, 62, 255),
    packColor(82, 67, 53, 255),
    packColor(225, 214, 196, 255),
    packColor(205, 154, 78, 255),
  ],
  [
    packColor(112, 120, 132, 255),
    packColor(79, 87, 97, 255),
    packColor(49, 56, 66, 255),
    packColor(212, 216, 220, 255),
    packColor(184, 143, 86, 255),
  ],
  [
    packColor(154, 132, 104, 255),
    packColor(118, 95, 70, 255),
    packColor(86, 68, 51, 255),
    packColor(229, 218, 197, 255),
    packColor(210, 162, 88, 255),
  ],
];
const BIRD_CONFIGS = [
  { y: 0.11, speed: 0.17, offset: 0, bob: 0, scale: 1, palette: 0 },
  { y: 0.16, speed: 0.12, offset: 39, bob: 4, scale: 0.9, palette: 1 },
  { y: 0.2, speed: 0.14, offset: 81, bob: 7, scale: 0.78, palette: 2 },
  { y: 0.27, speed: 0.09, offset: 126, bob: 11, scale: 0.86, palette: 3 },
  { y: 0.33, speed: 0.11, offset: 173, bob: 15, scale: 0.72, palette: 4 },
];
const BIRD_POSES = [
  [
    [0, 2, BIRD_WING], [1, 1, BIRD_WING], [2, 0, BIRD_WING], [3, 0, BIRD_WING], [4, 1, BIRD_WING],
    [3, 2, BIRD_BODY], [4, 2, BIRD_BODY], [5, 2, BIRD_BODY], [6, 2, BIRD_HEAD], [7, 1, BIRD_HEAD],
    [8, 1, BIRD_BEAK], [2, 3, BIRD_BELLY], [1, 4, BIRD_BELLY], [7, 0, BIRD_HEAD], [8, 0, BIRD_HEAD],
  ],
  [
    [0, 2, BIRD_WING], [1, 1, BIRD_WING], [2, 1, BIRD_WING], [3, 1, BIRD_WING], [4, 2, BIRD_WING],
    [3, 2, BIRD_BODY], [4, 2, BIRD_BODY], [5, 2, BIRD_BODY], [6, 2, BIRD_HEAD], [7, 1, BIRD_HEAD],
    [8, 1, BIRD_BEAK], [2, 3, BIRD_BELLY], [1, 4, BIRD_BELLY], [7, 1, BIRD_HEAD], [8, 1, BIRD_HEAD],
  ],
  [
    [0, 2, BIRD_WING], [1, 3, BIRD_WING], [2, 4, BIRD_WING], [3, 4, BIRD_WING], [4, 3, BIRD_WING],
    [3, 2, BIRD_BODY], [4, 2, BIRD_BODY], [5, 2, BIRD_BODY], [6, 2, BIRD_HEAD], [7, 1, BIRD_HEAD],
    [8, 1, BIRD_BEAK], [2, 3, BIRD_BELLY], [1, 4, BIRD_BELLY], [7, 3, BIRD_HEAD], [8, 4, BIRD_HEAD],
  ],
];
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
const BLACK_HOLE_NEIGHBORS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0],           [1, 0],
  [-1, 1],  [0, 1],  [1, 1],
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

function blendPacked(basePacked, overlayPacked, opacity) {
  if (opacity <= 0) {
    return basePacked;
  }
  if (opacity >= 1) {
    return overlayPacked;
  }

  const baseR = basePacked & 255;
  const baseG = (basePacked >>> 8) & 255;
  const baseB = (basePacked >>> 16) & 255;
  const overlayR = overlayPacked & 255;
  const overlayG = (overlayPacked >>> 8) & 255;
  const overlayB = (overlayPacked >>> 16) & 255;
  return packColor(
    clamp(mixChannel(baseR, overlayR, opacity)),
    clamp(mixChannel(baseG, overlayG, opacity)),
    clamp(mixChannel(baseB, overlayB, opacity)),
    255,
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
    base = life > 6 ? FIREWORK_ORANGE : FIREWORK_PALETTE[(directionIndex + 2 + (life <= 3 ? 3 : 0)) & 7];
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

function stampDecorativePhotos(output, width, height, decorativePhotos, simulation, photoColors) {
  const hiddenPhotoIndices = new Set();
  for (let i = 0; i < decorativePhotos.length; i += 1) {
    const decorative = decorativePhotos[i];
    if (!decorative || decorative.opacity <= 0) {
      continue;
    }
    if (decorative.liveCells && decorative.cells?.length) {
      for (let j = 0; j < decorative.cells.length; j += 1) {
        const { index } = decorative.cells[j];
        if (
          index < 0 ||
          index >= output.length ||
          simulation.types[index] !== SPECIES.PHOTO ||
          photoColors[index] === 0
        ) {
          continue;
        }
        output[index] = blendPacked(output[index], photoColors[index], decorative.opacity);
        if (decorative.opacity < 0.999) {
          hiddenPhotoIndices.add(index);
        }
      }
      continue;
    }
    if (!decorative.photoStamp) {
      continue;
    }
    const { stamp } = decorative.photoStamp;
    const stampWidth = stamp.width ?? stamp.size;
    const stampHeight = stamp.height ?? stamp.size;
    const halfW = Math.floor(stampWidth / 2);
    const halfH = Math.floor(stampHeight / 2);

    if (stamp.colors) {
      for (let sy = 0; sy < stampHeight; sy += 1) {
        const y = decorative.y + sy - halfH;
        if (y < 0 || y >= height) {
          continue;
        }
        for (let sx = 0; sx < stampWidth; sx += 1) {
          const color = stamp.colors[sx + sy * stampWidth];
          if (!color) {
            continue;
          }
          const x = decorative.x + sx - halfW;
          if (x < 0 || x >= width) {
            continue;
          }
          const index = y * width + x;
          output[index] = blendPacked(output[index], color, decorative.opacity);
        }
      }
      continue;
    }

    for (let p = 0; p < stamp.pixels.length; p += 1) {
      const pixel = stamp.pixels[p];
      const x = decorative.x + pixel.x - halfW;
      const y = decorative.y + pixel.y - halfH;
      if (x < 0 || x >= width || y < 0 || y >= height) {
        continue;
      }
      const index = y * width + x;
      output[index] = blendPacked(output[index], pixel.color, decorative.opacity);
    }
  }
  return hiddenPhotoIndices;
}

function stampResumePixels(output, simulation, photoColors) {
  const { size } = simulation;
  for (let index = 0; index < size; index += 1) {
    if (
      simulation.types[index] !== SPECIES.PHOTO ||
      simulation.data[index] !== RESUME_PHOTO_DATA ||
      photoColors[index] === 0
    ) {
      continue;
    }
    output[index] = photoColors[index];
  }
}

function collectBlackHoles(blackHoleIndices, width, height) {
  const remaining = new Set(blackHoleIndices);
  const holes = [];

  while (remaining.size > 0) {
    const start = remaining.values().next().value;
    remaining.delete(start);
    const queue = [start];
    const cells = [];
    let sumX = 0;
    let sumY = 0;

    while (queue.length > 0) {
      const index = queue.pop();
      cells.push(index);
      const x = index % width;
      const y = (index / width) | 0;
      sumX += x;
      sumY += y;

      for (let i = 0; i < BLACK_HOLE_NEIGHBORS.length; i += 1) {
        const nx = x + BLACK_HOLE_NEIGHBORS[i][0];
        const ny = y + BLACK_HOLE_NEIGHBORS[i][1];
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
          continue;
        }
        const neighborIndex = ny * width + nx;
        if (!remaining.has(neighborIndex)) {
          continue;
        }
        remaining.delete(neighborIndex);
        queue.push(neighborIndex);
      }
    }

    const centerX = sumX / cells.length;
    const centerY = sumY / cells.length;
    let radiusSq = 0;
    for (let i = 0; i < cells.length; i += 1) {
      const index = cells[i];
      const x = index % width;
      const y = (index / width) | 0;
      const dx = x - centerX;
      const dy = y - centerY;
      const distSq = dx * dx + dy * dy;
      if (distSq > radiusSq) {
        radiusSq = distSq;
      }
    }

    holes.push({
      x: centerX,
      y: centerY,
      radius: Math.sqrt(radiusSq) + 1.5,
      radiusSq,
      count: cells.length,
    });
  }

  return holes;
}

function birdSpriteWidth(bird) {
  return Math.max(1, Math.ceil(BIRD_SPRITE_WIDTH * (bird.scale ?? 1)));
}

function birdBaseY(bird, height, flapFrame) {
  const scale = bird.scale ?? 1;
  return Math.floor(height * bird.y) + Math.round(Math.sin((flapFrame + bird.bob) * 0.08) * 1.5 * scale);
}

function resetBirdState(state, bird, width, height, frame, respawned = false) {
  const spriteWidth = birdSpriteWidth(bird);
  const travel = width + spriteWidth + 12;
  const flapFrame = frame * 0.45;
  const progress = (((respawned ? frame * bird.speed : bird.offset) + bird.offset) % travel + travel) % travel;
  state.x = respawned ? -spriteWidth - ((bird.offset + frame) % 18) : progress - spriteWidth;
  state.y = birdBaseY(bird, height, flapFrame);
  state.vx = bird.speed;
  state.vy = 0;
  state.captured = false;
  state.respawn = 0;
  state.capturePoseIndex = 0;
  state.fragments = [];
  state.burning = false;
  state.burnSource = null;
}

function createBirdStates(width, height, frame = 0) {
  return BIRD_CONFIGS.map((bird) => {
    const state = {
      x: 0,
      y: 0,
      vx: bird.speed,
      vy: 0,
      captured: false,
      respawn: 0,
      swirl: (bird.offset & 1) === 0 ? 1 : -1,
      capturePoseIndex: 0,
      fragments: [],
      burning: false,
      burnSource: null,
    };
    resetBirdState(state, bird, width, height, frame, false);
    return state;
  });
}

function createBirdFragments(state, bird, frame) {
  const scale = bird.scale ?? 1;
  const poseIndex = Math.floor((frame * 0.45 + bird.bob) / 6) % BIRD_POSES.length;
  const pose = BIRD_POSES[poseIndex];
  const palette = BIRD_PALETTES[bird.palette ?? 0];
  const stampScale = Math.max(1, Math.round(scale));
  state.capturePoseIndex = poseIndex;
  state.fragments = pose.map(([dx, dy, colorRole], index) => ({
    index,
    anchorDx: Math.round(dx * scale),
    anchorDy: Math.round(dy * scale),
    color: palette[colorRole] ?? palette[BIRD_BODY],
    stampScale,
    detached: false,
    consumed: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
  }));
}

function birdCenterFromState(state, bird) {
  const scale = bird.scale ?? 1;
  const spriteWidth = birdSpriteWidth(bird);
  if (!state.captured || state.fragments.length === 0) {
    return {
      x: state.x + spriteWidth * 0.5,
      y: state.y + 2.5 * scale,
    };
  }

  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (let i = 0; i < state.fragments.length; i += 1) {
    const fragment = state.fragments[i];
    if (fragment.consumed) {
      continue;
    }
    if (fragment.detached) {
      sumX += fragment.x;
      sumY += fragment.y;
    } else {
      sumX += state.x + fragment.anchorDx;
      sumY += state.y + fragment.anchorDy;
    }
    count += 1;
  }

  if (count === 0) {
    return {
      x: state.x + spriteWidth * 0.5,
      y: state.y + 2.5 * scale,
    };
  }

  return { x: sumX / count, y: sumY / count };
}

function distanceToBlackHole(x, y, hole) {
  const dx = hole.x - x;
  const dy = hole.y - y;
  const rawDistSq = dx * dx + dy * dy;
  const rawDist = Math.sqrt(Math.max(rawDistSq, 0.001));
  const edgeDist = Math.max(0, rawDist - hole.radius);
  return {
    dx,
    dy,
    rawDistSq,
    rawDist,
    edgeDist,
    edgeDistSq: edgeDist * edgeDist,
  };
}

function findNearestBlackHole(x, y, blackHoles) {
  let nearestHole = null;
  let nearestEdgeDistSq = Infinity;
  for (let holeIndex = 0; holeIndex < blackHoles.length; holeIndex += 1) {
    const hole = blackHoles[holeIndex];
    const distance = distanceToBlackHole(x, y, hole);
    if (distance.edgeDistSq < nearestEdgeDistSq) {
      nearestEdgeDistSq = distance.edgeDistSq;
      nearestHole = hole;
    }
  }
  return { nearestHole, nearestEdgeDistSq };
}

function findNearestFirework(x, y, fireworks) {
  let nearestFirework = null;
  let nearestDistSq = Infinity;
  for (let i = 0; i < fireworks.length; i += 1) {
    const firework = fireworks[i];
    const dx = firework.x - x;
    const dy = firework.y - y;
    const distSq = dx * dx + dy * dy;
    if (distSq < nearestDistSq) {
      nearestDistSq = distSq;
      nearestFirework = firework;
    }
  }
  return { nearestFirework, nearestDistSq };
}

function stampCoversFirework(pixelX, pixelY, stampScale, firework) {
  return firework.x >= pixelX &&
    firework.x < pixelX + stampScale &&
    firework.y >= pixelY &&
    firework.y < pixelY + stampScale;
}

function getBirdFireworkHit(state, bird, fireworks) {
  if (fireworks.length === 0) {
    return null;
  }

  const scale = bird.scale ?? 1;
  const poseIndex = state.captured || state.burning
    ? state.capturePoseIndex
    : Math.floor((state.animationFrame * 0.45 + bird.bob) / 6) % BIRD_POSES.length;
  const pose = BIRD_POSES[poseIndex];
  const stampScale = Math.max(1, Math.round(scale));

  if ((state.captured || state.burning) && state.fragments.length > 0) {
    for (let i = 0; i < state.fragments.length; i += 1) {
      const fragment = state.fragments[i];
      if (fragment.consumed) {
        continue;
      }
      const pixelX = Math.round(fragment.detached ? fragment.x : state.x + fragment.anchorDx);
      const pixelY = Math.round(fragment.detached ? fragment.y : state.y + fragment.anchorDy);
      for (let j = 0; j < fireworks.length; j += 1) {
        if (stampCoversFirework(pixelX, pixelY, fragment.stampScale, fireworks[j])) {
          return { firework: fireworks[j], fragmentIndex: i };
        }
      }
    }
    return null;
  }

  const baseX = Math.round(state.x);
  const baseY = Math.round(state.y);
  for (let i = 0; i < pose.length; i += 1) {
    const [dx, dy] = pose[i];
    const pixelX = baseX + Math.round(dx * scale);
    const pixelY = baseY + Math.round(dy * scale);
    for (let j = 0; j < fireworks.length; j += 1) {
      if (stampCoversFirework(pixelX, pixelY, stampScale, fireworks[j])) {
        return { firework: fireworks[j], fragmentIndex: i };
      }
    }
  }

  return null;
}

function detachBirdFragments(state, frame, hole, distSq, bird) {
  if (state.fragments.length === 0) {
    return;
  }

  const scale = bird.scale ?? 1;
  const pull = Math.max(0.18, 1 - Math.sqrt(Math.max(distSq, 0.001)) / BIRD_SUCK_RADIUS);
  const detachBudget = Math.min(
    state.fragments.length,
    1 + Math.floor(pull * 2.6) + (((frame + bird.offset) & 3) === 0 ? 1 : 0),
  );
  const candidates = [];
  for (let i = 0; i < state.fragments.length; i += 1) {
    const fragment = state.fragments[i];
    if (fragment.detached || fragment.consumed) {
      continue;
    }
    const fx = state.x + fragment.anchorDx;
    const fy = state.y + fragment.anchorDy;
    const dx = hole.x - fx;
    const dy = hole.y - fy;
    candidates.push({
      fragment,
      distSq: dx * dx + dy * dy,
      dx,
      dy,
    });
  }

  candidates.sort((a, b) => a.distSq - b.distSq);
  for (let i = 0; i < Math.min(detachBudget, candidates.length); i += 1) {
    const candidate = candidates[i];
    const fragment = candidate.fragment;
    const dist = Math.sqrt(Math.max(candidate.distSq, 0.001));
    const invDist = 1 / dist;
    const tangentX = -candidate.dy * invDist;
    const tangentY = candidate.dx * invDist;
    fragment.detached = true;
    fragment.x = state.x + fragment.anchorDx;
    fragment.y = state.y + fragment.anchorDy;
    fragment.vx = state.vx * 0.45 + candidate.dx * invDist * (BIRD_FRAGMENT_BASE_PULL + pull * 1.8) * scale + tangentX * state.swirl * 0.9;
    fragment.vy = state.vy * 0.45 + candidate.dy * invDist * (BIRD_FRAGMENT_BASE_PULL + pull * 1.35) * scale + tangentY * state.swirl * 0.7;
  }
}

function igniteBirdFragments(state, bird, frame, firework, distSq) {
  if (state.fragments.length === 0) {
    return;
  }

  const scale = bird.scale ?? 1;
  const pull = Math.max(0.22, 1 - Math.sqrt(Math.max(distSq, 0.001)) / 10);
  const detachBudget = Math.min(
    state.fragments.length,
    1 + Math.floor(pull * 3.2) + (((frame + bird.offset) & 1) === 0 ? 1 : 0),
  );
  const candidates = [];
  for (let i = 0; i < state.fragments.length; i += 1) {
    const fragment = state.fragments[i];
    if (fragment.detached || fragment.consumed) {
      continue;
    }
    const fx = state.x + fragment.anchorDx;
    const fy = state.y + fragment.anchorDy;
    const dx = firework.x - fx;
    const dy = firework.y - fy;
    candidates.push({
      fragment,
      distSq: dx * dx + dy * dy,
      dx,
      dy,
    });
  }

  candidates.sort((a, b) => a.distSq - b.distSq);
  for (let i = 0; i < Math.min(detachBudget, candidates.length); i += 1) {
    const candidate = candidates[i];
    const fragment = candidate.fragment;
    const dist = Math.sqrt(Math.max(candidate.distSq, 0.001));
    const invDist = 1 / dist;
    const tangentX = -candidate.dy * invDist;
    const tangentY = candidate.dx * invDist;
    fragment.detached = true;
    fragment.burning = true;
    fragment.burnLife = 7 + ((frame + fragment.index) & 3);
    fragment.x = state.x + fragment.anchorDx;
    fragment.y = state.y + fragment.anchorDy;
    fragment.vx = state.vx * 0.3 + tangentX * state.swirl * 0.85 - candidate.dx * invDist * 0.4;
    fragment.vy = state.vy * 0.25 - 0.45 - pull * 0.5 + tangentY * state.swirl * 0.3 - candidate.dy * invDist * 0.18 * scale;
  }
}

function updateBurningBirdFragments(state, firework) {
  let visibleCount = 0;
  for (let i = 0; i < state.fragments.length; i += 1) {
    const fragment = state.fragments[i];
    if (fragment.consumed) {
      continue;
    }
    if (!fragment.detached) {
      visibleCount += 1;
      continue;
    }
    if (!fragment.burning) {
      visibleCount += 1;
      continue;
    }

    fragment.burnLife -= 1;
    fragment.vx *= 0.9;
    fragment.vy = fragment.vy * 0.9 - 0.04;
    if (firework) {
      const dx = firework.x - fragment.x;
      const dy = firework.y - fragment.y;
      const dist = Math.sqrt(Math.max(dx * dx + dy * dy, 0.001));
      fragment.vx += (dx / dist) * 0.08;
      fragment.vy += (dy / dist) * 0.05;
    }
    fragment.x += fragment.vx;
    fragment.y += fragment.vy;

    if (fragment.burnLife <= 0) {
      fragment.consumed = true;
      continue;
    }
    visibleCount += 1;
  }
  return visibleCount;
}

function collectFireworks(types, width) {
  const fireworks = [];
  for (let index = 0; index < types.length; index += 1) {
    if (types[index] !== SPECIES.FIREWORK) {
      continue;
    }
    fireworks.push({
      x: index % width,
      y: (index / width) | 0,
    });
  }
  return fireworks;
}

function updateCapturedBirdFragments(state, bird, hole) {
  let visibleCount = 0;
  for (let i = 0; i < state.fragments.length; i += 1) {
    const fragment = state.fragments[i];
    if (fragment.consumed) {
      continue;
    }
    if (!fragment.detached) {
      visibleCount += 1;
      continue;
    }
    const distance = distanceToBlackHole(fragment.x, fragment.y, hole);
    if (distance.edgeDistSq <= BIRD_EVENT_HORIZON_SQ) {
      fragment.consumed = true;
      continue;
    }
    const pull = Math.max(0.2, 1 - distance.edgeDist / BIRD_SUCK_RADIUS);
    const invDist = 1 / distance.rawDist;
    const tangentX = -distance.dy * invDist;
    const tangentY = distance.dx * invDist;
    fragment.vx = fragment.vx * 0.9 + distance.dx * invDist * (BIRD_FRAGMENT_BASE_PULL + pull * 2.1) + tangentX * state.swirl * pull * 0.65;
    fragment.vy = fragment.vy * 0.9 + distance.dy * invDist * (BIRD_FRAGMENT_BASE_PULL + pull * 1.7) + tangentY * state.swirl * pull * 0.5;
    fragment.x += fragment.vx;
    fragment.y += fragment.vy;
    visibleCount += 1;
  }
  return visibleCount;
}

function updateBirdStates(states, width, height, frame, blackHoles, fireworks = []) {
  const flapFrame = frame * 0.45;

  for (let i = 0; i < states.length; i += 1) {
    const bird = BIRD_CONFIGS[i];
    const state = states[i];
    state.animationFrame = frame;
    const scale = bird.scale ?? 1;
    const spriteWidth = birdSpriteWidth(bird);
    const baseY = birdBaseY(bird, height, flapFrame);
    if (state.respawn > 0) {
      state.respawn -= 1;
      if (state.respawn === 0) {
        resetBirdState(state, bird, width, height, frame, true);
      }
      continue;
    }

    const center = birdCenterFromState(state, bird);
    let { nearestHole, nearestEdgeDistSq } = findNearestBlackHole(center.x, center.y, blackHoles);
    const fireworkHit = getBirdFireworkHit(state, bird, fireworks);
    const nearestFirework = fireworkHit?.firework ?? null;
    const nearestFireworkDistSq = nearestFirework
      ? (nearestFirework.x - center.x) * (nearestFirework.x - center.x) + (nearestFirework.y - center.y) * (nearestFirework.y - center.y)
      : Infinity;

    if (nearestHole && nearestEdgeDistSq <= BIRD_SUCK_RADIUS_SQ) {
      state.captured = true;
      if (state.fragments.length === 0) {
        createBirdFragments(state, bird, frame);
      }
    }
    if (nearestFirework) {
      state.burning = true;
      state.burnSource = nearestFirework;
      if (state.fragments.length === 0) {
        createBirdFragments(state, bird, frame);
      }
    }

    if (!state.captured && !state.burning) {
      state.x += bird.speed;
      state.y = baseY;
      if (state.x > width + 12) {
        resetBirdState(state, bird, width, height, frame, true);
      }
      continue;
    }

    if (state.captured && !nearestHole) {
      state.captured = false;
    }

    if (state.captured && nearestEdgeDistSq > BIRD_SUCK_RADIUS_SQ * 1.35) {
      state.captured = false;
    }

    if (state.captured && nearestHole) {
      const distance = distanceToBlackHole(center.x, center.y, nearestHole);
      const pull = Math.max(0.14, 1 - (distance.edgeDist / BIRD_SUCK_RADIUS));
      const invDist = 1 / distance.rawDist;
      const tangentX = -distance.dy * invDist;
      const tangentY = distance.dx * invDist;
      state.vx = state.vx * 0.9 + distance.dx * invDist * pull * 1.8 * scale + tangentX * state.swirl * pull * 0.75;
      state.vy = state.vy * 0.9 + distance.dy * invDist * pull * 1.25 * scale + tangentY * state.swirl * pull * 0.55;
      state.x += state.vx;
      state.y += state.vy;
      detachBirdFragments(state, frame, nearestHole, nearestEdgeDistSq, bird);
      const remainingFragments = updateCapturedBirdFragments(state, bird, nearestHole);
      if (remainingFragments === 0) {
        state.respawn = BIRD_RESPAWN_FRAMES;
        state.captured = false;
        state.vx = 0;
        state.vy = 0;
        state.fragments = [];
        state.burning = false;
      }
      continue;
    }

    if (state.burning) {
      const burnSource = nearestFirework ?? state.burnSource;
      if (burnSource) {
        const burnDistSq = (burnSource.x - center.x) * (burnSource.x - center.x) + (burnSource.y - center.y) * (burnSource.y - center.y);
        igniteBirdFragments(state, bird, frame, burnSource, burnDistSq);
      }
      const remainingFragments = updateBurningBirdFragments(state, burnSource);
      if (remainingFragments === 0) {
        state.respawn = BIRD_RESPAWN_FRAMES;
        state.burning = false;
        state.burnSource = null;
        state.vx = 0;
        state.vy = 0;
        state.fragments = [];
      }
      continue;
    }
  }
}

function stampBirds(output, width, height, frame, birdStates) {
  const flapFrame = frame * 0.45;

  for (let i = 0; i < birdStates.length; i += 1) {
    const bird = BIRD_CONFIGS[i];
    const state = birdStates[i];
    if (state.respawn > 0) {
      continue;
    }
    const scale = bird.scale ?? 1;
    const palette = BIRD_PALETTES[bird.palette ?? 0];
    const pose = BIRD_POSES[state.captured && state.fragments.length > 0
      ? state.capturePoseIndex
      : Math.floor((flapFrame + bird.bob) / 6) % BIRD_POSES.length];
    const stampScale = Math.max(1, Math.round(scale));

    if ((state.captured || state.burning) && state.fragments.length > 0) {
      for (let j = 0; j < state.fragments.length; j += 1) {
        const fragment = state.fragments[j];
        if (fragment.consumed) {
          continue;
        }
        const color = fragment.burning
          ? tintToward(fragment.color, 255, 136, 58, 0.68)
          : fragment.color;
        const pixelX = Math.round(fragment.detached ? fragment.x : state.x + fragment.anchorDx);
        const pixelY = Math.round(fragment.detached ? fragment.y : state.y + fragment.anchorDy);
        for (let sy = 0; sy < fragment.stampScale; sy += 1) {
          const y = pixelY + sy;
          if (y < 0 || y >= height) {
            continue;
          }
          for (let sx = 0; sx < fragment.stampScale; sx += 1) {
            const x = pixelX + sx;
            if (x < 0 || x >= width) {
              continue;
            }
            output[y * width + x] = color;
          }
        }
      }
      continue;
    }

    const baseX = Math.round(state.x);
    const baseY = Math.round(state.y);
    for (let j = 0; j < pose.length; j += 1) {
      const [dx, dy, colorRole] = pose[j];
      const color = palette[colorRole] ?? palette[BIRD_BODY];
      const pixelX = baseX + Math.round(dx * scale);
      const pixelY = baseY + Math.round(dy * scale);
      for (let sy = 0; sy < stampScale; sy += 1) {
        const y = pixelY + sy;
        if (y < 0 || y >= height) {
          continue;
        }
        for (let sx = 0; sx < stampScale; sx += 1) {
          const x = pixelX + sx;
          if (x < 0 || x >= width) {
            continue;
          }
          output[y * width + x] = color;
        }
      }
    }
  }
}

class CanvasRenderer {
  constructor({ canvas, simulation }) {
    this.canvas = canvas;
    this.simulation = simulation;
    this.ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
    this.animationFrame = 0;
    this.birdStates = createBirdStates(simulation.width, simulation.height);
    this.decorativePhotos = [];
    this.resize();
  }

  setDecorativePhotos(decorativePhotos) {
    this.decorativePhotos = decorativePhotos ?? [];
  }

  resize() {
    this.imageData = this.ctx.createImageData(this.simulation.width, this.simulation.height);
    this.output32 = new Uint32Array(this.imageData.data.buffer);
    this.sky32 = buildSky(this.simulation.width, this.simulation.height);
    this.birdStates = createBirdStates(this.simulation.width, this.simulation.height, this.animationFrame);
    this.canvas.width = this.simulation.width;
    this.canvas.height = this.simulation.height;
  }

  render() {
    this.animationFrame += 1;
    this.simulation.consumeDirtyRegion();
    const { types, data, photoColors, width, height, frame } = this.simulation;
    const output = this.output32;
    const stoneBase = TABLES.base[SPECIES.STONE][0];
    const sky = this.sky32;
    const blackHoles = collectBlackHoles(this.simulation.blackHoleIndices, width, height);
    const fireworks = collectFireworks(types, width);
    const minX = 0;
    const minY = 0;
    const maxX = width - 1;
    const maxY = height - 1;

    output.set(sky);
    updateBirdStates(this.birdStates, width, height, this.animationFrame, blackHoles, fireworks);
    stampBirds(output, width, height, this.animationFrame, this.birdStates);
    const hiddenPhotoIndices = stampDecorativePhotos(
      output,
      width,
      height,
      this.decorativePhotos,
      this.simulation,
      photoColors,
    );

    for (let y = minY; y <= maxY; y += 1) {
      let index = y * width + minX;
      for (let x = minX; x <= maxX; x += 1, index += 1) {
        const species = types[index];
        const tone = (data[index] + frame) & 255;

        if (species === SPECIES.EMPTY) {
          let emptyColor = output[index];
          for (let i = 0; i < blackHoles.length; i += 1) {
            const distance = distanceToBlackHole(x, y, blackHoles[i]);
            if (distance.edgeDistSq <= 5) {
              emptyColor = tintToward(emptyColor, 8, 9, 14, 0.86);
              break;
            }
            if (distance.edgeDistSq <= 13) {
              emptyColor = tintToward(emptyColor, 74, 60, 88, 0.32);
              break;
            }
            if (distance.edgeDistSq >= BLACK_HOLE_HALO_RADIUS_SQ) {
              continue;
            }
            const falloff = (BLACK_HOLE_HALO_RADIUS_SQ - distance.edgeDistSq) / BLACK_HOLE_HALO_RADIUS_SQ;
            const strength = Math.min(0.08, falloff * falloff * 0.08);
            emptyColor = tintToward(emptyColor, 220, 214, 228, strength);
            break;
          }
          output[index] = emptyColor;
          continue;
        }

        if (species === SPECIES.PHOTO) {
          if (hiddenPhotoIndices.has(index)) {
            continue;
          }
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

    stampResumePixels(output, this.simulation, photoColors);

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
export { BIRD_CONFIGS, CanvasRenderer, collectBlackHoles, collectFireworks, createBirdStates, updateBirdStates, stampBirds };
