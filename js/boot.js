import { Species } from "../crate/pkg/sandtable";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function seedScene(width, height) {
  const floorY = height - 22;

  window.u.paint(width / 2, floorY + 14, width - 18, Species.Stone);
  window.u.paint(width / 2, floorY + 10, width - 34, Species.Empty);

  for (let x = 20; x <= width - 20; x += 12) {
    window.u.paint(
      x,
      floorY - 5 + Math.sin(x / 21) * 6,
      10 + (x % 9),
      Species.Sand,
    );
    if (window.stopboot) {
      return;
    }
    await sleep(12);
  }

  for (let x = 40; x <= width - 40; x += 36) {
    const wave = Math.sin(x / 17) * 14;
    window.u.paint(x, height / 2 + wave, 6, Species.Water);
    if (x % 72 === 0) {
      window.u.paint(x + 8, height / 2 - 32 + wave, 5, Species.Seed);
    }
    if (window.stopboot) {
      return;
    }
    await sleep(18);
  }

  window.u.paint(width * 0.2, height * 0.33, 18, Species.Wood);
  window.u.paint(width * 0.8, height * 0.3, 18, Species.Stone);
}

export { seedScene, sleep };
