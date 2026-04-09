import "./styles.css";

import { applyPhotoStamp, applyResumeStamp, loadPhotoStamps } from "./photos";
import { CanvasRenderer } from "./render";
import { BRUSH_SIZES, createAppState } from "./state";
import { SandSimulation, SPECIES } from "./simulation";
import { drawHud, handleHudPointer } from "./ui";

const CELL_SIZE = 4;
const MIN_WORLD_WIDTH = 120;
const MIN_WORLD_HEIGHT = 120;
const MAX_TICKS_PER_FRAME = 1;
const MIN_TICKS_PER_FRAME = 1;

const state = createAppState();
const playfield = document.getElementById("playfield");
const canvas = document.getElementById("sand-canvas");
const hudCanvas = document.getElementById("hud-canvas");
const simulation = new SandSimulation(MIN_WORLD_WIDTH, MIN_WORLD_HEIGHT);
const renderer = new CanvasRenderer({ canvas, simulation });
const hudCtx = hudCanvas.getContext("2d");

let drawing = false;
let lastPoint = null;
let lastFrameTime = performance.now();
const frameSamples = new Uint16Array(24);
let frameCursor = 0;
let frameCount = 0;
let metrics = { particles: 0 };
let photoStamps = [];
let hudViewportWidth = 1;
let hudViewportHeight = 1;
let hudPixelRatio = 1;
let hudDirty = true;
let lastHudSignature = "";
let lastHudDrawTime = 0;
let resumeCells = new Set();
let resumeHover = null; // { viewX, viewY } or null

function placeResume() {
  const cx = Math.floor(simulation.width / 2);
  const cy = Math.floor(simulation.height * 0.28);
  resumeCells = applyResumeStamp(simulation, cx, cy);
}

function decorateSceneWithPhotos() {
  if (photoStamps.length < 1) {
    placeResume();
    return;
  }

  const count = Math.min(5, photoStamps.length);
  const used = new Set();
  const spacing = simulation.width / (count + 1);
  const baseY = Math.max(42, Math.floor(simulation.height * 0.34));

  for (let i = 0; i < count; i += 1) {
    let choice = ((Math.random() * photoStamps.length) | 0);
    let attempts = 0;
    while (used.has(choice) && attempts < photoStamps.length) {
      choice = (choice + 1) % photoStamps.length;
      attempts += 1;
    }
    used.add(choice);

    const stamp = photoStamps[choice];
    const jitterX = ((Math.random() * 18) | 0) - 9;
    const jitterY = ((Math.random() * 12) | 0) - 6;
    const x = Math.floor(spacing * (i + 1) + jitterX);
    const y = baseY + jitterY;
    applyPhotoStamp(simulation, stamp, x, y);
  }

  placeResume();
  metrics = simulation.sampleMetrics();
}

function getWorldSize() {
  const rect = playfield.getBoundingClientRect();
  return {
    width: Math.max(MIN_WORLD_WIDTH, Math.floor(rect.width / CELL_SIZE)),
    height: Math.max(MIN_WORLD_HEIGHT, Math.floor(rect.height / CELL_SIZE)),
  };
}

function resizeWorld({ reseed = false } = {}) {
  const next = getWorldSize();
  const changed = next.width !== simulation.width || next.height !== simulation.height;
  if (!changed) {
    resizeHudCanvas();
    return;
  }
  simulation.resize(next.width, next.height);
  renderer.resize();
  resizeHudCanvas();
  if (reseed) {
    simulation.seed(state.activeScene);
  }
  metrics = simulation.sampleMetrics();
}

function resizeHudCanvas() {
  const rect = playfield.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1) * 1.5;
  hudViewportWidth = Math.max(1, rect.width);
  hudViewportHeight = Math.max(1, rect.height);
  hudPixelRatio = dpr;
  hudCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
  hudCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
  hudCanvas.style.width = `${rect.width}px`;
  hudCanvas.style.height = `${rect.height}px`;
  hudDirty = true;
}

resizeWorld();
simulation.seed(state.activeScene);
placeResume();

function toWorldPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * simulation.width);
  const y = Math.floor(((event.clientY - rect.top) / rect.height) * simulation.height);

  return {
    x: Math.max(0, Math.min(simulation.width - 1, x)),
    y: Math.max(0, Math.min(simulation.height - 1, y)),
  };
}

function paintStroke(from, to) {
  if (state.activeElement === SPECIES.PHOTO) {
    const active = photoStamps[state.photoIndex];
    applyPhotoStamp(simulation, active, to.x, to.y);
    return;
  }

  const radius = BRUSH_SIZES[state.brushIndex];
  const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y), 1);

  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    simulation.paintCircle(
      from.x + (to.x - from.x) * t,
      from.y + (to.y - from.y) * t,
      radius,
      state.activeElement,
    );
  }
}

function handlePointerDown(event) {
  const rect = hudCanvas.getBoundingClientRect();
  const hudPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  const handled = handleHudPointer({
    point: hudPoint,
    viewWidth: rect.width,
    viewHeight: rect.height,
    state,
    photos: photoStamps,
    callbacks: {
      onElementChange: (species) => {
        state.activeElement = species;
        state.hudSection = null;
        hudDirty = true;
      },
      onHudSectionToggle: (section) => {
        state.hudSection = state.hudSection === section ? null : section;
        hudDirty = true;
      },
      onBrushChange: (size) => {
        state.brushIndex = BRUSH_SIZES.indexOf(size);
        state.hudSection = null;
        hudDirty = true;
      },
      onSceneChange: (sceneId) => {
        state.activeScene = sceneId;
        simulation.seed(sceneId);
        decorateSceneWithPhotos();
        metrics = simulation.sampleMetrics();
        state.hudSection = null;
        hudDirty = true;
      },
      onPauseToggle: () => {
        state.paused = !state.paused;
        hudDirty = true;
      },
      onClear: () => {
        simulation.clear();
        metrics = simulation.sampleMetrics();
        hudDirty = true;
      },
      onReseed: () => {
        simulation.seed(state.activeScene);
        decorateSceneWithPhotos();
        metrics = simulation.sampleMetrics();
        hudDirty = true;
      },
      onPhotoPrev: () => {
        if (!photoStamps.length) {
          return;
        }
        state.photoIndex = (state.photoIndex - 1 + photoStamps.length) % photoStamps.length;
        hudDirty = true;
      },
      onPhotoNext: () => {
        if (!photoStamps.length) {
          return;
        }
        state.photoIndex = (state.photoIndex + 1) % photoStamps.length;
        hudDirty = true;
      },
    },
  });
  lastPoint = toWorldPoint(event);
  if (!handled) {
    // Check if clicking on a surviving resume cell
    const clickIndex = simulation.index(lastPoint.x, lastPoint.y);
    if (resumeCells.has(clickIndex) && simulation.types[clickIndex] === SPECIES.PHOTO) {
      window.open("/assets/Resume.pdf", "_blank");
      drawing = false;
      canvas.setPointerCapture(event.pointerId);
      return;
    }
    drawing = true;
    if (state.hudSection) {
      state.hudSection = null;
      hudDirty = true;
    }
    paintStroke(lastPoint, lastPoint);
  } else {
    drawing = false;
  }
  canvas.setPointerCapture(event.pointerId);
}

function handlePointerMove(event) {
  if (!drawing) {
    const pt = toWorldPoint(event);
    const idx = simulation.index(pt.x, pt.y);
    const onResume = resumeCells.has(idx) && simulation.types[idx] === SPECIES.PHOTO;
    canvas.style.cursor = onResume ? "pointer" : "";
    const rect = canvas.getBoundingClientRect();
    const prev = resumeHover;
    resumeHover = onResume ? { viewX: event.clientX - rect.left, viewY: event.clientY - rect.top } : null;
    if (Boolean(prev) !== Boolean(resumeHover)) hudDirty = true;
    return;
  }

  const nextPoint = toWorldPoint(event);
  paintStroke(lastPoint, nextPoint);
  lastPoint = nextPoint;
}

function handlePointerUp(event) {
  drawing = false;
  lastPoint = null;

  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
}

canvas.addEventListener("pointerdown", handlePointerDown);
canvas.addEventListener("pointermove", handlePointerMove);
canvas.addEventListener("pointerup", handlePointerUp);
canvas.addEventListener("pointercancel", handlePointerUp);
canvas.addEventListener("pointerleave", () => {
  drawing = false;
  lastPoint = null;
});
window.addEventListener("resize", () => {
  resizeWorld();
  hudDirty = true;
});

function sampleFps(now) {
  const delta = now - lastFrameTime;
  lastFrameTime = now;
  const fps = Math.max(1, Math.round(1000 / Math.max(delta, 1)));

  frameSamples[frameCursor] = fps;
  frameCursor = (frameCursor + 1) % frameSamples.length;
  frameCount = Math.min(frameCount + 1, frameSamples.length);

  let total = 0;
  for (let i = 0; i < frameCount; i += 1) {
    total += frameSamples[i];
  }

  return Math.round(total / Math.max(1, frameCount));
}

function updateHud(now, fps) {
  const selectedPhoto = photoStamps[state.photoIndex]?.label ?? "loading";
  const statsKey = [
    Math.round(fps / 4),
    Math.round(metrics.particles / 24),
    state.paused ? 1 : 0,
    state.activeScene,
  ].join("|");
  const signature = [
    statsKey,
    state.paused ? 1 : 0,
    state.activeScene,
    state.activeElement,
    state.brushIndex,
    state.photoIndex,
    state.hudSection ?? "closed",
    selectedPhoto,
  ].join("|");

  if (!hudDirty && signature === lastHudSignature && now - lastHudDrawTime < 50) {
    return;
  }

  lastHudSignature = signature;
  hudDirty = false;
  lastHudDrawTime = now;
  drawHud({
    ctx: hudCtx,
    viewWidth: hudViewportWidth,
    viewHeight: hudViewportHeight,
    state,
    photos: photoStamps,
    stats: {
      fps,
      particles: metrics.particles,
      paused: state.paused,
      activeScene: state.activeScene,
    },
    pixelRatio: hudPixelRatio,
    resumeHover,
  });
}

function getTickBudget(fps) {
  if (state.paused) {
    return 0;
  }

  return fps < 56 ? MIN_TICKS_PER_FRAME : MAX_TICKS_PER_FRAME;
}

function frame(now) {
  const fps = sampleFps(now);
  const tickBudget = getTickBudget(fps);
  if (tickBudget > 0) {
    simulation.tick(tickBudget);
    metrics = simulation.sampleMetrics();
  }

  renderer.render();
  updateHud(now, fps);

  requestAnimationFrame(frame);
}

loadPhotoStamps()
  .then((stamps) => {
    photoStamps = stamps;
    simulation.seed(state.activeScene);
    decorateSceneWithPhotos();
    hudDirty = true;
  })
  .catch((error) => {
    console.error("Failed to load photo stamps:", error);
  });

requestAnimationFrame(frame);
