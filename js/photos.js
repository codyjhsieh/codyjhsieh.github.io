import { SPECIES } from "./simulation.js";
import { PHOTO_STAMP_DATA } from "./photoStamps.generated.js";
import { markResumePixel } from "./resumePixels.js";

let photoStampCache = null;

function packColor(r, g, b, a = 255) {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

function decodePhotoStamp(data) {
  const rgb = atob(data.rgb);
  const width = data.width ?? data.size;
  const height = data.height ?? data.size;
  const colors = new Uint32Array(width * height);
  for (let index = 0; index < colors.length; index += 1) {
    const offset = index * 3;
    colors[index] = packColor(
      rgb.charCodeAt(offset),
      rgb.charCodeAt(offset + 1),
      rgb.charCodeAt(offset + 2),
      255,
    );
  }

  return { size: Math.max(width, height), width, height, colors };
}

async function loadPhotoStamps() {
  if (!photoStampCache) {
    photoStampCache = PHOTO_STAMP_DATA.map((data) => ({
      src: data.src,
      label: data.label,
      stamp: decodePhotoStamp(data),
    }));
  }

  return photoStampCache;
}

function forEachPhotoStampCell(simulation, photoStamp, centerX, centerY, visitor) {
  if (!photoStamp || typeof visitor !== "function") {
    return;
  }

  const { stamp } = photoStamp;
  const width = stamp.width ?? stamp.size;
  const height = stamp.height ?? stamp.size;
  const halfW = Math.floor(width / 2);
  const halfH = Math.floor(height / 2);

  if (stamp.colors) {
    for (let sy = 0; sy < height; sy += 1) {
      const y = centerY + sy - halfH;
      if (y < 0 || y >= simulation.height) {
        continue;
      }
      for (let sx = 0; sx < width; sx += 1) {
        const color = stamp.colors[sx + sy * width];
        if (!color) {
          continue;
        }
        const x = centerX + sx - halfW;
        if (x < 0 || x >= simulation.width) {
          continue;
        }
        visitor(simulation.index(x, y), color);
      }
    }
    return;
  }

  for (const pixel of stamp.pixels) {
    const x = centerX + pixel.x - halfW;
    const y = centerY + pixel.y - halfH;
    if (x < 0 || x >= simulation.width || y < 0 || y >= simulation.height) {
      continue;
    }
    visitor(simulation.index(x, y), pixel.color);
  }
}

function applyPhotoStamp(simulation, photoStamp, centerX, centerY) {
  forEachPhotoStampCell(simulation, photoStamp, centerX, centerY, (index, color) => {
    simulation.setPhotoCell(index, color);
  });
}

function collectPhotoStampCells(simulation, photoStamp, centerX, centerY) {
  const cells = [];
  forEachPhotoStampCell(simulation, photoStamp, centerX, centerY, (index, color) => {
    cells.push({ index, color });
  });
  return cells;
}

function createResumeStamp() {
  const w = 40;
  const h = 52;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  // Paper background
  ctx.fillStyle = "#f5efe6";
  ctx.fillRect(0, 0, w, h);

  // Folded corner
  ctx.fillStyle = "#e0d8cc";
  ctx.beginPath();
  ctx.moveTo(w - 8, 0);
  ctx.lineTo(w, 8);
  ctx.lineTo(w - 8, 8);
  ctx.closePath();
  ctx.fill();

  // Simulated text lines
  ctx.fillStyle = "#9a8e7e";
  for (let line = 0; line < 10; line++) {
    const ly = 12 + line * 4;
    const lw = line === 0 ? 18 : line === 1 ? 14 : 6 + Math.random() * 22;
    ctx.fillRect(4, ly, Math.min(lw, w - 8), 2);
  }

  // "RESUME" label
  ctx.fillStyle = "#6b5e4f";
  ctx.font = "bold 6px monospace";
  ctx.textAlign = "center";
  ctx.fillText("RESUME", w / 2, 8);

  // Border
  ctx.strokeStyle = "#c8bfb0";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

  const { data } = ctx.getImageData(0, 0, w, h);
  const pixels = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (x + y * w) * 4;
      if (data[i + 3] < 72) continue;
      pixels.push({
        x,
        y,
        species: SPECIES.PHOTO,
        color: packColor(data[i], data[i + 1], data[i + 2], 255),
      });
    }
  }

  return { size: Math.max(w, h), width: w, height: h, pixels };
}

function applyResumeStamp(simulation, centerX, centerY) {
  const stamp = createResumeStamp();
  const halfW = Math.floor(stamp.width / 2);
  const halfH = Math.floor(stamp.height / 2);
  const indices = new Set();

  for (const pixel of stamp.pixels) {
    const x = centerX + pixel.x - halfW;
    const y = centerY + pixel.y - halfH;
    if (x < 0 || x >= simulation.width || y < 0 || y >= simulation.height) continue;
    const index = simulation.index(x, y);
    simulation.setPhotoCell(index, pixel.color);
    markResumePixel(simulation, index);
    indices.add(index);
  }

  return indices;
}

export { applyPhotoStamp, applyResumeStamp, collectPhotoStampCells, loadPhotoStamps };
