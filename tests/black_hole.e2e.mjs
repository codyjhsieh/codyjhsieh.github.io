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

function countType(simulation, type) {
  let count = 0;
  for (let i = 0; i < simulation.size; i += 1) {
    if (simulation.types[i] === type) {
      count += 1;
    }
  }
  return count;
}

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest("black hole brush paints one anchor regardless of brush radius", () => {
  const simulation = new SandSimulation(80, 80);
  simulation.paintCircle(40, 40, 18, SPECIES.BLACK_HOLE);
  assert.equal(countType(simulation, SPECIES.BLACK_HOLE), 1);
});

runTest("idle black hole does not keep the field active", () => {
  const simulation = new SandSimulation(96, 96);
  simulation.setCell(simulation.index(48, 48), SPECIES.BLACK_HOLE, 0);
  simulation.tick(1);
  assert.equal(simulation.hasActiveRegion, false);
});

runTest("nearby particles wake an idle black hole", () => {
  const simulation = new SandSimulation(96, 96);
  simulation.setCell(simulation.index(48, 48), SPECIES.BLACK_HOLE, 0);
  simulation.tick(1);
  assert.equal(simulation.hasActiveRegion, false);

  simulation.setCell(simulation.index(72, 48), SPECIES.SAND, 0);
  simulation.tick(1);
  assert.equal(simulation.hasActiveRegion, true);
});

runTest("black hole consumes and pulls nearby matter", () => {
  const simulation = new SandSimulation(96, 96);
  simulation.setCell(simulation.index(48, 48), SPECIES.BLACK_HOLE, 0);
  for (let y = 38; y <= 58; y += 1) {
    for (let x = 38; x <= 58; x += 1) {
      if (x === 48 && y === 48) {
        continue;
      }
      simulation.setCell(simulation.index(x, y), SPECIES.SAND, 0);
    }
  }

  const before = countType(simulation, SPECIES.SAND);
  for (let i = 0; i < 8; i += 1) {
    simulation.tick(1);
  }
  assert.ok(countType(simulation, SPECIES.SAND) < before, "black hole should consume nearby sand");
});
