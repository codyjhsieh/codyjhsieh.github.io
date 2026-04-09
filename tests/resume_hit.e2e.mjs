import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

async function loadModule(filePath) {
  const source = await fs.readFile(path.resolve(filePath), "utf8");
  const encoded = Buffer.from(source, "utf8").toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

const { SandSimulation, SPECIES } = await loadModule("js/simulation.js");
const { isVisibleResumePixel, markResumePixel } = await loadModule("js/resumePixels.js");

function setResumePixel(simulation, index, color = 0xffd8c0a0) {
  simulation.setPhotoCell(index, color);
  markResumePixel(simulation, index);
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

runTest("visible resume pixel is clickable", () => {
  const simulation = new SandSimulation(8, 8);
  const index = simulation.index(3, 3);
  setResumePixel(simulation, index);
  assert.equal(isVisibleResumePixel(simulation, index), true);
});

runTest("unmarked photo pixel is not clickable", () => {
  const simulation = new SandSimulation(8, 8);
  const index = simulation.index(3, 3);
  simulation.setPhotoCell(index, 0xffd8c0a0);
  assert.equal(isVisibleResumePixel(simulation, index), false);
});

runTest("cleared resume pixel is not clickable", () => {
  const simulation = new SandSimulation(8, 8);
  const index = simulation.index(3, 3);
  setResumePixel(simulation, index);
  simulation.forceClearCell(index);
  assert.equal(isVisibleResumePixel(simulation, index), false);
});

runTest("burned resume pixel is not clickable", () => {
  const simulation = new SandSimulation(8, 8);
  const index = simulation.index(3, 3);
  setResumePixel(simulation, index);
  simulation.setCell(index, SPECIES.FIRE, 30);
  assert.equal(isVisibleResumePixel(simulation, index), false);
});

runTest("overwritten resume pixel is not clickable", () => {
  const simulation = new SandSimulation(8, 8);
  const index = simulation.index(3, 3);
  setResumePixel(simulation, index);
  simulation.setPhotoCell(index, 0xff0000ff);
  assert.equal(isVisibleResumePixel(simulation, index), false);
});

runTest("moved resume pixel remains clickable only at its visible location", () => {
  const simulation = new SandSimulation(8, 8);
  const from = simulation.index(3, 3);
  const to = simulation.index(4, 3);
  setResumePixel(simulation, from);
  simulation.moveCell(from, to);
  assert.equal(isVisibleResumePixel(simulation, from), false);
  assert.equal(isVisibleResumePixel(simulation, to), true);
});
