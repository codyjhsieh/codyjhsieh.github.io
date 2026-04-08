const SPECIES = {
  EMPTY: 0,
  SAND: 1,
  WATER: 2,
  STONE: 3,
  WOOD: 4,
  FIRE: 5,
  OIL: 6,
  PHOTO: 7,
  FIREWORK: 8,
  BLACK_HOLE: 9,
};

const FIREWORK_ROCKET_BASE = 192;
const FIREWORK_SHELL_BASE = 128;
const FIREWORK_SPARK_MASK = 15;
const FIREWORK_DIRECTIONS = [
  [0, -3], [2, -2], [3, 0], [2, 2],
  [0, 3], [-2, 2], [-3, 0], [-2, -2],
];

class SandSimulation {
  constructor(width, height) {
    this.width = 0;
    this.height = 0;
    this.size = 0;
    this.types = new Uint8Array(0);
    this.data = new Uint8Array(0);
    this.photoColors = new Uint32Array(0);
    this.locked = new Uint8Array(0);
    this.marks = new Uint32Array(0);
    this.frame = 0;
    this.visitToken = 1;
    this.particleCount = 0;
    this.activeMinX = 0;
    this.activeMinY = 0;
    this.activeMaxX = 0;
    this.activeMaxY = 0;
    this.hasActiveRegion = false;
    this.nextActiveMinX = 0;
    this.nextActiveMinY = 0;
    this.nextActiveMaxX = 0;
    this.nextActiveMaxY = 0;
    this.hasNextActiveRegion = false;
    this.dirtyMinX = 0;
    this.dirtyMinY = 0;
    this.dirtyMaxX = 0;
    this.dirtyMaxY = 0;
    this.hasDirtyRegion = false;
    this.resize(width, height);
  }

  index(x, y) {
    return x + y * this.width;
  }

  inBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  get(x, y) {
    if (!this.inBounds(x, y)) {
      return SPECIES.STONE;
    }
    return this.types[this.index(x, y)];
  }

  setCell(index, type, data = 0) {
    if (this.locked[index]) {
      return;
    }
    const current = this.types[index];
    if (current === SPECIES.EMPTY && type !== SPECIES.EMPTY) {
      this.particleCount += 1;
    } else if (current !== SPECIES.EMPTY && type === SPECIES.EMPTY) {
      this.particleCount -= 1;
    }
    this.types[index] = type;
    this.data[index] = data;
    if (type !== SPECIES.PHOTO) {
      this.photoColors[index] = 0;
    }
    this.noteCellChange(index, this.activityRadiusFor(type, current));
  }

  setPhotoCell(index, color) {
    if (this.locked[index]) {
      return;
    }
    this.setCell(index, SPECIES.PHOTO, 0);
    this.photoColors[index] = color >>> 0;
  }

  forceClearCell(index) {
    const current = this.types[index];
    if (current !== SPECIES.EMPTY) {
      this.particleCount -= 1;
    }
    this.types[index] = SPECIES.EMPTY;
    this.data[index] = 0;
    this.photoColors[index] = 0;
    this.locked[index] = 0;
    this.noteCellChange(index, this.activityRadiusFor(SPECIES.EMPTY, current));
  }

  clear() {
    this.types.fill(SPECIES.EMPTY);
    this.data.fill(0);
    this.photoColors.fill(0);
    this.locked.fill(0);
    this.particleCount = 0;
    this.activateAll();
    this.markDirtyAll();
  }

  resize(width, height) {
    const nextWidth = Math.max(1, width | 0);
    const nextHeight = Math.max(1, height | 0);
    if (nextWidth === this.width && nextHeight === this.height) {
      return;
    }

    const nextSize = nextWidth * nextHeight;
    const nextTypes = new Uint8Array(nextSize);
    const nextData = new Uint8Array(nextSize);
    const nextPhotoColors = new Uint32Array(nextSize);
    const nextLocked = new Uint8Array(nextSize);
    const nextMarks = new Uint32Array(nextSize);
    const copyWidth = Math.min(this.width, nextWidth);
    const copyHeight = Math.min(this.height, nextHeight);
    let count = 0;

    for (let y = 0; y < copyHeight; y += 1) {
      const oldRow = y * this.width;
      const nextRow = y * nextWidth;
      for (let x = 0; x < copyWidth; x += 1) {
        const oldIndex = oldRow + x;
        const nextIndex = nextRow + x;
        const type = this.types[oldIndex];
        nextTypes[nextIndex] = type;
        nextData[nextIndex] = this.data[oldIndex];
        nextPhotoColors[nextIndex] = this.photoColors[oldIndex];
        nextLocked[nextIndex] = this.locked[oldIndex];
        if (type !== SPECIES.EMPTY) {
          count += 1;
        }
      }
    }

    this.width = nextWidth;
    this.height = nextHeight;
    this.size = nextSize;
    this.types = nextTypes;
    this.data = nextData;
    this.photoColors = nextPhotoColors;
    this.locked = nextLocked;
    this.marks = nextMarks;
    this.particleCount = count;
    this.visitToken = 1;
    this.activateAll();
    this.markDirtyAll();
  }

  seed(sceneId = "dunes") {
    this.clear();
    this.applyScene(sceneId);
  }

  setLockedCell(index, type, data = 0) {
    const current = this.types[index];
    if (current === SPECIES.EMPTY && type !== SPECIES.EMPTY) {
      this.particleCount += 1;
    } else if (current !== SPECIES.EMPTY && type === SPECIES.EMPTY) {
      this.particleCount -= 1;
    }
    this.types[index] = type;
    this.data[index] = data;
    this.photoColors[index] = 0;
    this.locked[index] = type === SPECIES.EMPTY ? 0 : 1;
    this.noteCellChange(index, 1);
  }

  activityRadiusFor(nextType, previousType = SPECIES.EMPTY) {
    const type = nextType !== SPECIES.EMPTY ? nextType : previousType;
    if (type === SPECIES.BLACK_HOLE) {
      return 22;
    }
    if (type === SPECIES.FIREWORK) {
      return 8;
    }
    if (type === SPECIES.FIRE || type === SPECIES.WATER || type === SPECIES.OIL || type === SPECIES.SAND) {
      return 2;
    }
    return 1;
  }

  boundsFromIndex(index, radius = 0) {
    const x = index % this.width;
    const y = (index / this.width) | 0;
    return {
      minX: Math.max(0, x - radius),
      minY: Math.max(0, y - radius),
      maxX: Math.min(this.width - 1, x + radius),
      maxY: Math.min(this.height - 1, y + radius),
    };
  }

  activateRect(minX, minY, maxX, maxY) {
    const nextMinX = Math.max(0, minX);
    const nextMinY = Math.max(0, minY);
    const nextMaxX = Math.min(this.width - 1, maxX);
    const nextMaxY = Math.min(this.height - 1, maxY);
    if (!this.hasActiveRegion) {
      this.activeMinX = nextMinX;
      this.activeMinY = nextMinY;
      this.activeMaxX = nextMaxX;
      this.activeMaxY = nextMaxY;
      this.hasActiveRegion = true;
      return;
    }
    this.activeMinX = Math.min(this.activeMinX, nextMinX);
    this.activeMinY = Math.min(this.activeMinY, nextMinY);
    this.activeMaxX = Math.max(this.activeMaxX, nextMaxX);
    this.activeMaxY = Math.max(this.activeMaxY, nextMaxY);
  }

  queueActiveRect(minX, minY, maxX, maxY) {
    const nextMinX = Math.max(0, minX);
    const nextMinY = Math.max(0, minY);
    const nextMaxX = Math.min(this.width - 1, maxX);
    const nextMaxY = Math.min(this.height - 1, maxY);
    if (!this.hasNextActiveRegion) {
      this.nextActiveMinX = nextMinX;
      this.nextActiveMinY = nextMinY;
      this.nextActiveMaxX = nextMaxX;
      this.nextActiveMaxY = nextMaxY;
      this.hasNextActiveRegion = true;
      return;
    }
    this.nextActiveMinX = Math.min(this.nextActiveMinX, nextMinX);
    this.nextActiveMinY = Math.min(this.nextActiveMinY, nextMinY);
    this.nextActiveMaxX = Math.max(this.nextActiveMaxX, nextMaxX);
    this.nextActiveMaxY = Math.max(this.nextActiveMaxY, nextMaxY);
  }

  markDirtyRect(minX, minY, maxX, maxY) {
    if (!this.hasDirtyRegion) {
      this.dirtyMinX = Math.max(0, minX);
      this.dirtyMinY = Math.max(0, minY);
      this.dirtyMaxX = Math.min(this.width - 1, maxX);
      this.dirtyMaxY = Math.min(this.height - 1, maxY);
      this.hasDirtyRegion = true;
      return;
    }
    this.dirtyMinX = Math.min(this.dirtyMinX, Math.max(0, minX));
    this.dirtyMinY = Math.min(this.dirtyMinY, Math.max(0, minY));
    this.dirtyMaxX = Math.max(this.dirtyMaxX, Math.min(this.width - 1, maxX));
    this.dirtyMaxY = Math.max(this.dirtyMaxY, Math.min(this.height - 1, maxY));
  }

  noteCellChange(index, radius = 1) {
    const bounds = this.boundsFromIndex(index, radius);
    this.activateRect(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY);
    this.markDirtyRect(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY);
  }

  queueCellActivity(index, radius = 1) {
    const bounds = this.boundsFromIndex(index, radius);
    this.queueActiveRect(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY);
    this.markDirtyRect(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY);
  }

  activateAll() {
    this.activeMinX = 0;
    this.activeMinY = 0;
    this.activeMaxX = this.width - 1;
    this.activeMaxY = this.height - 1;
    this.hasActiveRegion = true;
  }

  markDirtyAll() {
    this.dirtyMinX = 0;
    this.dirtyMinY = 0;
    this.dirtyMaxX = this.width - 1;
    this.dirtyMaxY = this.height - 1;
    this.hasDirtyRegion = true;
  }

  consumeDirtyRegion() {
    if (!this.hasDirtyRegion) {
      return null;
    }
    const region = {
      minX: this.dirtyMinX,
      minY: this.dirtyMinY,
      maxX: this.dirtyMaxX,
      maxY: this.dirtyMaxY,
    };
    this.hasDirtyRegion = false;
    return region;
  }

  lockRect(x1, y1, x2, y2, type = SPECIES.STONE, data = 0) {
    const minX = Math.max(0, Math.min(x1, x2));
    const maxX = Math.min(this.width - 1, Math.max(x1, x2));
    const minY = Math.max(0, Math.min(y1, y2));
    const maxY = Math.min(this.height - 1, Math.max(y1, y2));
    for (let y = minY; y <= maxY; y += 1) {
      const row = y * this.width;
      for (let x = minX; x <= maxX; x += 1) {
        this.setLockedCell(row + x, type, data);
      }
    }
  }

  lockCircle(cx, cy, radius, type = SPECIES.STONE, data = 0) {
    const minX = Math.max(0, Math.floor(cx - radius));
    const maxX = Math.min(this.width - 1, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(this.height - 1, Math.ceil(cy + radius));
    const radiusSq = radius * radius;

    for (let y = minY; y <= maxY; y += 1) {
      const row = y * this.width;
      const dy = y - cy;
      for (let x = minX; x <= maxX; x += 1) {
        const dx = x - cx;
        if (dx * dx + dy * dy > radiusSq) {
          continue;
        }
        this.setLockedCell(row + x, type, data);
      }
    }
  }

  lockWord(text, startX, startY, scale, type = SPECIES.STONE, data = 0) {
    const glyphs = {
      A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
      B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
      C: ["11110", "10000", "10000", "10000", "10000", "10000", "11110"],
      D: ["11100", "10010", "10001", "10001", "10001", "10010", "11100"],
      E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
      F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
      G: ["01111", "10000", "10000", "10011", "10001", "10001", "01110"],
      H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
      I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
      K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
      L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
      N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
      O: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
      P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
      R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
      S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
      T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
      U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
      W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
      Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
    };
    let cursorX = startX;
    for (const character of text) {
      if (character === " ") {
        cursorX += 6 * scale;
        continue;
      }
      const glyph = glyphs[character];
      if (!glyph) {
        cursorX += 6 * scale;
        continue;
      }
      for (let row = 0; row < glyph.length; row += 1) {
        for (let col = 0; col < glyph[row].length; col += 1) {
          if (glyph[row][col] === "1") {
            this.lockCircle(cursorX + col * scale, startY + row * scale, Math.max(1.1, scale * 0.72), type, data);
          }
        }
      }
      cursorX += 7 * scale;
    }
  }

  applyScene(sceneId) {
    const floorY = this.height - 10;
    const codyScale = Math.max(2, Math.min(5, Math.floor((this.width - 18) / 28)));
    const codyWidth = 26 * codyScale;
    const codyX = Math.max(6, Math.floor((this.width - codyWidth) * 0.5));
    const codyY = Math.max(8, Math.min(18, Math.floor(this.height * 0.05)));
    this.paintLine(0, floorY, this.width - 1, floorY, 6, SPECIES.STONE);
    this.paintWord("CODY", codyX, codyY, codyScale, SPECIES.STONE);

    if (sceneId === "fountain") {
      this.paintLine(18, floorY - 22, this.width - 18, floorY - 22, 5, SPECIES.STONE);
      this.paintCircle(this.width * 0.5, floorY - 42, 9, SPECIES.WATER);
      this.paintCircle(this.width * 0.5, floorY - 58, 7, SPECIES.WATER);
      this.paintCircle(this.width * 0.25, floorY - 18, 11, SPECIES.SAND);
      this.paintCircle(this.width * 0.75, floorY - 18, 11, SPECIES.SAND);
      return;
    }

    if (sceneId === "bonfire") {
      this.paintCircle(this.width * 0.5, floorY - 16, 20, SPECIES.SAND);
      this.paintLine(this.width * 0.45, floorY - 14, this.width * 0.55, floorY - 24, 3, SPECIES.WOOD);
      this.paintLine(this.width * 0.55, floorY - 14, this.width * 0.45, floorY - 24, 3, SPECIES.WOOD);
      this.paintCircle(this.width * 0.5, floorY - 29, 7, SPECIES.FIRE);
      this.paintCircle(this.width * 0.34, floorY - 24, 7, SPECIES.OIL);
      this.paintCircle(this.width * 0.66, floorY - 24, 7, SPECIES.OIL);
      this.paintCircle(this.width * 0.5, floorY - 8, 3, SPECIES.FIREWORK);
      return;
    }

    if (sceneId === "cascade") {
      this.paintCircle(this.width * 0.2, floorY - 12, 14, SPECIES.SAND);
      this.paintCircle(this.width * 0.5, floorY - 20, 16, SPECIES.STONE);
      this.paintCircle(this.width * 0.8, floorY - 12, 14, SPECIES.SAND);
      this.paintCircle(this.width * 0.33, floorY - 42, 12, SPECIES.WATER);
      this.paintCircle(this.width * 0.67, floorY - 42, 12, SPECIES.WATER);
      this.paintCircle(this.width * 0.5, floorY - 56, 10, SPECIES.OIL);
      return;
    }

    this.paintLine(this.width * 0.0, floorY - 84, this.width * 0.22, floorY - 96, 5, SPECIES.STONE);
    this.paintLine(this.width * 0.2, floorY - 96, this.width * 0.48, floorY - 106, 5, SPECIES.STONE);
    this.paintLine(this.width * 0.46, floorY - 106, this.width * 0.74, floorY - 92, 5, SPECIES.STONE);
    this.paintLine(this.width * 0.72, floorY - 92, this.width * 1.0, floorY - 98, 5, SPECIES.STONE);

    this.paintCircle(this.width * 0.22, floorY - 22, 24, SPECIES.SAND);
    this.paintCircle(this.width * 0.54, floorY - 38, 25, SPECIES.WATER);
    this.paintCircle(this.width * 0.82, floorY - 22, 22, SPECIES.SAND);

    this.paintLine(this.width * 0.16, floorY - 28, this.width * 0.16, floorY - 58, 2, SPECIES.WOOD);
    this.paintLine(this.width * 0.16, floorY - 46, this.width * 0.12, floorY - 36, 1, SPECIES.WOOD);

    this.paintLine(this.width * 0.8, floorY - 24, this.width * 0.8, floorY - 60, 2, SPECIES.WOOD);
    this.paintLine(this.width * 0.8, floorY - 48, this.width * 0.76, floorY - 38, 1, SPECIES.WOOD);
  }

  paintWord(text, startX, startY, scale, type) {
    const glyphs = {
      C: ["11110", "10000", "10000", "10000", "10000", "10000", "11110"],
      O: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
      D: ["11100", "10010", "10001", "10001", "10001", "10010", "11100"],
      Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
    };

    let cursorX = startX;
    for (const character of text) {
      const glyph = glyphs[character];
      if (!glyph) {
        cursorX += 6 * scale;
        continue;
      }
      for (let row = 0; row < glyph.length; row += 1) {
        for (let col = 0; col < glyph[row].length; col += 1) {
          if (glyph[row][col] === "1") {
            this.paintCircle(cursorX + col * scale, startY + row * scale, Math.max(1.1, scale * 0.74), type);
          }
        }
      }
      cursorX += 7 * scale;
    }
  }

  paintLine(x1, y1, x2, y2, radius, type) {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
    const dx = (x2 - x1) / steps;
    const dy = (y2 - y1) / steps;
    let x = x1;
    let y = y1;
    for (let step = 0; step <= steps; step += 1) {
      this.paintCircle(x, y, radius, type);
      x += dx;
      y += dy;
    }
  }

  paintCircle(cx, cy, radius, type) {
    const minX = Math.max(0, Math.floor(cx - radius));
    const maxX = Math.min(this.width - 1, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(this.height - 1, Math.ceil(cy + radius));
    const radiusSq = radius * radius;

    for (let y = minY; y <= maxY; y += 1) {
      const row = y * this.width;
      const dy = y - cy;
      for (let x = minX; x <= maxX; x += 1) {
        const dx = x - cx;
        if (dx * dx + dy * dy > radiusSq) {
          continue;
        }
        const index = row + x;
        if (type === SPECIES.EMPTY) {
          this.setCell(index, SPECIES.EMPTY, 0);
        } else {
          this.setCell(index, type, this.seedDataFor(type, x, y));
        }
      }
    }
  }

  seedDataFor(type, x, y) {
    if (type === SPECIES.FIRE) {
      return 28 + ((x * 7 + y * 13) % 52);
    }
    if (type === SPECIES.FIREWORK) {
      return FIREWORK_ROCKET_BASE + 54 + ((x * 5 + y * 9) % 8);
    }
    if (type === SPECIES.BLACK_HOLE) {
      return 96 + ((x * 3 + y * 5) % 32);
    }
    if (type === SPECIES.OIL) {
      return 18 + ((x * 11 + y * 5) % 26);
    }
    return (x * 9 + y * 3) & 31;
  }

  beginStep() {
    this.frame += 1;
    this.visitToken += 1;
    this.hasNextActiveRegion = false;
    this.nextActiveMinX = 0;
    this.nextActiveMinY = 0;
    this.nextActiveMaxX = 0;
    this.nextActiveMaxY = 0;
    if (this.visitToken === 0xffffffff) {
      this.marks.fill(0);
      this.visitToken = 1;
    }
  }

  tick(steps = 1) {
    for (let step = 0; step < steps; step += 1) {
      if (!this.hasActiveRegion) {
        return;
      }

      const minX = this.activeMinX;
      const maxX = this.activeMaxX;
      const minY = this.activeMinY;
      const maxY = this.activeMaxY;
      this.beginStep();
      for (let y = maxY; y >= minY; y -= 1) {
        const leftToRight = ((this.frame + y) & 1) === 0;
        if (leftToRight) {
          let index = y * this.width + minX;
          for (let x = minX; x <= maxX; x += 1, index += 1) {
            this.updateCell(index, x, y);
          }
        } else {
          let index = y * this.width + maxX;
          for (let x = maxX; x >= minX; x -= 1, index -= 1) {
            this.updateCell(index, x, y);
          }
        }
      }

      this.hasActiveRegion = this.hasNextActiveRegion;
      if (this.hasNextActiveRegion) {
        this.activeMinX = this.nextActiveMinX;
        this.activeMinY = this.nextActiveMinY;
        this.activeMaxX = this.nextActiveMaxX;
        this.activeMaxY = this.nextActiveMaxY;
      }
    }
  }

  mark(index) {
    this.marks[index] = this.visitToken;
  }

  isMarked(index) {
    return this.marks[index] === this.visitToken;
  }

  moveCell(from, to) {
    const movedType = this.types[from];
    this.types[to] = movedType;
    this.data[to] = this.data[from];
    this.photoColors[to] = this.photoColors[from];
    this.locked[to] = this.locked[from];
    this.types[from] = SPECIES.EMPTY;
    this.data[from] = 0;
    this.photoColors[from] = 0;
    this.locked[from] = 0;
    this.mark(from);
    this.mark(to);
    const radius = this.activityRadiusFor(movedType);
    this.queueCellActivity(from, radius);
    this.queueCellActivity(to, radius);
  }

  swapCells(from, to) {
    const nextType = this.types[to];
    const nextData = this.data[to];
    const nextPhotoColor = this.photoColors[to];
    const nextLocked = this.locked[to];
    const currentType = this.types[from];
    this.types[to] = currentType;
    this.data[to] = this.data[from];
    this.photoColors[to] = this.photoColors[from];
    this.locked[to] = this.locked[from];
    this.types[from] = nextType;
    this.data[from] = nextData;
    this.photoColors[from] = nextPhotoColor;
    this.locked[from] = nextLocked;
    this.mark(from);
    this.mark(to);
    const radius = Math.max(this.activityRadiusFor(currentType), this.activityRadiusFor(nextType));
    this.queueCellActivity(from, radius);
    this.queueCellActivity(to, radius);
  }

  updateCell(index, x, y) {
    if (this.isMarked(index)) {
      return;
    }

    switch (this.types[index]) {
      case SPECIES.SAND:
        this.updateSand(index, x, y);
        break;
      case SPECIES.WATER:
        this.updateWater(index, x, y);
        break;
      case SPECIES.FIRE:
        this.updateFire(index, x, y);
        break;
      case SPECIES.OIL:
        this.updateOil(index, x, y);
        break;
      case SPECIES.FIREWORK:
        this.updateFirework(index, x, y);
        break;
      case SPECIES.BLACK_HOLE:
        this.updateBlackHole(index, x, y);
        break;
      case SPECIES.PHOTO:
        this.updatePhoto(index, x, y);
        break;
      default:
        this.mark(index);
        break;
    }
  }

  tryMoveDense(index, x, y, swapsWith) {
    if (y + 1 >= this.height) {
      return false;
    }

    const belowIndex = this.index(x, y + 1);
    const below = this.types[belowIndex];
    if (below === SPECIES.EMPTY) {
      this.moveCell(index, belowIndex);
      return true;
    }
    if (swapsWith.includes(below)) {
      this.swapCells(index, belowIndex);
      return true;
    }

    const startLeft = ((this.frame + x + y) & 1) === 0;
    for (let i = 0; i < 2; i += 1) {
      const dx = startLeft ? (i === 0 ? -1 : 1) : (i === 0 ? 1 : -1);
      const nx = x + dx;
      if (nx < 0 || nx >= this.width || y + 1 >= this.height) {
        continue;
      }
      const targetIndex = this.index(nx, y + 1);
      const target = this.types[targetIndex];
      if (target === SPECIES.EMPTY) {
        this.moveCell(index, targetIndex);
        return true;
      }
      if (swapsWith.includes(target)) {
        this.swapCells(index, targetIndex);
        return true;
      }
    }

    return false;
  }

  updateSand(index, x, y) {
    if (this.tryMoveDense(index, x, y, [SPECIES.WATER, SPECIES.FIRE, SPECIES.OIL])) {
      return;
    }
    this.mark(index);
  }

  updateWater(index, x, y) {
    if (y + 1 < this.height) {
      const belowIndex = this.index(x, y + 1);
      const below = this.types[belowIndex];
      if (below === SPECIES.EMPTY) {
        this.moveCell(index, belowIndex);
        return;
      }
      if (below === SPECIES.FIRE) {
        this.setCell(belowIndex, SPECIES.EMPTY, 0);
        this.moveCell(index, belowIndex);
        return;
      }
    }

    const start = ((this.frame + x * 7 + y * 11) & 1) === 0 ? -1 : 1;
    const dirs = [start, -start];

    for (let i = 0; i < dirs.length; i += 1) {
      const dx = dirs[i];
      const nx = x + dx;
      if (nx < 0 || nx >= this.width) {
        continue;
      }

      if (y + 1 < this.height) {
        const diagonalIndex = this.index(nx, y + 1);
        const diagonal = this.types[diagonalIndex];
        if (diagonal === SPECIES.EMPTY || diagonal === SPECIES.FIRE) {
          if (diagonal === SPECIES.FIRE) {
            this.setCell(diagonalIndex, SPECIES.EMPTY, 0);
          }
          this.moveCell(index, diagonalIndex);
          return;
        }
      }

      const sideIndex = this.index(nx, y);
      const side = this.types[sideIndex];
      if (side === SPECIES.EMPTY || side === SPECIES.FIRE) {
        if (side === SPECIES.FIRE) {
          this.setCell(sideIndex, SPECIES.EMPTY, 0);
        }
        this.moveCell(index, sideIndex);
        return;
      }
    }

    this.mark(index);
  }

  updateOil(index, x, y) {
    const neighbors = [
      [0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1],
    ];
    for (let i = 0; i < neighbors.length; i += 1) {
      const nx = x + neighbors[i][0];
      const ny = y + neighbors[i][1];
      if (!this.inBounds(nx, ny)) {
        continue;
      }
      if (this.types[this.index(nx, ny)] === SPECIES.FIRE) {
        this.setCell(index, SPECIES.FIRE, this.seedDataFor(SPECIES.FIRE, x, y));
        this.mark(index);
        return;
      }
    }

    if (y + 1 < this.height) {
      const belowIndex = this.index(x, y + 1);
      const below = this.types[belowIndex];
      if (below === SPECIES.EMPTY || below === SPECIES.FIRE) {
        if (below === SPECIES.FIRE) {
          this.setCell(belowIndex, SPECIES.EMPTY, 0);
        }
        this.moveCell(index, belowIndex);
        return;
      }
    }

    const start = ((this.frame + x * 3 + y * 5) & 1) === 0 ? -1 : 1;
    const dirs = [start, -start];

    for (let i = 0; i < dirs.length; i += 1) {
      const dx = dirs[i];
      const nx = x + dx;
      if (nx < 0 || nx >= this.width) {
        continue;
      }

      if (y + 1 < this.height) {
        const diagonalIndex = this.index(nx, y + 1);
        const diagonal = this.types[diagonalIndex];
        if (diagonal === SPECIES.EMPTY || diagonal === SPECIES.FIRE) {
          if (diagonal === SPECIES.FIRE) {
            this.setCell(diagonalIndex, SPECIES.EMPTY, 0);
          }
          this.moveCell(index, diagonalIndex);
          return;
        }
      }

      const sideIndex = this.index(nx, y);
      if (this.types[sideIndex] === SPECIES.EMPTY) {
        this.moveCell(index, sideIndex);
        return;
      }
    }

    this.mark(index);
  }

  updateFire(index, x, y) {
    let life = this.data[index];
    if (life <= 1) {
      this.setCell(index, SPECIES.EMPTY, 0);
      this.mark(index);
      return;
    }

    life -= 1;
    this.data[index] = life;

    const neighbors = [
      [0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1],
    ];

    for (let i = 0; i < neighbors.length; i += 1) {
      const nx = x + neighbors[i][0];
      const ny = y + neighbors[i][1];
      if (!this.inBounds(nx, ny)) {
        continue;
      }

      const neighborIndex = this.index(nx, ny);
      const neighbor = this.types[neighborIndex];
      if (neighbor === SPECIES.WATER) {
        this.setCell(index, SPECIES.EMPTY, 0);
        this.mark(index);
        return;
      }
      if ((neighbor === SPECIES.WOOD || neighbor === SPECIES.OIL || neighbor === SPECIES.PHOTO) && ((this.frame + nx + ny) & 3) === 0) {
        this.setCell(neighborIndex, SPECIES.FIRE, this.seedDataFor(SPECIES.FIRE, nx, ny));
      }
    }

    if (y > 0) {
      const aboveIndex = this.index(x, y - 1);
      if (this.types[aboveIndex] === SPECIES.EMPTY) {
        this.moveCell(index, aboveIndex);
        return;
      }
    }

    const dx = ((this.frame + x + y) & 1) === 0 ? -1 : 1;
    const nx = x + dx;
    if (this.inBounds(nx, y) && this.types[this.index(nx, y)] === SPECIES.EMPTY) {
      this.moveCell(index, this.index(nx, y));
      return;
    }

    this.queueCellActivity(index, 2);
    this.mark(index);
  }

  updatePhoto(index, x, y) {
    this.mark(index);
  }

  encodeFireworkSpark(directionIndex, life) {
    return ((directionIndex & 7) << 4) | (life & FIREWORK_SPARK_MASK);
  }

  spawnFireworkBurst(x, y, seed, secondary = false) {
    const spokeCount = secondary ? 4 : 8;
    const step = secondary ? 2 : 1;

    for (let spoke = 0; spoke < spokeCount; spoke += 1) {
      const directionIndex = (spoke * step) & 7;
      const [dx, dy] = FIREWORK_DIRECTIONS[directionIndex];
      const nx = x + Math.sign(dx);
      const ny = y + Math.sign(dy);
      if (!this.inBounds(nx, ny)) {
        continue;
      }

      const targetIndex = this.index(nx, ny);
      const target = this.types[targetIndex];
      if (target !== SPECIES.EMPTY && target !== SPECIES.WATER) {
        continue;
      }

      const life = (secondary ? 10 : 14) + ((seed + spoke * 5) & 1);
      this.setCell(targetIndex, SPECIES.FIREWORK, this.encodeFireworkSpark(directionIndex, life));

      if (!secondary && (spoke & 3) === 0) {
        const shellX = x + Math.sign(dx) * 3;
        const shellY = y + Math.sign(dy) * 3;
        if (this.inBounds(shellX, shellY)) {
          const shellIndex = this.index(shellX, shellY);
          const shellTarget = this.types[shellIndex];
          if (shellTarget === SPECIES.EMPTY || shellTarget === SPECIES.WATER) {
            this.setCell(shellIndex, SPECIES.FIREWORK, FIREWORK_SHELL_BASE + 22 + ((seed + spoke) & 7));
          }
        }
      }
    }
  }

  moveFireworkParticle(index, x, y, dx, dy) {
    const candidates = [];
    if (dx !== 0 || dy !== 0) {
      candidates.push([x + dx, y + dy]);
    }
    if (dx !== 0) {
      candidates.push([x + dx, y]);
    }
    if (dy !== 0) {
      candidates.push([x, y + dy]);
    }

    for (let i = 0; i < candidates.length; i += 1) {
      const nx = candidates[i][0];
      const ny = candidates[i][1];
      if (!this.inBounds(nx, ny)) {
        continue;
      }
      const targetIndex = this.index(nx, ny);
      const target = this.types[targetIndex];
      if (target === SPECIES.EMPTY || target === SPECIES.WATER) {
        if (target === SPECIES.WATER) {
          this.setCell(targetIndex, SPECIES.EMPTY, 0);
        }
        this.moveCell(index, targetIndex);
        return targetIndex;
      }
    }

    return -1;
  }

  updateFirework(index, x, y) {
    const state = this.data[index];

    if (state >= FIREWORK_ROCKET_BASE) {
      const fuel = state - FIREWORK_ROCKET_BASE;
      if (fuel <= 1 || y <= 8) {
        this.setCell(index, SPECIES.EMPTY, 0);
        this.spawnFireworkBurst(x, y, state, false);
        this.mark(index);
        return;
      }

      if ((this.frame % 3) !== 0) {
        this.queueCellActivity(index, 3);
        this.mark(index);
        return;
      }

      const movedIndex = this.moveFireworkParticle(index, x, y, 0, -1);
      if (movedIndex >= 0) {
        this.data[movedIndex] = state - 1;
        return;
      }

      this.setCell(index, SPECIES.EMPTY, 0);
      this.spawnFireworkBurst(x, y, state, false);
      this.mark(index);
      return;
    }

    if (state >= FIREWORK_SHELL_BASE) {
      const timer = state - FIREWORK_SHELL_BASE;
      if (timer <= 1) {
        this.setCell(index, SPECIES.EMPTY, 0);
        this.spawnFireworkBurst(x, y, state, true);
        this.mark(index);
        return;
      }

      if ((this.frame & 1) === 0) {
        this.data[index] = state - 1;
      }
      this.queueCellActivity(index, 6);
      this.mark(index);
      return;
    }

    const directionIndex = (state >> 4) & FIREWORK_SPARK_MASK;
    const life = state & FIREWORK_SPARK_MASK;
    if (life <= 1) {
      this.setCell(index, SPECIES.EMPTY, 0);
      this.mark(index);
      return;
    }

    const decayStep = life > 10 ? 3 : 2;
    if ((this.frame % decayStep) !== 0) {
      this.queueCellActivity(index, 4);
      this.mark(index);
      return;
    }

    const [vx, vy] = FIREWORK_DIRECTIONS[directionIndex];
    const moveX = vx === 0 ? 0 : (Math.abs(vx) === 3 ? Math.sign(vx) : (((this.frame + x + directionIndex) & 1) === 0 ? Math.sign(vx) : 0));
    const moveY = (vy === 0 ? 0 : (Math.abs(vy) === 3 ? Math.sign(vy) : (((this.frame + y + directionIndex) & 1) === 0 ? Math.sign(vy) : 0))) + (life < 5 ? 1 : 0);
    const movedIndex = this.moveFireworkParticle(index, x, y, moveX, moveY);
    const nextState = this.encodeFireworkSpark(directionIndex, life - 1);
    if (movedIndex >= 0) {
      if (life <= 3 && ((this.frame + directionIndex + x + y) & 1) === 0) {
        this.setCell(movedIndex, SPECIES.EMPTY, 0);
        return;
      }
      this.data[movedIndex] = nextState;
      return;
    }

    if (life <= 3) {
      this.setCell(index, SPECIES.EMPTY, 0);
      this.mark(index);
      return;
    }

    this.data[index] = nextState;
    this.queueCellActivity(index, 4);
    this.mark(index);
  }

  updateBlackHole(index, x, y) {
    const radius = 44;
    const radiusSqMax = radius * radius;
    const coreSq = 9;
    let consumed = 0;
    const phase = this.data[index] & 7;

    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (dx === 0 && dy === 0) {
          continue;
        }

        const nx = x + dx;
        const ny = y + dy;
        if (!this.inBounds(nx, ny)) {
          continue;
        }

        const distSq = dx * dx + dy * dy;
        if (distSq > radiusSqMax) {
          continue;
        }

        const targetIndex = this.index(nx, ny);
        const target = this.types[targetIndex];
        if (target === SPECIES.EMPTY || target === SPECIES.BLACK_HOLE) {
          continue;
        }

        if (distSq <= coreSq) {
          if (((this.frame + phase + nx * 7 + ny * 11 + distSq) % 10) === 0) {
            this.forceClearCell(targetIndex);
            consumed += 1;
          }
          continue;
        }

        const distanceBand = Math.max(1, Math.ceil(Math.sqrt(distSq)));
        const normalized = distanceBand / radius;
        const cadence = Math.max(4, Math.floor(6 + normalized * normalized * 24));
        if (((this.frame + phase + nx * 3 + ny * 5) % cadence) !== 0) {
          continue;
        }

        const inwardX = dx === 0 ? 0 : -Math.sign(dx);
        const inwardY = dy === 0 ? 0 : -Math.sign(dy);
        const tangentX = dy === 0 ? 0 : Math.sign(dy);
        const tangentY = dx === 0 ? 0 : -Math.sign(dx);
        const inwardBias = normalized < 0.28 ? 4 : normalized < 0.62 ? 2 : 1;
        const swirlFirst = ((this.frame + phase + distanceBand) % (inwardBias + 1)) !== 0;
        const candidates = swirlFirst
          ? [
              [nx + tangentX, ny + tangentY],
              [nx + tangentX + inwardX, ny + tangentY + inwardY],
              [nx + inwardX, ny + inwardY],
            ]
          : [
              [nx + inwardX, ny + inwardY],
              [nx + tangentX + inwardX, ny + tangentY + inwardY],
              [nx + tangentX, ny + tangentY],
            ];

        for (let i = 0; i < candidates.length; i += 1) {
          const destX = candidates[i][0];
          const destY = candidates[i][1];
          if (!this.inBounds(destX, destY)) {
            continue;
          }

          const destIndex = this.index(destX, destY);
          const occupant = this.types[destIndex];
          if (occupant === SPECIES.EMPTY || occupant === SPECIES.WATER) {
            if (occupant === SPECIES.WATER) {
              this.forceClearCell(destIndex);
            }
            this.moveCell(targetIndex, destIndex);
            consumed += 1;
            break;
          }
        }
      }
    }

    this.data[index] = 96 + ((phase + consumed + 1) & 31);
    this.queueCellActivity(index, radius);
    this.mark(index);
  }

  sampleMetrics() {
    return { particles: this.particleCount };
  }
}

export { SPECIES, SandSimulation };
