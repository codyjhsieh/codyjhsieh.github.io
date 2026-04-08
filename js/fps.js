const fps = new (class {
  constructor() {
    this.node = document.getElementById("fps");
    this.frames = [];
    this.last = performance.now();
  }

  render() {
    const now = performance.now();
    const delta = now - this.last;
    this.last = now;
    const value = 1000 / delta;

    this.frames.push(value);
    if (this.frames.length > 20) {
      this.frames.shift();
    }

    const mean =
      this.frames.reduce((sum, frame) => sum + frame, 0) / this.frames.length;

    this.node.textContent = `FPS ${Math.round(mean)}`;
  }
})();

export { fps };
