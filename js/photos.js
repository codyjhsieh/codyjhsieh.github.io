import { SPECIES } from "./simulation";

const PHOTO_SOURCES = [
  "/assets/images/prof.jpg",
  "/assets/images/1.jpg",
  "/assets/images/2.jpg",
  "/assets/images/3.jpg",
  "/assets/images/4.jpg",
  "/assets/images/5.jpg",
  "/assets/images/6.jpg",
  "/assets/images/7.jpg",
  "/assets/images/8.jpg",
  "/assets/images/9.jpg",
  "/assets/images/10.jpg",
  "/assets/images/1proj.jpg",
  "/assets/images/2proj.jpg",
  "/assets/images/3proj.jpg",
  "/assets/images/4proj.jpg",
  "/assets/images/blog1.jpg",
  "/assets/images/DSC00352.jpg",
  "/assets/images/DSC00359.jpg",
];

function labelFromSource(src) {
  return src.split("/").pop().replace(/\.[^.]+$/, "");
}

function packColor(r, g, b, a = 255) {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

function createPhotoStamp(image) {
  const size = 52;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const dx = (size - width) / 2;
  const dy = (size - height) / 2;

  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(image, dx, dy, width, height);

  const { data } = ctx.getImageData(0, 0, size, size);
  const pixels = [];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (x + y * size) * 4;
      if (data[i + 3] < 72) {
        continue;
      }
      pixels.push({
        x,
        y,
        species: SPECIES.PHOTO,
        color: packColor(data[i], data[i + 1], data[i + 2], 255),
      });
    }
  }

  return { size, pixels };
}

async function loadPhotoStamps() {
  const results = await Promise.allSettled(
    PHOTO_SOURCES.map(
      (src) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          image.decoding = "async";
          image.onload = () => {
            resolve({
              src,
              label: labelFromSource(src),
              stamp: createPhotoStamp(image),
            });
          };
          image.onerror = reject;
          image.src = src;
        }),
    ),
  );

  const stamps = [];
  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    if (result.status === "fulfilled") {
      stamps.push(result.value);
    } else {
      console.warn("Failed to load photo:", PHOTO_SOURCES[i], result.reason);
    }
  }

  return stamps;
}

function applyPhotoStamp(simulation, photoStamp, centerX, centerY) {
  if (!photoStamp) {
    return;
  }

  const half = Math.floor(photoStamp.stamp.size / 2);
  for (const pixel of photoStamp.stamp.pixels) {
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
    indices.add(index);
  }

  return indices;
}

export { applyPhotoStamp, applyResumeStamp, loadPhotoStamps };
