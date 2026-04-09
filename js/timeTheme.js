const TIME_THEMES = [
  {
    id: "night",
    start: 20,
    css: {
      "--bg-glow-a": "rgba(122, 148, 176, 0.2)",
      "--bg-glow-b": "rgba(234, 204, 158, 0.08)",
      "--bg-top": "#11161b",
      "--bg-mid": "#23272b",
      "--bg-low": "#34312d",
      "--frame-glow": "rgba(155, 176, 198, 0.18)",
      "--frame-top": "#151a20",
      "--frame-mid": "#262a2d",
      "--frame-low": "#37332e",
    },
    sky: {
      top: [24, 29, 36],
      horizon: [44, 47, 52],
      lower: [58, 53, 47],
      sun: [168, 190, 212],
    },
  },
  {
    id: "dawn",
    start: 5,
    css: {
      "--bg-glow-a": "rgba(255, 214, 172, 0.56)",
      "--bg-glow-b": "rgba(134, 175, 196, 0.18)",
      "--bg-top": "#f5d8bd",
      "--bg-mid": "#e6c4ae",
      "--bg-low": "#b9c6c8",
      "--frame-glow": "rgba(255, 220, 178, 0.48)",
      "--frame-top": "#f6dcc3",
      "--frame-mid": "#e8c9b4",
      "--frame-low": "#c6cfd0",
    },
    sky: {
      top: [246, 218, 195],
      horizon: [232, 202, 182],
      lower: [199, 209, 211],
      sun: [255, 232, 188],
    },
  },
  {
    id: "day",
    start: 8,
    css: {
      "--bg-glow-a": "rgba(255, 252, 242, 0.82)",
      "--bg-glow-b": "rgba(184, 210, 222, 0.2)",
      "--bg-top": "#fffdf8",
      "--bg-mid": "#f3f6f2",
      "--bg-low": "#dfe9e8",
      "--frame-glow": "rgba(255, 252, 241, 0.52)",
      "--frame-top": "#fffdf8",
      "--frame-mid": "#f2f6f2",
      "--frame-low": "#dce8e7",
    },
    sky: {
      top: [255, 253, 248],
      horizon: [243, 247, 242],
      lower: [221, 233, 232],
      sun: [255, 250, 236],
    },
  },
  {
    id: "dusk",
    start: 17,
    css: {
      "--bg-glow-a": "rgba(255, 173, 132, 0.46)",
      "--bg-glow-b": "rgba(103, 144, 165, 0.2)",
      "--bg-top": "#ecd2bf",
      "--bg-mid": "#c6aeb0",
      "--bg-low": "#6d7f86",
      "--frame-glow": "rgba(255, 190, 145, 0.4)",
      "--frame-top": "#eed4c1",
      "--frame-mid": "#c9b2b3",
      "--frame-low": "#72858b",
    },
    sky: {
      top: [238, 212, 193],
      horizon: [205, 181, 181],
      lower: [116, 136, 143],
      sun: [255, 198, 150],
    },
  },
];

const ORDERED_TIME_THEMES = [...TIME_THEMES].sort((a, b) => a.start - b.start);

function getCurrentTimeTheme(date = new Date()) {
  const hour = date.getHours() + date.getMinutes() / 60;
  let theme = ORDERED_TIME_THEMES[ORDERED_TIME_THEMES.length - 1];
  for (const candidate of ORDERED_TIME_THEMES) {
    if (hour >= candidate.start) {
      theme = candidate;
    }
  }
  return theme;
}

function getTimeThemePreviewSequence() {
  return ["night", "dawn", "day", "dusk"].map((id) => TIME_THEMES.find((theme) => theme.id === id));
}

function applyTimeTheme(theme) {
  const root = document.documentElement;
  root.dataset.timeTheme = theme.id;
  for (const [name, value] of Object.entries(theme.css)) {
    root.style.setProperty(name, value);
  }
}

export { applyTimeTheme, getCurrentTimeTheme, getTimeThemePreviewSequence };
