import { SPECIES } from "./simulation";
import { BRUSH_SIZES, ELEMENTS, SCENES } from "./state";

const viewportLayoutCache = {
  key: "",
  layout: null,
};

function getLabelForElement(species) {
  return ELEMENTS.find((element) => element.species === species)?.label?.toUpperCase() ?? "TOOL";
}

function truncateLabel(label, maxChars) {
  if (!label) {
    return "";
  }
  if (label.length <= maxChars) {
    return label;
  }
  if (maxChars <= 1) {
    return label.slice(0, 1);
  }
  return `${label.slice(0, Math.max(1, maxChars - 1))}\u2026`;
}

function getHudLayoutForViewport(viewWidth, viewHeight, state, photos = []) {
  const cacheKey = [
    Math.round(viewWidth),
    Math.round(viewHeight),
    state.activeElement,
    state.brushIndex,
    state.activeScene,
    state.paused ? 1 : 0,
    state.photoIndex,
    state.hudSection ?? "closed",
    photos[state.photoIndex]?.label ?? "loading",
  ].join("|");

  if (viewportLayoutCache.key === cacheKey && viewportLayoutCache.layout) {
    return viewportLayoutCache.layout;
  }

  const compact = viewWidth < 760;
  const photoToolActive = state.activeElement === SPECIES.PHOTO;
  const sideMargin = compact ? 10 : 18;
  const dockWidth = compact ? Math.max(280, Math.min(viewWidth - sideMargin * 2, 342)) : 286;
  const dockHeight = compact ? (photoToolActive ? 142 : 98) : (photoToolActive ? 68 : 40);
  const panelWidth = compact ? Math.max(280, Math.min(viewWidth - sideMargin * 2, 360)) : 320;
  const dockX = compact ? Math.round((viewWidth - dockWidth) * 0.5) : viewWidth - dockWidth - 18;
  const dockY = viewHeight - dockHeight - (compact ? 10 : 18);
  const panelX = compact ? Math.round((viewWidth - panelWidth) * 0.5) : viewWidth - panelWidth - 18;
  const panelGap = 10;
  const inset = compact ? 10 : 12;
  const buttonGap = 8;
  const buttonHeight = compact ? 34 : 20;
  const panels = [];
  const buttons = [];

  function addButton(x, y, width, height, label, action, selected = false, readOnly = false) {
    buttons.push({ x, y, width, height, label, action, selected, readOnly });
  }

  const dock = { x: dockX, y: dockY, width: dockWidth, height: dockHeight };
  const toolLabel = getLabelForElement(state.activeElement);
  if (compact) {
    const rowWidth = dock.width - inset * 2;
    const topLeftWidth = Math.floor((rowWidth - buttonGap) * 0.62);
    const topRightWidth = rowWidth - buttonGap - topLeftWidth;
    const bottomWidth = Math.floor((rowWidth - buttonGap * 2) / 3);
    const bottomY = dock.y + 54;
    const photoY = dock.y + 98;

    addButton(dock.x + inset, dock.y + 10, topLeftWidth, buttonHeight, toolLabel, { type: "toggle-section", value: "tools" }, state.hudSection === "tools");
    addButton(dock.x + inset + topLeftWidth + buttonGap, dock.y + 10, topRightWidth, buttonHeight, state.paused ? "RESUME" : "PAUSE", { type: "pause" }, state.paused);
    addButton(dock.x + inset, bottomY, bottomWidth, buttonHeight, "TOOLS", { type: "toggle-section", value: "tools" }, state.hudSection === "tools");
    addButton(dock.x + inset + bottomWidth + buttonGap, bottomY, bottomWidth, buttonHeight, "WORLD", { type: "toggle-section", value: "world" }, state.hudSection === "world");
    addButton(dock.x + inset + (bottomWidth + buttonGap) * 2, bottomY, rowWidth - bottomWidth * 2 - buttonGap * 2, buttonHeight, "MORE", { type: "toggle-section", value: "more" }, state.hudSection === "more");
    if (photoToolActive) {
      const sideButtonWidth = 56;
      const labelWidth = rowWidth - sideButtonWidth * 2 - buttonGap * 2;
      const photoLabel = truncateLabel(photos[state.photoIndex]?.label?.toUpperCase() ?? "LOADING", Math.max(10, Math.floor((labelWidth - 12) / 7)));
      addButton(dock.x + inset, photoY, sideButtonWidth, buttonHeight, "PREV", { type: "photo-prev" });
      addButton(dock.x + inset + sideButtonWidth + buttonGap, photoY, labelWidth, buttonHeight, photoLabel, { type: "none" }, true, true);
      addButton(dock.x + dock.width - inset - sideButtonWidth, photoY, sideButtonWidth, buttonHeight, "NEXT", { type: "photo-next" });
    }
  } else {
    const toolButtonWidth = 92;
    const sectionButtonWidth = 58;
    const pauseButtonWidth = 80;
    addButton(dock.x + inset, dock.y + 11, toolButtonWidth, buttonHeight, toolLabel, { type: "toggle-section", value: "tools" }, state.hudSection === "tools");
    addButton(dock.x + dock.width - inset - pauseButtonWidth, dock.y + 11, pauseButtonWidth, buttonHeight, state.paused ? "RESUME" : "PAUSE", { type: "pause" }, state.paused);
    addButton(dock.x + dock.width - inset - pauseButtonWidth - buttonGap - sectionButtonWidth, dock.y + 11, sectionButtonWidth, buttonHeight, "WORLD", { type: "toggle-section", value: "world" }, state.hudSection === "world");
    addButton(dock.x + dock.width - inset - pauseButtonWidth - buttonGap * 2 - sectionButtonWidth * 2, dock.y + 11, sectionButtonWidth, buttonHeight, "MORE", { type: "toggle-section", value: "more" }, state.hudSection === "more");
    if (photoToolActive) {
      const photoY = dock.y + 39;
      const sideButtonWidth = 56;
      const labelWidth = dock.width - inset * 2 - sideButtonWidth * 2 - buttonGap * 2;
      const photoLabel = truncateLabel(photos[state.photoIndex]?.label?.toUpperCase() ?? "LOADING", Math.max(10, Math.floor((labelWidth - 12) / 7)));
      addButton(dock.x + inset, photoY, sideButtonWidth, buttonHeight, "PREV", { type: "photo-prev" });
      addButton(dock.x + inset + sideButtonWidth + buttonGap, photoY, labelWidth, buttonHeight, photoLabel, { type: "none" }, true, true);
      addButton(dock.x + dock.width - inset - sideButtonWidth, photoY, sideButtonWidth, buttonHeight, "NEXT", { type: "photo-next" });
    }
  }

  if (state.hudSection) {
    const panel = {
      title: state.hudSection === "tools" ? "TOOLS" : state.hudSection === "world" ? "WORLD" : "MORE",
      x: panelX,
      y: dockY - panelGap,
      width: panelWidth,
      height: 0,
    };

    if (state.hudSection === "tools") {
      const columns = compact ? 3 : 4;
      const rowHeight = compact ? 42 : 26;
      const rows = Math.ceil(ELEMENTS.length / columns);
      panel.height = compact ? 46 + rows * rowHeight + 54 : 38 + rows * rowHeight + 42;
      panel.y = Math.max(8, panel.y - panel.height);
      panels.push(panel);

      const buttonWidth = Math.floor((panel.width - inset * 2 - buttonGap * (columns - 1)) / columns);
      ELEMENTS.forEach((element, index) => {
        const row = Math.floor(index / columns);
        const col = index % columns;
        addButton(
          panel.x + inset + col * (buttonWidth + buttonGap),
          panel.y + (compact ? 30 : 24) + row * rowHeight,
          buttonWidth,
          buttonHeight,
          element.label,
          { type: "element", value: element.species },
          state.activeElement === element.species,
        );
      });

      const brushTop = panel.y + panel.height - (compact ? 42 : 28);
      const brushWidth = Math.floor((panel.width - inset * 2 - buttonGap * (BRUSH_SIZES.length - 1)) / BRUSH_SIZES.length);
      BRUSH_SIZES.forEach((size, index) => {
        addButton(
          panel.x + inset + index * (brushWidth + buttonGap),
          brushTop,
          brushWidth,
          buttonHeight,
          `${size}px`,
          { type: "brush", value: size },
          state.brushIndex === index,
        );
      });
    } else if (state.hudSection === "world") {
      const columns = 2;
      const rowHeight = compact ? 42 : 26;
      const rows = Math.ceil(SCENES.length / columns);
      panel.height = compact ? 46 + rows * rowHeight + 14 : 38 + rows * rowHeight + 12;
      panel.y = Math.max(8, panel.y - panel.height);
      panels.push(panel);

      const buttonWidth = Math.floor((panel.width - inset * 2 - buttonGap) / columns);
      SCENES.forEach((scene, index) => {
        const row = Math.floor(index / columns);
        const col = index % columns;
        addButton(
          panel.x + inset + col * (buttonWidth + buttonGap),
          panel.y + (compact ? 30 : 24) + row * rowHeight,
          buttonWidth,
          buttonHeight,
          scene.label.toUpperCase(),
          { type: "scene", value: scene.id },
          state.activeScene === scene.id,
        );
      });
    } else {
      panel.height = compact ? 146 : 110;
      panel.y = Math.max(8, panel.y - panel.height);
      panels.push(panel);

      const halfWidth = Math.floor((panel.width - inset * 2 - buttonGap) / 2);
      const actionY = panel.y + (compact ? 32 : 24);
      const photoY = panel.y + (compact ? 82 : 56);
      addButton(panel.x + inset, actionY, halfWidth, buttonHeight, "RESEED", { type: "reseed" });
      addButton(panel.x + inset + halfWidth + buttonGap, actionY, halfWidth, buttonHeight, "CLEAR", { type: "clear" });
      addButton(panel.x + inset, photoY, compact ? 62 : 54, buttonHeight, "PREV", { type: "photo-prev" });
      addButton(panel.x + panel.width - inset - (compact ? 62 : 54), photoY, compact ? 62 : 54, buttonHeight, "NEXT", { type: "photo-next" });
      const photoLabelWidth = Math.max(88, panel.width - inset * 2 - 124);
      addButton(
        panel.x + inset + (compact ? 70 : 62),
        photoY,
        compact ? Math.max(70, panel.width - inset * 2 - 140) : photoLabelWidth,
        buttonHeight,
        truncateLabel(photos[state.photoIndex]?.label?.toUpperCase() ?? "LOADING", Math.max(12, Math.floor((photoLabelWidth - 12) / 7))),
        { type: "none" },
        true,
        true,
      );
    }
  }

  const layout = {
    compact,
    dock,
    panels,
    buttons,
    bounds: state.hudSection && panels[0]
      ? {
          x: panels[0].x,
          y: panels[0].y,
          width: panels[0].width,
          height: dock.y + dock.height - panels[0].y,
        }
      : { x: dock.x, y: dock.y, width: dock.width, height: dock.height },
  };

  viewportLayoutCache.key = cacheKey;
  viewportLayoutCache.layout = layout;
  return layout;
}

function pointInRect(point, rect) {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}

function handleHudPointer({ point, viewWidth, viewHeight, state, photos = [], callbacks }) {
  const layout = getHudLayoutForViewport(viewWidth, viewHeight, state, photos);
  for (const button of layout.buttons) {
    if (button.readOnly || button.action.type === "none") {
      continue;
    }
    if (!pointInRect(point, button)) {
      continue;
    }
    switch (button.action.type) {
      case "toggle-section": callbacks.onHudSectionToggle(button.action.value); return true;
      case "element": callbacks.onElementChange(button.action.value); return true;
      case "brush": callbacks.onBrushChange(button.action.value); return true;
      case "scene": callbacks.onSceneChange(button.action.value); return true;
      case "pause": callbacks.onPauseToggle(); return true;
      case "reseed": callbacks.onReseed(); return true;
      case "clear": callbacks.onClear(); return true;
      case "photo-prev": callbacks.onPhotoPrev(); return true;
      case "photo-next": callbacks.onPhotoNext(); return true;
      default: return false;
    }
  }
  return pointInRect(point, layout.bounds);
}

function drawHud({ ctx, viewWidth, viewHeight, state, photos = [], stats, pixelRatio = 1 }) {
  const layout = getHudLayoutForViewport(viewWidth, viewHeight, state, photos);
  const compact = layout.compact;
  const dock = layout.dock;
  const selected = getLabelForElement(state.activeElement);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.scale(pixelRatio, pixelRatio);
  ctx.textBaseline = "middle";
  ctx.font = compact ? "14px monospace" : "13px monospace";

  for (const panel of layout.panels) {
    ctx.fillStyle = "rgba(8, 12, 18, 0.78)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
    ctx.strokeRect(panel.x + 0.5, panel.y + 0.5, panel.width - 1, panel.height - 1);
    ctx.fillStyle = "rgba(210, 222, 235, 0.72)";
    ctx.fillText(panel.title, panel.x + 12, panel.y + 14);
  }

  ctx.fillStyle = "rgba(8, 12, 18, 0.68)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillRect(dock.x, dock.y, dock.width, dock.height);
  ctx.strokeRect(dock.x + 0.5, dock.y + 0.5, dock.width - 1, dock.height - 1);

  for (const button of layout.buttons) {
    const isSelected = button.selected;
    ctx.fillStyle = isSelected ? "rgba(255, 210, 122, 0.16)" : "rgba(255, 255, 255, 0.04)";
    ctx.strokeStyle = isSelected ? "rgba(255, 210, 122, 0.5)" : "rgba(255, 255, 255, 0.06)";
    ctx.fillRect(button.x, button.y, button.width, button.height);
    ctx.strokeRect(button.x + 0.5, button.y + 0.5, button.width - 1, button.height - 1);
    ctx.fillStyle = isSelected ? "rgba(255, 244, 220, 0.98)" : "rgba(230, 238, 246, 0.88)";
    ctx.fillText(button.label, button.x + 6, button.y + button.height * 0.55);
  }

  ctx.fillStyle = "rgba(166, 182, 198, 0.78)";
  ctx.fillText(selected, dock.x + 12, dock.y - 10);
  if (!compact) {
    ctx.fillText(`FPS ${stats.fps}`, dock.x + dock.width - 52, dock.y - 10);
  }

  if (state.activeElement === SPECIES.PHOTO) {
    ctx.fillStyle = "rgba(166, 182, 198, 0.72)";
    const photoLabel = truncateLabel(photos[state.photoIndex]?.label?.toUpperCase() ?? "LOADING", compact ? 22 : 28);
    ctx.fillText(`PHOTO ${photoLabel}`, dock.x + 12, dock.y - (compact ? 24 : 26));
  }

  ctx.restore();
}

export { drawHud, handleHudPointer };
