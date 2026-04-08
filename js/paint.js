import * as wasm from "../crate/pkg/sandtable_bg.wasm";
import { brushSizes, state } from "./state";
import { applyStampToUniverse } from "./stamps";

const memory = wasm.memory;

function getCanvasCoordinates(canvas, event, width, height) {
  const boundingRect = canvas.getBoundingClientRect();
  const x = Math.floor(((event.clientX - boundingRect.left) / boundingRect.width) * width);
  const y = Math.floor(((event.clientY - boundingRect.top) / boundingRect.height) * height);

  return {
    x: Math.max(0, Math.min(width - 1, x)),
    y: Math.max(0, Math.min(height - 1, y)),
  };
}

function installPainter({ canvas, universe, width, height, getStampById }) {
  let painting = false;

  function paintAt(event) {
    const point = getCanvasCoordinates(canvas, event, width, height);

    if (state.activeStampId) {
      const stamp = getStampById(state.activeStampId);
      applyStampToUniverse({ stamp, universe, x: point.x, y: point.y, width, height, memory });
      return;
    }

    if (state.selectedElement === null) {
      return;
    }

    universe.paint(point.x, point.y, brushSizes[state.brushIndex], state.selectedElement);
  }

  function handlePointerDown(event) {
    event.preventDefault();
    painting = true;
    if (!state.activeStampId) {
      universe.push_undo();
    }
    paintAt(event);
  }

  function handlePointerMove(event) {
    if (!painting || state.activeStampId) {
      return;
    }

    paintAt(event);
  }

  function handlePointerUp() {
    painting = false;
  }

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointerleave", handlePointerUp);
}

export { installPainter };
