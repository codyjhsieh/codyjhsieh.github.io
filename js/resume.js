import * as wasm from "../crate/pkg/sandtable_bg.wasm";
import { Species } from "../crate/pkg/sandtable";

const memory = wasm.memory;

function writeCell(cells, width, height, x, y, species, ra = 120) {
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return;
  }

  const index = (x + y * width) * 4;
  cells[index] = species;
  cells[index + 1] = ra;
  cells[index + 2] = 0;
  cells[index + 3] = 0;
}

function dropResumeIntoUniverse(universe, width, height) {
  const cells = new Uint8Array(memory.buffer, universe.cells(), width * height * 4);
  const docWidth = 28;
  const docHeight = 40;
  const anchorX = Math.floor(width * 0.72);
  const anchorY = Math.floor(height * 0.22);

  universe.push_undo();

  for (let localY = 0; localY < docHeight; localY += 1) {
    const skew = Math.floor((localY - docHeight / 2) / 8);

    for (let localX = 0; localX < docWidth; localX += 1) {
      const worldX = anchorX + localX - Math.floor(docWidth / 2) + skew;
      const worldY = anchorY + localY - Math.floor(docHeight / 2);
      const border =
        localX === 0 ||
        localY === 0 ||
        localX === docWidth - 1 ||
        localY === docHeight - 1;
      const topBand = localY < 6 && localX > 4 && localX < docWidth - 5;
      const textBand =
        localY > 9 &&
        localY < docHeight - 5 &&
        localX > 4 &&
        localX < docWidth - 4 &&
        localY % 5 < 1;
      const sideRule =
        localX > docWidth - 7 &&
        localX < docWidth - 5 &&
        localY > 8 &&
        localY < docHeight - 6;

      let species = Species.Wall;
      let ra = 120;

      if (border) {
        species = Species.Stone;
        ra = 95;
      } else if (topBand) {
        species = Species.Wood;
        ra = 110;
      } else if (sideRule) {
        species = Species.Plant;
        ra = 118;
      } else if (textBand) {
        species = (localY / 8) % 2 === 0 ? Species.Dust : Species.Sand;
        ra = 128;
      }

      writeCell(cells, width, height, worldX, worldY, species, ra);
    }
  }

  for (let i = 0; i < 3; i += 1) {
    universe.paint(anchorX - 14 + i * 4, anchorY - 28 + i, 3, Species.Sand);
  }
}

function initResumeViewer({ universe, width, height }) {
  const trigger = document.getElementById("resume-trigger");

  if (!trigger) {
    return;
  }

  trigger.addEventListener("click", () => {
    dropResumeIntoUniverse(universe, width, height);
  });
}

export { initResumeViewer };
