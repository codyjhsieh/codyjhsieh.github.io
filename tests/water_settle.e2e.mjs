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

function snapshotWater(sim) {
  const positions = new Set();
  for (let i = 0; i < sim.size; i++) {
    if (sim.types[i] === SPECIES.WATER) positions.add(i);
  }
  return positions;
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

// Test: dunes scene water should settle and stop flickering
const sim = new SandSimulation(160, 120);
sim.seed("dunes");

const initialWater = snapshotWater(sim).size;
console.log(`Initial water cells: ${initialWater}`);

// Let water fall and pool (generous settling time)
for (let i = 0; i < 1200; i++) sim.tick(1);

// Check water is conserved
const afterSettle = snapshotWater(sim);
assert.equal(afterSettle.size, initialWater, `water conserved after settling: ${initialWater} -> ${afterSettle.size}`);

// Now check for flickering: run 20 more ticks and see if water positions stabilize
let flickerCount = 0;
let prev = afterSettle;
for (let i = 0; i < 20; i++) {
  sim.tick(1);
  const current = snapshotWater(sim);
  if (!setsEqual(prev, current)) {
    flickerCount++;
    if (flickerCount === 1) {
      for (const v of current) {
        if (!prev.has(v)) {
          const fx = v % sim.width, fy = Math.floor(v / sim.width);
          console.log(`  appeared: (${fx}, ${fy})`);
        }
      }
      for (const v of prev) {
        if (!current.has(v)) {
          const fx = v % sim.width, fy = Math.floor(v / sim.width);
          console.log(`  removed:  (${fx}, ${fy})`);
        }
      }
    }
  }
  prev = current;
}

console.log(`Flicker ticks (out of 20): ${flickerCount}`);

// Water should be mostly settled — allow at most 4 out of 20 ticks with movement
// (some residual settling is ok, but constant flickering every tick is not)
assert.ok(flickerCount <= 4, `water is flickering: ${flickerCount}/20 ticks had movement`);

console.log("PASS dunes water settles without persistent flickering");
