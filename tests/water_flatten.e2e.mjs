import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

async function loadSimulationModule() {
  const simulationPath = path.resolve("js/simulation.js");
  const source = await fs.readFile(simulationPath, "utf8");
  const encoded = Buffer.from(source, "utf8").toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

const { SandSimulation, SPECIES } = await loadSimulationModule();

function getWaterHeightProfile(simulation) {
  const heights = new Array(simulation.width).fill(0);
  for (let x = 0; x < simulation.width; x += 1) {
    for (let y = 0; y < simulation.height; y += 1) {
      if (simulation.types[simulation.index(x, y)] === SPECIES.WATER) {
        heights[x] += 1;
      }
    }
  }
  return heights;
}

// Test: a pyramid of water on a flat pool should flatten
const W = 40;
const H = 30;
const sim = new SandSimulation(W, H);

for (let x = 0; x < W; x += 1) {
  sim.setLockedCell(sim.index(x, H - 1), SPECIES.STONE);
}

const poolY = H - 2;
for (let x = 0; x < W; x += 1) {
  sim.setCell(sim.index(x, poolY), SPECIES.WATER, 0);
}

const cx = W / 2;
const pyramidHeight = 6;
for (let layer = 0; layer < pyramidHeight; layer += 1) {
  const y = poolY - 1 - layer;
  const halfWidth = pyramidHeight - layer;
  for (let dx = -halfWidth; dx <= halfWidth; dx += 1) {
    const x = cx + dx;
    if (x >= 0 && x < W) {
      sim.setCell(sim.index(x, y), SPECIES.WATER, 0);
    }
  }
}

let totalWater = 0;
for (let i = 0; i < sim.size; i += 1) {
  if (sim.types[i] === SPECIES.WATER) totalWater += 1;
}

for (let tick = 0; tick < 300; tick += 1) {
  sim.tick(1);
}

const finalProfile = getWaterHeightProfile(sim);
const finalMaxHeight = Math.max(...finalProfile);
const nonZeroHeights = finalProfile.filter((h) => h > 0);
const finalMinHeight = nonZeroHeights.length > 0 ? Math.min(...nonZeroHeights) : 0;
const heightDiff = finalMaxHeight - finalMinHeight;

let finalWater = 0;
for (let i = 0; i < sim.size; i += 1) {
  if (sim.types[i] === SPECIES.WATER) finalWater += 1;
}

assert.equal(finalWater, totalWater, `Water count changed: ${totalWater} -> ${finalWater}`);
assert.ok(heightDiff <= 1, `Water didn't flatten: height difference is ${heightDiff}`);

console.log("PASS water pyramid flattens within 300 ticks");
