import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function loadSimulationModule() {
  const simulationPath = path.resolve("js/simulation.js");
  const source = await fs.readFile(simulationPath, "utf8");
  const encoded = Buffer.from(source, "utf8").toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

function findCellsOfType(simulation, type) {
  const cells = [];
  for (let index = 0; index < simulation.size; index += 1) {
    if (simulation.types[index] !== type) {
      continue;
    }
    cells.push({
      index,
      x: index % simulation.width,
      y: Math.floor(index / simulation.width),
      data: simulation.data[index],
    });
  }
  return cells;
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

const { SandSimulation, SPECIES } = await loadSimulationModule();

runTest("rocket stays a single vertically moving pixel before burst", () => {
  const simulation = new SandSimulation(80, 120);
  const startX = 40;
  const startY = 100;
  const startIndex = simulation.index(startX, startY);

  simulation.setCell(startIndex, SPECIES.FIREWORK, simulation.seedDataFor(SPECIES.FIREWORK, startX, startY));

  let lastY = startY;
  let burstFrame = -1;

  for (let frame = 1; frame <= 220; frame += 1) {
    simulation.tick(1);
    const fireworks = findCellsOfType(simulation, SPECIES.FIREWORK);

    if (fireworks.length > 1) {
      burstFrame = frame;
      break;
    }

    assert.equal(fireworks.length, 1, "expected a single firework pixel during ascent");
    assert.equal(fireworks[0].x, startX, "rocket drifted horizontally before bursting");
    assert.ok(fireworks[0].y <= lastY, "rocket moved downward before bursting");
    lastY = fireworks[0].y;
  }

  assert.ok(burstFrame >= 150 && burstFrame <= 190, `expected burst near 3 seconds, got frame ${burstFrame}`);
});

runTest("burst produces multi-stage shells without converting into fire", () => {
  const simulation = new SandSimulation(120, 140);
  const startX = 60;
  const startY = 112;
  simulation.setCell(
    simulation.index(startX, startY),
    SPECIES.FIREWORK,
    simulation.seedDataFor(SPECIES.FIREWORK, startX, startY),
  );

  let sawPrimaryBurst = false;
  let sawSecondaryShell = false;

  for (let frame = 1; frame <= 320; frame += 1) {
    simulation.tick(1);
    const fireworks = findCellsOfType(simulation, SPECIES.FIREWORK);
    const fires = findCellsOfType(simulation, SPECIES.FIRE);

    assert.equal(fires.length, 0, "firework lifecycle should not create FIRE cells");

    if (fireworks.length > 1) {
      sawPrimaryBurst = true;
    }

    if (fireworks.some((cell) => cell.data >= 128 && cell.data < 192)) {
      sawSecondaryShell = true;
    }

    if (sawPrimaryBurst && sawSecondaryShell) {
      return;
    }
  }

  assert.ok(sawPrimaryBurst, "expected primary burst to occur");
  assert.ok(sawSecondaryShell, "expected delayed secondary shell stage to occur");
});

runTest("full firework lifecycle disperses and dies within eight seconds", () => {
  const simulation = new SandSimulation(120, 140);
  const startX = 60;
  const startY = 112;
  simulation.setCell(
    simulation.index(startX, startY),
    SPECIES.FIREWORK,
    simulation.seedDataFor(SPECIES.FIREWORK, startX, startY),
  );

  let sawSpread = false;

  for (let frame = 1; frame <= 480; frame += 1) {
    simulation.tick(1);
    const fireworks = findCellsOfType(simulation, SPECIES.FIREWORK);

    if (fireworks.length > 4) {
      const xs = fireworks.map((cell) => cell.x);
      const ys = fireworks.map((cell) => cell.y);
      const spanX = Math.max(...xs) - Math.min(...xs);
      const spanY = Math.max(...ys) - Math.min(...ys);
      if (spanX >= 4 || spanY >= 4) {
        sawSpread = true;
      }
    }

    if (frame === 480) {
      assert.equal(fireworks.length, 0, "firework should be fully extinguished by eight seconds");
    }
  }

  assert.ok(sawSpread, "expected sparks to disperse after bursting");
});
