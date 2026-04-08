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
  const stamps = await Promise.all(
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

export { applyPhotoStamp, loadPhotoStamps };
