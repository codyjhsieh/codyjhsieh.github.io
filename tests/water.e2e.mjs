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

/* ── helpers ─────────────────────────────────────────────── */

function countType(sim, type) {
  let n = 0;
  for (let i = 0; i < sim.size; i++) if (sim.types[i] === type) n++;
  return n;
}

function waterHeights(sim) {
  const h = new Array(sim.width).fill(0);
  for (let x = 0; x < sim.width; x++)
    for (let y = 0; y < sim.height; y++)
      if (sim.types[sim.index(x, y)] === SPECIES.WATER) h[x]++;
  return h;
}

function heightSpread(sim) {
  const h = waterHeights(sim);
  const nonZero = h.filter((v) => v > 0);
  if (!nonZero.length) return { max: 0, min: 0, diff: 0 };
  const max = Math.max(...nonZero);
  const min = Math.min(...nonZero);
  return { max, min, diff: max - min };
}

function buildBox(sim, x0, y0, x1, y1) {
  for (let x = x0; x <= x1; x++) {
    sim.setLockedCell(sim.index(x, y0), SPECIES.STONE);
    sim.setLockedCell(sim.index(x, y1), SPECIES.STONE);
  }
  for (let y = y0; y <= y1; y++) {
    sim.setLockedCell(sim.index(x0, y), SPECIES.STONE);
    sim.setLockedCell(sim.index(x1, y), SPECIES.STONE);
  }
}

function tick(sim, n) {
  for (let i = 0; i < n; i++) sim.tick(1);
}

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (e) {
    console.error(`FAIL ${name}`);
    throw e;
  }
}

/* ── tests ───────────────────────────────────────────────── */

runTest("single drop falls to ground", () => {
  const sim = new SandSimulation(10, 20);
  // stone floor
  for (let x = 0; x < 10; x++) sim.setLockedCell(sim.index(x, 19), SPECIES.STONE);
  sim.setCell(sim.index(5, 0), SPECIES.WATER, 0);
  tick(sim, 60);
  // water should be on the floor row (y=18), at some x position
  assert.equal(countType(sim, SPECIES.WATER), 1, "no water created or destroyed");
  let onFloor = false;
  for (let x = 0; x < 10; x++) {
    if (sim.types[sim.index(x, 18)] === SPECIES.WATER) onFloor = true;
  }
  assert.ok(onFloor, "drop should rest on floor (y=18)");
});

runTest("water conserved during free-fall", () => {
  const sim = new SandSimulation(20, 40);
  for (let x = 0; x < 20; x++) sim.setLockedCell(sim.index(x, 39), SPECIES.STONE);
  // column of 10 water cells
  for (let y = 0; y < 10; y++) sim.setCell(sim.index(10, y), SPECIES.WATER, 0);
  const before = countType(sim, SPECIES.WATER);
  tick(sim, 120);
  assert.equal(countType(sim, SPECIES.WATER), before, "water count must not change during fall");
});

runTest("water fills a flat container evenly", () => {
  // 20-wide stone box, pour 30 water cells in the center
  const sim = new SandSimulation(22, 20);
  buildBox(sim, 0, 14, 21, 19);
  for (let y = 5; y < 11; y++)
    for (let x = 9; x <= 12; x++)
      sim.setCell(sim.index(x, y), SPECIES.WATER, 0);
  const before = countType(sim, SPECIES.WATER);
  tick(sim, 600);
  const after = countType(sim, SPECIES.WATER);
  assert.equal(after, before, "water conserved in container");
  const { diff } = heightSpread(sim);
  assert.ok(diff <= 1, `container water should be flat, diff=${diff}`);
});

runTest("pyramid on flat pool flattens", () => {
  const W = 40, H = 30;
  const sim = new SandSimulation(W, H);
  for (let x = 0; x < W; x++) sim.setLockedCell(sim.index(x, H - 1), SPECIES.STONE);
  const poolY = H - 2;
  for (let x = 0; x < W; x++) sim.setCell(sim.index(x, poolY), SPECIES.WATER, 0);
  const cx = W / 2, pyramidH = 6;
  for (let layer = 0; layer < pyramidH; layer++) {
    const y = poolY - 1 - layer;
    const half = pyramidH - layer;
    for (let dx = -half; dx <= half; dx++) {
      const x = cx + dx;
      if (x >= 0 && x < W) sim.setCell(sim.index(x, y), SPECIES.WATER, 0);
    }
  }
  const before = countType(sim, SPECIES.WATER);
  tick(sim, 300);
  assert.equal(countType(sim, SPECIES.WATER), before, "water conserved");
  const { diff } = heightSpread(sim);
  assert.ok(diff <= 1, `pyramid should flatten, diff=${diff}`);
});

runTest("water flows around an obstacle", () => {
  // flat floor with a short pillar in the middle; pour enough water to overflow
  const sim = new SandSimulation(30, 20);
  for (let x = 0; x < 30; x++) sim.setLockedCell(sim.index(x, 19), SPECIES.STONE);
  // short pillar at x=15, only 2 cells high
  sim.setLockedCell(sim.index(15, 17), SPECIES.STONE);
  sim.setLockedCell(sim.index(15, 18), SPECIES.STONE);
  // pour 50 water cells on the left side (enough to overflow a 2-high pillar in 15 cols)
  for (let y = 5; y < 15; y++)
    for (let x = 5; x < 10; x++)
      sim.setCell(sim.index(x, y), SPECIES.WATER, 0);
  tick(sim, 600);
  // water should exist on both sides of the pillar
  let leftWater = 0, rightWater = 0;
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 15; x++) if (sim.types[sim.index(x, y)] === SPECIES.WATER) leftWater++;
    for (let x = 16; x < 30; x++) if (sim.types[sim.index(x, y)] === SPECIES.WATER) rightWater++;
  }
  assert.ok(rightWater > 0, "water should flow past obstacle to the right side");
  assert.ok(leftWater > 0, "water should remain on the left side too");
});

runTest("water extinguishes fire", () => {
  const sim = new SandSimulation(10, 10);
  for (let x = 0; x < 10; x++) sim.setLockedCell(sim.index(x, 9), SPECIES.STONE);
  // fire on the floor
  sim.setCell(sim.index(5, 8), SPECIES.FIRE, 40);
  // water above
  sim.setCell(sim.index(5, 4), SPECIES.WATER, 0);
  tick(sim, 30);
  // fire should be gone, water should be on the floor
  assert.equal(countType(sim, SPECIES.FIRE), 0, "fire should be extinguished");
  assert.equal(countType(sim, SPECIES.WATER), 1, "water should survive");
});

runTest("water displaced by sand (sand sinks through water)", () => {
  const sim = new SandSimulation(10, 20);
  for (let x = 0; x < 10; x++) sim.setLockedCell(sim.index(x, 19), SPECIES.STONE);
  // pool of water
  for (let x = 2; x < 8; x++)
    for (let y = 16; y < 19; y++)
      sim.setCell(sim.index(x, y), SPECIES.WATER, 0);
  const waterBefore = countType(sim, SPECIES.WATER);
  // drop sand into pool
  sim.setCell(sim.index(5, 10), SPECIES.SAND, 0);
  tick(sim, 60);
  // sand should be at the bottom, water conserved
  assert.equal(countType(sim, SPECIES.WATER), waterBefore, "water conserved when sand enters");
  assert.equal(sim.types[sim.index(5, 18)], SPECIES.SAND, "sand should sink to bottom");
});

runTest("water spreads horizontally on flat ground", () => {
  const sim = new SandSimulation(40, 10);
  for (let x = 0; x < 40; x++) sim.setLockedCell(sim.index(x, 9), SPECIES.STONE);
  // column of 8 water cells in the center
  for (let y = 0; y < 8; y++) sim.setCell(sim.index(20, y), SPECIES.WATER, 0);
  const before = countType(sim, SPECIES.WATER);
  tick(sim, 200);
  assert.equal(countType(sim, SPECIES.WATER), before, "water conserved");
  // water should settle on the floor as a horizontal line wider than 1
  let minX = 40, maxX = 0;
  for (let x = 0; x < 40; x++) {
    if (sim.types[sim.index(x, 8)] === SPECIES.WATER) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
  }
  const spread = maxX - minX + 1;
  assert.ok(spread >= before, `water should spread to at least ${before} cells wide, got ${spread}`);
});

runTest("water in a U-shaped vessel equalizes", () => {
  // Two chambers connected at the bottom
  const sim = new SandSimulation(30, 20);
  // floor
  for (let x = 0; x < 30; x++) sim.setLockedCell(sim.index(x, 19), SPECIES.STONE);
  // left wall
  for (let y = 10; y < 19; y++) sim.setLockedCell(sim.index(0, y), SPECIES.STONE);
  // right wall
  for (let y = 10; y < 19; y++) sim.setLockedCell(sim.index(29, y), SPECIES.STONE);
  // center divider with a 3-cell gap at the bottom
  for (let y = 10; y < 16; y++) sim.setLockedCell(sim.index(15, y), SPECIES.STONE);
  // pour water only into left chamber
  for (let y = 12; y < 19; y++)
    for (let x = 1; x < 15; x++)
      sim.setCell(sim.index(x, y), SPECIES.WATER, 0);
  const before = countType(sim, SPECIES.WATER);
  tick(sim, 1200);
  assert.equal(countType(sim, SPECIES.WATER), before, "water conserved");
  // count water in each chamber
  let leftH = 0, rightH = 0;
  for (let y = 0; y < 19; y++) {
    for (let x = 1; x < 15; x++) if (sim.types[sim.index(x, y)] === SPECIES.WATER) leftH++;
    for (let x = 16; x < 29; x++) if (sim.types[sim.index(x, y)] === SPECIES.WATER) rightH++;
  }
  // both sides should have water
  assert.ok(rightH > 0, "water should flow to right chamber through bottom gap");
  // approximate equalization — right chamber is wider (13 vs 14 cols) so allow some imbalance
  const ratio = leftH / (leftH + rightH);
  assert.ok(ratio > 0.3 && ratio < 0.7, `chambers should roughly equalize: left=${leftH} right=${rightH} ratio=${ratio.toFixed(2)}`);
});

runTest("large water body conserved over many ticks", () => {
  const sim = new SandSimulation(60, 30);
  for (let x = 0; x < 60; x++) sim.setLockedCell(sim.index(x, 29), SPECIES.STONE);
  // big blob of water
  for (let y = 5; y < 20; y++)
    for (let x = 10; x < 50; x++)
      sim.setCell(sim.index(x, y), SPECIES.WATER, 0);
  const before = countType(sim, SPECIES.WATER);
  tick(sim, 400);
  const after = countType(sim, SPECIES.WATER);
  assert.equal(after, before, `water must be conserved: ${before} -> ${after}`);
});

runTest("water does not pass through stone walls", () => {
  const sim = new SandSimulation(20, 20);
  // sealed stone box on the left
  buildBox(sim, 2, 10, 9, 19);
  // floor on the right
  for (let x = 10; x < 20; x++) sim.setLockedCell(sim.index(x, 19), SPECIES.STONE);
  // water on the right side
  for (let y = 14; y < 19; y++)
    for (let x = 12; x < 18; x++)
      sim.setCell(sim.index(x, y), SPECIES.WATER, 0);
  tick(sim, 300);
  // no water should be inside the sealed box
  let insideWater = 0;
  for (let y = 11; y < 19; y++)
    for (let x = 3; x < 9; x++)
      if (sim.types[sim.index(x, y)] === SPECIES.WATER) insideWater++;
  assert.equal(insideWater, 0, "water must not leak through stone walls");
});
