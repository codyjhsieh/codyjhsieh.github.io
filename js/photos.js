import { SPECIES } from "./simulation";
import { PHOTO_STAMP_DATA } from "./photoStamps.generated";
import { markResumePixel } from "./resumePixels";

let photoStampCache = null;

function packColor(r, g, b, a = 255) {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

function decodePhotoStamp(data) {
  const rgb = atob(data.rgb);
  const colors = new Uint32Array(data.size * data.size);
  for (let index = 0; index < colors.length; index += 1) {
    const offset = index * 3;
    colors[index] = packColor(
      rgb.charCodeAt(offset),
      rgb.charCodeAt(offset + 1),
      rgb.charCodeAt(offset + 2),
      255,
    );
  }

  return { size: data.size, colors };
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

function applyPhotoStamp(simulation, photoStamp, centerX, centerY, scale = 1) {
  if (!photoStamp) {
    return;
  }

  const { stamp } = photoStamp;
  const stampScale = Math.max(0.1, scale);
  const scaledSize = Math.max(1, Math.round(stamp.size * stampScale));
  const half = Math.floor(scaledSize / 2);

  if (stamp.colors) {
    for (let sy = 0; sy < scaledSize; sy += 1) {
      const y = centerY + sy - half;
      if (y < 0 || y >= simulation.height) {
        continue;
      }
      const sourceY = Math.min(stamp.size - 1, Math.floor(sy / stampScale));
      for (let sx = 0; sx < scaledSize; sx += 1) {
        const sourceX = Math.min(stamp.size - 1, Math.floor(sx / stampScale));
        const color = stamp.colors[sourceX + sourceY * stamp.size];
        if (!color) {
          continue;
        }
        const x = centerX + sx - half;
        if (x < 0 || x >= simulation.width) {
          continue;
        }
        const index = simulation.index(x, y);
        simulation.setPhotoCell(index, color);
      }
    }
    return;
  }

  for (const pixel of stamp.pixels) {
    const x = centerX + pixel.x - half;
    const y = centerY + pixel.y - half;
    if (x < 0 || x >= simulation.width || y < 0 || y >= simulation.height) {
      continue;
    }
    const index = simulation.index(x, y);
    simulation.setPhotoCell(index, pixel.color);
  }
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

export { applyPhotoStamp, applyResumeStamp, loadPhotoStamps };
