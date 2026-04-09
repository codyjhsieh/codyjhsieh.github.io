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
const RESUME_STAMP_WIDTH = 40;
const RESUME_STAMP_HEIGHT = 52;
const PHOTO_DISPLAY_SLOTS = [
  { x: 0.12, y: 0.42 },
  { x: 0.32, y: 0.29 },
  { x: 0.5, y: 0.46, resume: true },
  { x: 0.68, y: 0.31 },
  { x: 0.88, y: 0.43 },
];
const TILT_SMOOTHING = 0.18;
const TILT_DEAD_ZONE = 0.055;

const state = createAppState();
state.tiltAvailable = Boolean(
  navigator.maxTouchPoints > 0 &&
  (window.DeviceMotionEvent || window.DeviceOrientationEvent),
);
const playfield = document.getElementById("playfield");
const canvas = document.getElementById("sand-canvas");
const hudCanvas = document.getElementById("hud-canvas");
const loadingOverlay = document.getElementById("loading-overlay");
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
let photosDecorated = false;
let hudViewportWidth = 1;
let hudViewportHeight = 1;
let hudPixelRatio = 1;
let hudDirty = true;
let lastHudSignature = "";
let lastHudDrawTime = 0;
let resumeCells = new Set();
let resumeHover = null; // { viewX, viewY } or null
let resumeHitBounds = null;
let appReady = false;
let tiltListening = false;
let tiltPermissionGranted = false;
let tiltPermissionPending = false;
let tiltX = 0;
let tiltY = 1;
let lastMotionTiltAt = 0;

function placeResume(slot = PHOTO_DISPLAY_SLOTS.find((item) => item.resume)) {
  const cx = Math.floor(simulation.width * (slot?.x ?? 0.5));
  const cy = Math.floor(simulation.height * (slot?.y ?? 0.46));
  resumeCells = applyResumeStamp(simulation, cx, cy);
  const hitPadding = Math.max(8, Math.round(Math.min(simulation.width, simulation.height) * 0.025));
  resumeHitBounds = {
    left: Math.max(0, cx - Math.floor(RESUME_STAMP_WIDTH / 2) - hitPadding),
    right: Math.min(simulation.width - 1, cx + Math.ceil(RESUME_STAMP_WIDTH / 2) + hitPadding),
    top: Math.max(0, cy - Math.floor(RESUME_STAMP_HEIGHT / 2) - hitPadding),
    bottom: Math.min(simulation.height - 1, cy + Math.ceil(RESUME_STAMP_HEIGHT / 2) + hitPadding),
  };
}

function decorateSceneWithPhotos() {
  if (photoStamps.length < 1) {
    placeResume();
    return;
  }

  photosDecorated = true;

  const photoSlots = PHOTO_DISPLAY_SLOTS.filter((slot) => !slot.resume);
  const count = Math.min(photoSlots.length, photoStamps.length);
  const used = new Set();

  for (let i = 0; i < count; i += 1) {
    let choice = ((Math.random() * photoStamps.length) | 0);
    let attempts = 0;
    while (used.has(choice) && attempts < photoStamps.length) {
      choice = (choice + 1) % photoStamps.length;
      attempts += 1;
    }
    used.add(choice);

    const stamp = photoStamps[choice];
    const slot = photoSlots[i];
    const jitterX = ((Math.random() * 10) | 0) - 5;
    const jitterY = ((Math.random() * 8) | 0) - 4;
    const x = Math.floor(simulation.width * slot.x + jitterX);
    const y = Math.floor(simulation.height * slot.y + jitterY);
    applyPhotoStamp(simulation, stamp, x, y);
  }

  simulation.applyScene(state.activeScene);
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

function getScreenAngle() {
  if (window.screen?.orientation && typeof window.screen.orientation.angle === "number") {
    return window.screen.orientation.angle;
  }
  return typeof window.orientation === "number" ? window.orientation : 0;
}

function rotateTiltToScreen(x, y) {
  const angle = ((getScreenAngle() % 360) + 360) % 360;
  if (angle === 90) {
    return { x: -y, y: x };
  }
  if (angle === 180) {
    return { x: -x, y: -y };
  }
  if (angle === 270) {
    return { x: y, y: -x };
  }
  return { x, y };
}

function applyTiltGravity(rawX, rawY) {
  const rotated = rotateTiltToScreen(rawX, rawY);
  const magnitude = Math.hypot(rotated.x, rotated.y);
  if (magnitude < TILT_DEAD_ZONE) {
    return;
  }
  const nextX = rotated.x / magnitude;
  const nextY = rotated.y / magnitude;
  tiltX += (nextX - tiltX) * TILT_SMOOTHING;
  tiltY += (nextY - tiltY) * TILT_SMOOTHING;
  simulation.setGravity(tiltX, tiltY);
}

function handleDeviceMotion(event) {
  const gravity = event.accelerationIncludingGravity;
  if (!gravity || typeof gravity.x !== "number" || typeof gravity.y !== "number") {
    return;
  }
  lastMotionTiltAt = performance.now();
  applyTiltGravity(gravity.x / 9.80665, -gravity.y / 9.80665);
}

function handleDeviceOrientation(event) {
  if (performance.now() - lastMotionTiltAt < 250) {
    return;
  }
  if (typeof event.gamma !== "number" || typeof event.beta !== "number") {
    return;
  }
  applyTiltGravity(Math.sin(event.gamma * Math.PI / 180), Math.sin(event.beta * Math.PI / 180));
}

function startTiltListeners() {
  if (tiltListening) {
    return;
  }
  tiltListening = true;
  state.tiltEnabled = true;
  hudDirty = true;
  window.addEventListener("devicemotion", handleDeviceMotion, { passive: true });
  window.addEventListener("deviceorientation", handleDeviceOrientation, { passive: true });
}

function stopTiltListeners() {
  if (!tiltListening) {
    return;
  }
  tiltListening = false;
  state.tiltEnabled = false;
  tiltX = 0;
  tiltY = 1;
  simulation.setGravity(0, 1);
  hudDirty = true;
  window.removeEventListener("devicemotion", handleDeviceMotion);
  window.removeEventListener("deviceorientation", handleDeviceOrientation);
}

async function requestSensorPermission(eventConstructor) {
  const requestPermission = eventConstructor?.requestPermission;
  if (typeof requestPermission !== "function") {
    return "granted";
  }
  return requestPermission.call(eventConstructor);
}

function enablePhoneTilt() {
  if (!state.tiltAvailable) {
    return;
  }
  if (tiltListening) {
    return;
  }
  if (tiltPermissionPending) {
    return;
  }
  if (tiltPermissionGranted) {
    startTiltListeners();
    return;
  }

  tiltPermissionPending = true;
  Promise.all([
    requestSensorPermission(window.DeviceMotionEvent),
    requestSensorPermission(window.DeviceOrientationEvent),
  ])
    .then((permissionStates) => {
      if (permissionStates.every((permissionState) => permissionState === "granted")) {
        tiltPermissionGranted = true;
        startTiltListeners();
      }
    })
    .catch(() => {})
    .finally(() => {
      tiltPermissionPending = false;
      if (tiltPermissionGranted) {
        startTiltListeners();
      }
    });
}

function isResumeHit(point) {
  if (!resumeHitBounds) {
    return false;
  }
  return (
    point.x >= resumeHitBounds.left &&
    point.x <= resumeHitBounds.right &&
    point.y >= resumeHitBounds.top &&
    point.y <= resumeHitBounds.bottom
  );
}

function openResume() {
  const opened = window.open("/assets/Resume.pdf", "_blank");
  if (!opened) {
    window.location.href = "/assets/Resume.pdf";
  }
}

function handlePointerDown(event) {
  if (!appReady) {
    return;
  }

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
      onTiltToggle: () => {
        if (state.tiltEnabled) {
          stopTiltListeners();
        } else {
          enablePhoneTilt();
        }
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
    if (isResumeHit(lastPoint)) {
      resumeHover = null;
      hudDirty = true;
      openResume();
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
  if (!appReady) {
    return;
  }

  if (!drawing) {
    const pt = toWorldPoint(event);
    const onResume = isResumeHit(pt);
    canvas.style.cursor = onResume ? "pointer" : "";
    const rect = canvas.getBoundingClientRect();
    const prev = resumeHover;
    resumeHover = onResume ? { viewX: event.clientX - rect.left, viewY: event.clientY - rect.top, text: "Click to view resume" } : null;
    if (Boolean(prev) !== Boolean(resumeHover)) hudDirty = true;
    return;
  }

  const nextPoint = toWorldPoint(event);
  paintStroke(lastPoint, nextPoint);
  lastPoint = nextPoint;
}

function handlePointerUp(event) {
  if (!appReady) {
    return;
  }

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

function hideLoadingOverlay() {
  if (!loadingOverlay) {
    return;
  }
  loadingOverlay.classList.add("is-hidden");
  loadingOverlay.setAttribute("aria-hidden", "true");
}

async function boot() {
  resizeWorld();
  photoStamps = await loadPhotoStamps();
  simulation.seed(state.activeScene);
  decorateSceneWithPhotos();
  metrics = simulation.sampleMetrics();
  appReady = true;
  hudDirty = true;

  const now = performance.now();
  lastFrameTime = now;
  renderer.render();
  updateHud(now, 60);
  hideLoadingOverlay();
  requestAnimationFrame(frame);
}

boot().catch((error) => {
  console.error("Failed to boot sand lab:", error);
  resizeWorld();
  simulation.seed(state.activeScene);
  placeResume();
  metrics = simulation.sampleMetrics();
  appReady = true;
  hudDirty = true;

  const now = performance.now();
  lastFrameTime = now;
  renderer.render();
  updateHud(now, 60);
  hideLoadingOverlay();
  requestAnimationFrame(frame);
});
