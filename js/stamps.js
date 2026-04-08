function rgbToHsl(r, g, b) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rr:
        h = (gg - bb) / d + (gg < bb ? 6 : 0);
        break;
      case gg:
        h = (bb - rr) / d + 2;
        break;
      default:
        h = (rr - gg) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s, l };
}

function mapPixelToSpecies(r, g, b, a, Species) {
  if (a < 90) {
    return null;
  }

  const { h, s, l } = rgbToHsl(r, g, b);
  const brightness = (r + g + b) / 3;

  if (brightness < 38) {
    return Species.Stone;
  }

  if (s < 0.15 && brightness > 180) {
    return Species.Empty;
  }

  if (h >= 170 && h < 235) {
    return Species.Water;
  }

  if (h >= 65 && h < 170) {
    return l > 0.48 ? Species.Plant : Species.Seed;
  }

  if (h >= 18 && h < 64) {
    return brightness > 140 ? Species.Sand : Species.Wood;
  }

  if (h >= 235 && h < 315) {
    return brightness > 120 ? Species.Dust : Species.Oil;
  }

  if (h < 18 || h >= 315) {
    return brightness > 150 ? Species.Fire : Species.Lava;
  }

  return Species.Sand;
}

function createStampSampler(image, Species) {
  const size = 34;
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
      const species = mapPixelToSpecies(
        data[i],
        data[i + 1],
        data[i + 2],
        data[i + 3],
        Species,
      );

      if (species === null || species === Species.Empty) {
        continue;
      }

      pixels.push({
        x,
        y,
        species,
        ra: 96 + ((x * 17 + y * 13) % 80),
      });
    }
  }

  return { size, pixels };
}

async function loadStampSources(stamps, Species) {
  const loaded = await Promise.all(
    stamps.map(
      (stamp) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          image.decoding = "async";
          image.onload = () => {
            resolve({
              ...stamp,
              sampler: createStampSampler(image, Species),
            });
          };
          image.onerror = reject;
          image.src = stamp.src;
        }),
    ),
  );

  return loaded;
}

function applyStampToUniverse({ stamp, universe, x, y, width, height, memory }) {
  if (!stamp) {
    return;
  }

  const cells = new Uint8Array(memory.buffer, universe.cells(), width * height * 4);
  const half = Math.floor(stamp.sampler.size / 2);

  universe.push_undo();

  stamp.sampler.pixels.forEach((pixel) => {
    const worldX = x + pixel.x - half;
    const worldY = y + pixel.y - half;

    if (worldX < 0 || worldX >= width || worldY < 0 || worldY >= height) {
      return;
    }

    const index = (worldX + worldY * width) * 4;
    cells[index] = pixel.species;
    cells[index + 1] = pixel.ra;
    cells[index + 2] = 0;
    cells[index + 3] = 0;
  });
}

export { applyStampToUniverse, loadStampSources };
