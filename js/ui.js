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
    state.tiltAvailable ? 1 : 0,
    state.tiltEnabled ? 1 : 0,
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
    const available = dock.width - inset * 2 - buttonGap * 3;
    const toolButtonWidth = Math.floor(available * 0.34);
    const pauseButtonWidth = Math.floor(available * 0.28);
    const sectionButtonWidth = Math.floor((available - toolButtonWidth - pauseButtonWidth) / 2);
    let cx = dock.x + inset;
    addButton(cx, dock.y + 11, toolButtonWidth, buttonHeight, toolLabel, { type: "toggle-section", value: "tools" }, state.hudSection === "tools");
    cx += toolButtonWidth + buttonGap;
    addButton(cx, dock.y + 11, sectionButtonWidth, buttonHeight, "MORE", { type: "toggle-section", value: "more" }, state.hudSection === "more");
    cx += sectionButtonWidth + buttonGap;
    addButton(cx, dock.y + 11, sectionButtonWidth, buttonHeight, "WORLD", { type: "toggle-section", value: "world" }, state.hudSection === "world");
    cx += sectionButtonWidth + buttonGap;
    addButton(cx, dock.y + 11, dock.x + dock.width - inset - cx, buttonHeight, state.paused ? "RESUME" : "PAUSE", { type: "pause" }, state.paused);
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
      const showTilt = compact;
      panel.height = compact ? 188 : 110;
      panel.y = Math.max(8, panel.y - panel.height);
      panels.push(panel);

      const halfWidth = Math.floor((panel.width - inset * 2 - buttonGap) / 2);
      const actionY = panel.y + (compact ? 32 : 24);
      const tiltY = panel.y + 82;
      const photoY = panel.y + (compact ? (showTilt ? 124 : 82) : 56);
      addButton(panel.x + inset, actionY, halfWidth, buttonHeight, "RESEED", { type: "reseed" });
      addButton(panel.x + inset + halfWidth + buttonGap, actionY, halfWidth, buttonHeight, "CLEAR", { type: "clear" });
      if (showTilt) {
        addButton(
          panel.x + inset,
          tiltY,
          panel.width - inset * 2,
          buttonHeight,
          state.tiltAvailable ? (state.tiltEnabled ? "TILT ON" : "TILT OFF") : "TILT N/A",
          { type: "tilt-toggle" },
          state.tiltEnabled,
        );
      }
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
      case "tilt-toggle": callbacks.onTiltToggle(); return true;
      default: return false;
    }
  }
  return pointInRect(point, layout.bounds);
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawHud({ ctx, viewWidth, viewHeight, state, photos = [], stats, pixelRatio = 1, resumeHover = null, toast = null }) {
  const layout = getHudLayoutForViewport(viewWidth, viewHeight, state, photos);
  const compact = layout.compact;
  const dock = layout.dock;
  const selected = getLabelForElement(state.activeElement);
  const now = performance.now();
  const pulse = Math.sin(now * 0.003) * 0.5 + 0.5;
  const glowAngle = now * 0.001;
  const t = Math.sin(glowAngle * 0.5) * 0.5 + 0.5;
  const t2 = Math.sin(glowAngle * 0.3 + 1.5) * 0.5 + 0.5;
  const gr = Math.round(255 - 80 * t);
  const gg = Math.round(180 + 40 * t);
  const gb = Math.round(100 + 155 * t);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.scale(pixelRatio, pixelRatio);
  ctx.textBaseline = "middle";
  ctx.font = compact ? "13px monospace" : "12px monospace";

  const dockR = compact ? 16 : 12;
  const panelR = compact ? 14 : 10;
  const btnR = compact ? 8 : 6;

  function drawGlowBox(x, y, w, h, r) {
    // Background
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.38)";
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 8;
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = "rgba(10, 12, 18, 0.74)";
    ctx.fill();
    ctx.restore();

    // Layered ambient glow — multiple passes radiating outward
    const layers = [
      { blur: 132 + t * 42, opacity: 0.5, width: compact ? 18 : 16, stroke: 0.1 },
      { blur: 86 + t * 24, opacity: 0.58, width: compact ? 14 : 12, stroke: 0.14 },
      { blur: 48 + t2 * 16, opacity: 0.62, width: compact ? 9 : 8, stroke: 0.18 },
      { blur: 20 + t2 * 7, opacity: 0.56, width: compact ? 5 : 4, stroke: 0.26 },
      { blur: 6, opacity: 0.35, width: 2, stroke: 0.42 },
    ];
    for (const layer of layers) {
      ctx.save();
      ctx.shadowColor = `rgba(${gr}, ${gg}, ${gb}, ${layer.opacity.toFixed(2)})`;
      ctx.shadowBlur = layer.blur;
      roundRect(ctx, x, y, w, h, r);
      ctx.strokeStyle = `rgba(${gr}, ${gg}, ${gb}, ${layer.stroke.toFixed(2)})`;
      ctx.lineWidth = layer.width;
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    roundRect(ctx, x + 1.5, y + 1.5, w - 3, h - 3, r);
    ctx.strokeStyle = `rgba(255, 244, 220, ${(0.2 + pulse * 0.08).toFixed(2)})`;
    ctx.lineWidth = compact ? 2.5 : 2;
    ctx.stroke();
    roundRect(ctx, x + 4.5, y + 4.5, w - 9, h - 9, Math.max(4, r - 4));
    ctx.strokeStyle = `rgba(${gr}, ${gg}, ${gb}, ${(0.24 + pulse * 0.1).toFixed(2)})`;
    ctx.lineWidth = 1.25;
    ctx.stroke();
    ctx.restore();
  }

  // Panels
  for (const panel of layout.panels) {
    drawGlowBox(panel.x, panel.y, panel.width, panel.height, panelR);
    ctx.fillStyle = "rgba(200, 210, 225, 0.6)";
    ctx.font = compact ? "10px monospace" : "9px monospace";
    ctx.fillText(panel.title, panel.x + panelR, panel.y + 14);
    ctx.font = compact ? "13px monospace" : "12px monospace";
  }

  // Dock
  drawGlowBox(dock.x, dock.y, dock.width, dock.height, dockR);

  // Buttons
  ctx.textAlign = "center";
  for (const button of layout.buttons) {
    const isSelected = button.selected;

    roundRect(ctx, button.x, button.y, button.width, button.height, btnR);
    ctx.fillStyle = isSelected
      ? `rgba(255, 210, 122, ${(0.1 + pulse * 0.06).toFixed(3)})`
      : "rgba(255, 255, 255, 0.03)";
    ctx.fill();

    roundRect(ctx, button.x + 0.5, button.y + 0.5, button.width - 1, button.height - 1, btnR);
    ctx.strokeStyle = isSelected
      ? `rgba(255, 210, 122, ${(0.58 + pulse * 0.22).toFixed(2)})`
      : "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = isSelected ? 1.6 : 1;
    ctx.stroke();

    ctx.save();
    roundRect(ctx, button.x, button.y, button.width, button.height, btnR);
    ctx.clip();
    if (isSelected) {
      ctx.shadowColor = "rgba(255, 210, 122, 0.6)";
      ctx.shadowBlur = 8;
      ctx.fillStyle = "rgba(255, 244, 220, 0.95)";
    } else {
      ctx.fillStyle = "rgba(220, 228, 236, 0.75)";
    }
    ctx.fillText(button.label, button.x + button.width / 2, button.y + button.height / 2);
    ctx.restore();
  }
  ctx.textAlign = "left";

  // Status text
  ctx.font = "10px monospace";
  ctx.fillStyle = "rgba(166, 182, 198, 0.6)";
  ctx.fillText(selected, dock.x + 14, dock.y - 10);
  if (!compact) {
    const fpsText = `${stats.fps}`;
    const fpsW = ctx.measureText(fpsText).width;
    ctx.fillText(fpsText, dock.x + dock.width - fpsW - 14, dock.y - 10);
  }

  if (state.activeElement === SPECIES.PHOTO) {
    ctx.fillStyle = "rgba(166, 182, 198, 0.5)";
    const photoLabel = truncateLabel(photos[state.photoIndex]?.label?.toUpperCase() ?? "LOADING", compact ? 22 : 28);
    ctx.fillText(photoLabel, dock.x + 14, dock.y - (compact ? 24 : 26));
  }

  // Resume tooltip
  if (resumeHover) {
    const tipText = resumeHover.text ?? "Click to view resume";
    ctx.font = compact ? "12px monospace" : "11px monospace";
    const tipW = ctx.measureText(tipText).width + 16;
    const tipH = compact ? 28 : 24;
    const tipR = 6;
    let tipX = resumeHover.viewX - tipW / 2;
    let tipY = resumeHover.viewY - tipH - 12;
    tipX = Math.max(4, Math.min(viewWidth - tipW - 4, tipX));
    tipY = Math.max(4, tipY);

    ctx.save();
    ctx.shadowColor = `rgba(${gr}, ${gg}, ${gb}, 0.4)`;
    ctx.shadowBlur = 12;
    roundRect(ctx, tipX, tipY, tipW, tipH, tipR);
    ctx.fillStyle = "rgba(10, 12, 18, 0.85)";
    ctx.fill();
    ctx.restore();

    roundRect(ctx, tipX + 0.5, tipY + 0.5, tipW - 1, tipH - 1, tipR);
    ctx.strokeStyle = `rgba(${gr}, ${gg}, ${gb}, 0.35)`;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(230, 238, 246, 0.9)";
    ctx.fillText(tipText, tipX + tipW / 2, tipY + tipH / 2);
    ctx.textAlign = "left";
  }

  if (toast) {
    const toastText = toast.message ?? "";
    ctx.font = compact ? "12px monospace" : "11px monospace";
    const maxToastW = Math.min(viewWidth - 24, compact ? 330 : 380);
    const toastLabel = truncateLabel(toastText, Math.max(12, Math.floor((maxToastW - 24) / 7)));
    const toastW = Math.min(maxToastW, ctx.measureText(toastLabel).width + 24);
    const toastH = compact ? 34 : 30;
    const toastX = Math.round((viewWidth - toastW) / 2);
    const toastY = Math.max(10, compact ? 12 : 18);
    const toastR = 8;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.42)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    roundRect(ctx, toastX, toastY, toastW, toastH, toastR);
    ctx.fillStyle = "rgba(22, 14, 14, 0.88)";
    ctx.fill();
    ctx.restore();

    roundRect(ctx, toastX + 0.5, toastY + 0.5, toastW - 1, toastH - 1, toastR);
    ctx.strokeStyle = "rgba(255, 146, 126, 0.58)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255, 236, 230, 0.94)";
    ctx.fillText(toastLabel, toastX + toastW / 2, toastY + toastH / 2);
    ctx.textAlign = "left";
  }

  ctx.restore();
}

export { drawHud, handleHudPointer };
