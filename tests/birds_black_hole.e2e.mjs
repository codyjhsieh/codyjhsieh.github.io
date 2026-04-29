import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

async function loadRenderModule() {
  const simulationPath = path.resolve("js/simulation.js");
  const renderPath = path.resolve("js/render.js");
  const simulationSource = await fs.readFile(simulationPath, "utf8");
  const simulationUrl = `data:text/javascript;base64,${Buffer.from(simulationSource, "utf8").toString("base64")}`;
  const renderSource = await fs.readFile(renderPath, "utf8");
  const rewrittenRenderSource = renderSource.replace(
    'import { SPECIES } from "./simulation.js";',
    `import { SPECIES } from "${simulationUrl}";`,
  );
  const renderUrl = `data:text/javascript;base64,${Buffer.from(rewrittenRenderSource, "utf8").toString("base64")}`;
  return import(renderUrl);
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

function birdCenter(state, birdIndex) {
  const scale = BIRD_CONFIGS[birdIndex].scale ?? 1;
  const spriteWidth = Math.max(1, Math.ceil(9 * scale));
  return {
    x: state.x + spriteWidth * 0.5,
    y: state.y + 2.5 * scale,
  };
}

function drawBirds(states, frame, width = 220, height = 120) {
  const output = new Uint32Array(width * height);
  stampBirds(output, width, height, frame, states);
  return output;
}

function countNonZero(output) {
  let count = 0;
  for (let i = 0; i < output.length; i += 1) {
    if (output[i] !== 0) {
      count += 1;
    }
  }
  return count;
}

function countVisibleFragments(state) {
  if (!state.fragments || state.fragments.length === 0) {
    return 0;
  }
  let count = 0;
  for (let i = 0; i < state.fragments.length; i += 1) {
    if (!state.fragments[i].consumed) {
      count += 1;
    }
  }
  return count;
}

const {
  createBirdStates,
  collectBlackHoles,
  collectFireworks,
  updateBirdStates,
  stampBirds,
  BIRD_CONFIGS,
} = await loadRenderModule();

runTest("all painted black hole regions are tracked for bird suction", () => {
  const width = 220;
  const height = 120;
  const indices = new Set();
  for (let y = 30; y <= 36; y += 1) {
    for (let x = 36; x <= 42; x += 1) {
      indices.add(y * width + x);
    }
  }
  for (let y = 70; y <= 76; y += 1) {
    for (let x = 172; x <= 178; x += 1) {
      indices.add(y * width + x);
    }
  }

  const holes = collectBlackHoles(indices, width, height);
  assert.equal(holes.length, 2, "expected separate painted black hole regions to remain distinct");

  const states = createBirdStates(width, height, 120);
  const targetBirdIndex = 4;
  states[targetBirdIndex].x = 150;
  states[targetBirdIndex].y = 68;
  const hole = holes.find((candidate) => candidate.x > 150);
  assert.ok(hole, "expected to find the later painted black hole cluster");

  let frame = 120;
  for (let step = 0; step < 10; step += 1) {
    frame += 1;
    updateBirdStates(states, width, height, frame, holes);
  }

  assert.ok(
    states[targetBirdIndex].captured || countVisibleFragments(states[targetBirdIndex]) > 0 || states[targetBirdIndex].respawn > 0,
    "bird should respond to the later painted black hole cluster",
  );
});

runTest("black hole steadily pulls a captured bird inward across frames", () => {
  const width = 220;
  const height = 120;
  const frame = 120;
  const states = createBirdStates(width, height, frame);
  const targetBirdIndex = 2;
  const initialCenter = birdCenter(states[targetBirdIndex], targetBirdIndex);
  const hole = { x: initialCenter.x + 30, y: initialCenter.y + 6, radius: 0 };
  const beforeDistanceSq = (initialCenter.x - hole.x) ** 2 + (initialCenter.y - hole.y) ** 2;

  let currentFrame = frame;
  let previousDistanceSq = beforeDistanceSq;
  let sawStrictImprovement = false;

  for (let step = 0; step < 10; step += 1) {
    currentFrame += 1;
    updateBirdStates(states, width, height, currentFrame, [hole]);
    const center = birdCenter(states[targetBirdIndex], targetBirdIndex);
    const distanceSq = (center.x - hole.x) ** 2 + (center.y - hole.y) ** 2;
    if (distanceSq < previousDistanceSq) {
      sawStrictImprovement = true;
    }
    previousDistanceSq = distanceSq;
  }

  assert.ok(
    states[targetBirdIndex].captured || countVisibleFragments(states[targetBirdIndex]) > 0 || states[targetBirdIndex].respawn > 0,
    "bird should enter the black hole suction lifecycle",
  );
  assert.ok(sawStrictImprovement, "bird should move closer over successive frames");
  assert.ok(previousDistanceSq < beforeDistanceSq, "bird should end up closer to the black hole");
});

runTest("consumed bird stays gone during respawn cooldown instead of flickering back", () => {
  const width = 220;
  const height = 120;
  let frame = 160;
  const states = createBirdStates(width, height, frame);
  const targetBirdIndex = 0;
  const centerHole = birdCenter(states[targetBirdIndex], targetBirdIndex);
  const hole = { ...centerHole, radius: 0 };

  const visibleCounts = [];
  let enteredCooldown = false;
  for (let step = 0; step < 24; step += 1) {
    frame += 1;
    updateBirdStates(states, width, height, frame, [hole]);
    visibleCounts.push(countVisibleFragments(states[targetBirdIndex]));
    if (states[targetBirdIndex].respawn > 0) {
      enteredCooldown = true;
      break;
    }
  }

  assert.ok(visibleCounts[0] > 0, "captured bird should start with visible fragments");
  assert.ok(
    visibleCounts.some((count, index) => index > 0 && count < visibleCounts[0]),
    "black hole should tear away bird pixels over time before full consumption",
  );
  assert.ok(enteredCooldown, "bird should eventually be fully consumed and enter respawn cooldown");

  let hiddenFrames = 0;
  for (let step = 0; step < 8; step += 1) {
    frame += 1;
    updateBirdStates(states, width, height, frame, [hole]);
    const pixels = countNonZero(drawBirds(states, frame, width, height));
    assert.ok(states[targetBirdIndex].respawn > 0, "bird should still be cooling down");
    assert.ok(!states[targetBirdIndex].captured, "consumed bird should not immediately re-enter capture");
    assert.equal(countVisibleFragments(states[targetBirdIndex]), 0, "all bird fragments should be gone during cooldown");
    hiddenFrames += 1;
    assert.ok(pixels > 0, "other birds should continue rendering while one bird is gone");
  }

  assert.equal(hiddenFrames, 8, "bird should stay absent across multiple consecutive frames");
});

runTest("fireworks burn birds apart like flammable material", () => {
  const width = 220;
  const height = 120;
  let frame = 120;
  const states = createBirdStates(width, height, frame);
  const targetBirdIndex = 1;
  const center = birdCenter(states[targetBirdIndex], targetBirdIndex);
  const types = new Uint8Array(width * height);
  const fireworkX = Math.round(center.x);
  const fireworkY = Math.round(center.y);
  types[fireworkY * width + fireworkX] = 8;
  const fireworks = collectFireworks(types, width);

  const visibleCounts = [];
  let enteredCooldown = false;
  for (let step = 0; step < 20; step += 1) {
    frame += 1;
    updateBirdStates(states, width, height, frame, [], fireworks);
    visibleCounts.push(countVisibleFragments(states[targetBirdIndex]));
    if (states[targetBirdIndex].respawn > 0) {
      enteredCooldown = true;
      break;
    }
  }

  assert.ok(states[targetBirdIndex].burning || enteredCooldown, "bird should ignite when a firework overlaps it");
  assert.ok(
    visibleCounts.some((count, index) => index > 0 && count < visibleCounts[0]),
    "fireworks should remove bird pixels over successive frames",
  );
  assert.ok(enteredCooldown, "bird should burn away completely and enter respawn cooldown");
});
