import "./styles.css";

import { applyPhotoStamp, applyResumeStamp, collectPhotoStampCells, loadPhotoStamps } from "./photos.js";
import { CanvasRenderer } from "./render.js";
import { isVisibleResumePixel } from "./resumePixels.js";
import { BRUSH_SIZES, createAppState } from "./state.js";
import { SandSimulation, SPECIES } from "./simulation.js";
import { drawHud, handleHudPointer } from "./ui.js";

const CELL_SIZE = 4;
const MIN_WORLD_WIDTH = 120;
const MIN_WORLD_HEIGHT = 120;
const MAX_TICKS_PER_FRAME = 1;
const MIN_TICKS_PER_FRAME = 1;
const PHOTO_DISPLAY_SLOTS_DESKTOP = [
  { x: 0.12, y: 0.42 },
  { x: 0.32, y: 0.29 },
  { x: 0.5, y: 0.46, resume: true },
  { x: 0.68, y: 0.31 },
  { x: 0.88, y: 0.43 },
];
const PHOTO_DISPLAY_SLOTS_MOBILE = [
  { x: 0.24, y: 0.35 },
  { x: 0.5, y: 0.46, resume: true },
  { x: 0.76, y: 0.35 },
];
const PHOTO_ROTATE_INTERVAL_MS = 5000;
const PHOTO_FADE_DURATION_MS = 900;
const PHOTO_SOLID_OPACITY = 0.8;
const MOBILE_MEDIA_QUERY = "(max-width: 720px)";
const TILT_SMOOTHING = 0.18;
const TILT_DEAD_ZONE = 0.055;
const TILT_SENSOR_TIMEOUT_MS = 1800;
const TOAST_DURATION_MS = 3200;

const state = createAppState();
state.tiltAvailable = Boolean(
  navigator.maxTouchPoints > 0 &&
  (window.DeviceMotionEvent || window.DeviceOrientationEvent),
);
const playfield = document.getElementById("playfield");
const canvas = document.getElementById("sand-canvas");
const hudCanvas = document.getElementById("hud-canvas");
const loadingOverlay = document.getElementById("loading-overlay");
const tiltPermissionPanel = document.getElementById("tilt-permission");
const tiltAllowButton = document.getElementById("tilt-allow");
const tiltCancelButton = document.getElementById("tilt-cancel");
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
let resumeHover = null; // { viewX, viewY } or null
let appReady = false;
let tiltListening = false;
let tiltPermissionGranted = false;
let tiltPermissionPending = false;
let tiltX = 0;
let tiltY = 1;
let lastMotionTiltAt = 0;
let lastTiltDataAt = 0;
let tiltSensorTimer = null;
let toastMessage = "";
let toastExpiresAt = 0;
let decorativePhotoSlots = [];
let decorativePhotoBag = [];
let decorativePhotoSeen = new Set();
let decorativePhotoTransition = "idle";
let decorativePhotoPhaseStartedAt = 0;

function showToast(message, duration = TOAST_DURATION_MS) {
  toastMessage = message;
  toastExpiresAt = performance.now() + duration;
  hudDirty = true;
}

function getActiveToast(now) {
  if (!toastMessage) {
    return null;
  }
  if (now >= toastExpiresAt) {
    toastMessage = "";
    toastExpiresAt = 0;
    hudDirty = true;
    return null;
  }
  return { message: toastMessage };
}

function getPhotoDisplaySlots() {
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches
    ? PHOTO_DISPLAY_SLOTS_MOBILE
    : PHOTO_DISPLAY_SLOTS_DESKTOP;
}

function getSeedOptions(sceneId = state.activeScene) {
  return {
    mobileDunesWater: sceneId === "dunes" && window.matchMedia(MOBILE_MEDIA_QUERY).matches,
  };
}

function getPhotoOnlySlots() {
  return getPhotoDisplaySlots().filter((slot) => !slot.resume);
}

function getResumeSlot() {
  return getPhotoDisplaySlots().find((slot) => slot.resume);
}

function shuffle(items) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = (Math.random() * (i + 1)) | 0;
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function refillDecorativePhotoBag(excluded = []) {
  const excludedSet = new Set(excluded);
  decorativePhotoBag = shuffle(
    photoStamps
      .map((_, index) => index)
      .filter((index) => !excludedSet.has(index) && !decorativePhotoSeen.has(index)),
  );
}

function takeNextDecorativePhotoIndices(count, excluded = []) {
  if (photoStamps.length === 0 || count <= 0) {
    return [];
  }

  const excludedSet = new Set(excluded);
  const picked = [];
  while (picked.length < count) {
    if (decorativePhotoBag.length === 0) {
      refillDecorativePhotoBag([...excludedSet, ...picked]);
      if (decorativePhotoBag.length === 0) {
        decorativePhotoSeen = new Set(excludedSet);
        refillDecorativePhotoBag(picked);
      }
      if (decorativePhotoBag.length === 0) {
        break;
      }
    }

    const nextIndex = decorativePhotoBag.shift();
    if (excludedSet.has(nextIndex) || picked.includes(nextIndex)) {
      continue;
    }
    picked.push(nextIndex);
    decorativePhotoSeen.add(nextIndex);
  }

  return picked;
}

function createDecorativePhotoSlot(slot, photoIndex) {
  return {
    slot,
    photoIndex,
    opacity: 1,
    jitterX: ((Math.random() * 10) | 0) - 5,
    jitterY: ((Math.random() * 8) | 0) - 4,
    materializedCells: [],
  };
}

function getDecorativePhotoCenter(entry) {
  return {
    x: Math.floor(simulation.width * entry.slot.x + entry.jitterX),
    y: Math.floor(simulation.height * entry.slot.y + entry.jitterY),
  };
}

function clearDecorativePhotoMaterial(entry) {
  if (!entry?.materializedCells?.length) {
    return;
  }
  for (let i = 0; i < entry.materializedCells.length; i += 1) {
    const { index, color } = entry.materializedCells[i];
    if (simulation.types[index] !== SPECIES.PHOTO || simulation.photoColors[index] !== color) {
      continue;
    }
    simulation.setCell(index, SPECIES.EMPTY, 0);
  }
  entry.materializedCells = [];
}

function clearAllDecorativePhotoMaterial() {
  for (let i = 0; i < decorativePhotoSlots.length; i += 1) {
    clearDecorativePhotoMaterial(decorativePhotoSlots[i]);
  }
}

function materializeDecorativePhoto(entry) {
  if (entry.photoIndex == null) {
    return;
  }
  const photoStamp = photoStamps[entry.photoIndex];
  if (!photoStamp) {
    return;
  }
  const center = getDecorativePhotoCenter(entry);
  const ignitionSources = [];
  const cells = collectPhotoStampCells(simulation, photoStamp, center.x, center.y)
    .filter(({ index }) => {
      const type = simulation.types[index];
      if (type === SPECIES.FIRE || type === SPECIES.FIREWORK) {
        ignitionSources.push(index);
      }
      return (
        !isVisibleResumePixel(simulation, index) &&
        type !== SPECIES.STONE &&
        type !== SPECIES.BLACK_HOLE &&
        type !== SPECIES.FIRE &&
        type !== SPECIES.FIREWORK
      );
    });
  for (let i = 0; i < cells.length; i += 1) {
    simulation.setPhotoCell(cells[i].index, cells[i].color);
  }
  for (let i = 0; i < ignitionSources.length; i += 1) {
    const index = ignitionSources[i];
    const x = index % simulation.width;
    const y = (index / simulation.width) | 0;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) {
          continue;
        }
        const nx = x + dx;
        const ny = y + dy;
        if (!simulation.inBounds(nx, ny)) {
          continue;
        }
        const neighborIndex = simulation.index(nx, ny);
        if (simulation.types[neighborIndex] === SPECIES.PHOTO) {
          simulation.setCell(neighborIndex, SPECIES.FIRE, simulation.seedDataFor(SPECIES.FIRE, nx, ny));
        }
      }
    }
  }
  if (simulation.inBounds(center.x, center.y)) {
    simulation.noteCellChange(simulation.index(center.x, center.y), 48);
  }
  entry.materializedCells = cells;
}

function syncDecorativePhotoMaterial() {
  for (let i = 0; i < decorativePhotoSlots.length; i += 1) {
    const entry = decorativePhotoSlots[i];
    const shouldMaterialize = entry.photoIndex != null && entry.opacity > 0;
    const isMaterialized = entry.materializedCells.length > 0;
    if (shouldMaterialize && !isMaterialized) {
      materializeDecorativePhoto(entry);
      continue;
    }
    if (!shouldMaterialize && isMaterialized) {
      clearDecorativePhotoMaterial(entry);
    }
  }
}

function syncDecorativePhotoOverlay() {
  syncDecorativePhotoMaterial();
  const renderPhotos = decorativePhotoSlots
    .filter((entry) => entry.photoIndex != null && entry.opacity > 0)
    .map((entry) => ({
      cells: entry.materializedCells,
      liveCells: true,
      x: getDecorativePhotoCenter(entry).x,
      y: getDecorativePhotoCenter(entry).y,
      opacity: entry.opacity,
    }));
  renderer.setDecorativePhotos(renderPhotos);
}

function resetDecorativePhotos(now = performance.now()) {
  const slots = getPhotoOnlySlots();
  const count = Math.min(slots.length, photoStamps.length);
  clearAllDecorativePhotoMaterial();
  decorativePhotoSlots = [];
  decorativePhotoSeen = new Set();
  decorativePhotoTransition = "idle";
  decorativePhotoPhaseStartedAt = now;
  refillDecorativePhotoBag();
  const indices = takeNextDecorativePhotoIndices(count);
  for (let i = 0; i < count; i += 1) {
    decorativePhotoSlots.push(createDecorativePhotoSlot(slots[i], indices[i]));
  }
  syncDecorativePhotoOverlay();
}

function syncDecorativePhotoLayout() {
  const slots = getPhotoOnlySlots();
  const count = Math.min(slots.length, photoStamps.length);
  const layoutChanged = decorativePhotoSlots.length !== count;
  if (layoutChanged) {
    resetDecorativePhotos();
    return;
  }

  clearAllDecorativePhotoMaterial();
  for (let i = 0; i < decorativePhotoSlots.length; i += 1) {
    decorativePhotoSlots[i].slot = slots[i];
  }
  syncDecorativePhotoOverlay();
}

function updateDecorativePhotos(now) {
  if (decorativePhotoSlots.length === 0) {
    return;
  }

  if (decorativePhotoTransition === "idle") {
    if (now - decorativePhotoPhaseStartedAt < PHOTO_ROTATE_INTERVAL_MS) {
      return;
    }
    decorativePhotoTransition = "fade-out";
    decorativePhotoPhaseStartedAt = now;
  }

  const progress = Math.min(1, (now - decorativePhotoPhaseStartedAt) / PHOTO_FADE_DURATION_MS);
  if (decorativePhotoTransition === "fade-out") {
    for (let i = 0; i < decorativePhotoSlots.length; i += 1) {
      decorativePhotoSlots[i].opacity = 1 - progress;
    }
    syncDecorativePhotoOverlay();
    if (progress >= 1) {
      const currentIndices = decorativePhotoSlots.map((slot) => slot.photoIndex);
      const nextIndices = takeNextDecorativePhotoIndices(decorativePhotoSlots.length, currentIndices);
      for (let i = 0; i < decorativePhotoSlots.length; i += 1) {
        decorativePhotoSlots[i].photoIndex = nextIndices[i] ?? decorativePhotoSlots[i].photoIndex;
        decorativePhotoSlots[i].jitterX = ((Math.random() * 10) | 0) - 5;
        decorativePhotoSlots[i].jitterY = ((Math.random() * 8) | 0) - 4;
        decorativePhotoSlots[i].opacity = 0;
      }
      decorativePhotoTransition = "fade-in";
      decorativePhotoPhaseStartedAt = now;
      syncDecorativePhotoOverlay();
    }
    return;
  }

  if (decorativePhotoTransition === "fade-in") {
    for (let i = 0; i < decorativePhotoSlots.length; i += 1) {
      decorativePhotoSlots[i].opacity = progress;
    }
    syncDecorativePhotoOverlay();
    if (progress >= 1) {
      for (let i = 0; i < decorativePhotoSlots.length; i += 1) {
        decorativePhotoSlots[i].opacity = 1;
      }
      decorativePhotoTransition = "idle";
      decorativePhotoPhaseStartedAt = now;
      syncDecorativePhotoOverlay();
    }
  }
}

function placeResume(slot = getResumeSlot()) {
  const cx = Math.floor(simulation.width * (slot?.x ?? 0.5));
  const cy = Math.floor(simulation.height * (slot?.y ?? 0.46));
  applyResumeStamp(simulation, cx, cy);
}

function decorateSceneWithPhotos() {
  resetDecorativePhotos();
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
    syncDecorativePhotoLayout();
    return;
  }
  clearAllDecorativePhotoMaterial();
  simulation.resize(next.width, next.height);
  renderer.resize();
  resizeHudCanvas();
  if (reseed) {
    simulation.seed(state.activeScene, getSeedOptions());
  }
  syncDecorativePhotoLayout();
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
  lastTiltDataAt = lastMotionTiltAt;
  applyTiltGravity(gravity.x / 9.80665, -gravity.y / 9.80665);
}

function handleDeviceOrientation(event) {
  if (performance.now() - lastMotionTiltAt < 250) {
    return;
  }
  if (typeof event.gamma !== "number" || typeof event.beta !== "number") {
    return;
  }
  lastTiltDataAt = performance.now();
  applyTiltGravity(Math.sin(event.gamma * Math.PI / 180), Math.sin(event.beta * Math.PI / 180));
}

function clearTiltSensorTimer() {
  if (!tiltSensorTimer) {
    return;
  }
  window.clearTimeout(tiltSensorTimer);
  tiltSensorTimer = null;
}

function startTiltListeners() {
  if (tiltListening) {
    return;
  }
  tiltListening = true;
  state.tiltEnabled = true;
  lastTiltDataAt = 0;
  clearTiltSensorTimer();
  tiltSensorTimer = window.setTimeout(() => {
    tiltSensorTimer = null;
    if (tiltListening && !lastTiltDataAt) {
      stopTiltListeners();
      showToast("Tilt is on, but no sensor data is coming through.");
    }
  }, TILT_SENSOR_TIMEOUT_MS);
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
  clearTiltSensorTimer();
  tiltX = 0;
  tiltY = 1;
  simulation.setGravity(0, 1);
  hudDirty = true;
  window.removeEventListener("devicemotion", handleDeviceMotion);
  window.removeEventListener("deviceorientation", handleDeviceOrientation);
}

function getSensorPermissionConstructor() {
  if (typeof window.DeviceMotionEvent?.requestPermission === "function") {
    return window.DeviceMotionEvent;
  }
  if (typeof window.DeviceOrientationEvent?.requestPermission === "function") {
    return window.DeviceOrientationEvent;
  }
  return null;
}

function needsSensorPermissionRequest() {
  return Boolean(getSensorPermissionConstructor());
}

function showTiltPermissionPrompt() {
  if (!tiltPermissionPanel) {
    enablePhoneTilt({ fromPrompt: true });
    return;
  }
  tiltPermissionPanel.classList.remove("is-hidden");
  tiltPermissionPanel.setAttribute("aria-hidden", "false");
  tiltAllowButton?.focus();
}

function hideTiltPermissionPrompt() {
  if (!tiltPermissionPanel) {
    return;
  }
  tiltPermissionPanel.classList.add("is-hidden");
  tiltPermissionPanel.setAttribute("aria-hidden", "true");
}

async function requestSensorPermission(eventConstructor = getSensorPermissionConstructor()) {
  const requestPermission = eventConstructor?.requestPermission;
  if (typeof requestPermission !== "function") {
    return "granted";
  }
  return requestPermission.call(eventConstructor);
}

function enablePhoneTilt({ fromPrompt = false } = {}) {
  if (!state.tiltAvailable) {
    showToast("Tilt is not available in this browser.");
    return;
  }
  if (tiltListening) {
    return;
  }
  if (tiltPermissionPending) {
    showToast("Tilt permission request is still open.");
    return;
  }
  if (tiltPermissionGranted) {
    startTiltListeners();
    return;
  }
  if (!fromPrompt && needsSensorPermissionRequest()) {
    showTiltPermissionPrompt();
    return;
  }

  tiltPermissionPending = true;
  requestSensorPermission()
    .then((permissionState) => {
      if (permissionState === "granted") {
        tiltPermissionGranted = true;
        startTiltListeners();
      } else {
        showToast("Tilt permission was not granted.");
      }
    })
    .catch(() => {
      showToast("Tilt permission could not be requested.");
    })
    .finally(() => {
      tiltPermissionPending = false;
      if (tiltPermissionGranted) {
        startTiltListeners();
      }
    });
}

function isResumeHit(point) {
  return isVisibleResumePixel(simulation, simulation.index(point.x, point.y));
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
        simulation.seed(sceneId, getSeedOptions(sceneId));
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
        simulation.seed(state.activeScene, getSeedOptions());
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
    if (state.hudSection) {
      state.hudSection = null;
      hudDirty = true;
    }
    drawing = true;
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
tiltAllowButton?.addEventListener("click", () => {
  hideTiltPermissionPrompt();
  enablePhoneTilt({ fromPrompt: true });
});
tiltCancelButton?.addEventListener("click", () => {
  hideTiltPermissionPrompt();
  showToast("Tilt permission was not granted.");
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
  const toast = getActiveToast(now);
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
    toast?.message ?? "",
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
    toast,
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

  updateDecorativePhotos(now);
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
  simulation.seed(state.activeScene, getSeedOptions());
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
  simulation.seed(state.activeScene, getSeedOptions());
  renderer.setDecorativePhotos([]);
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
