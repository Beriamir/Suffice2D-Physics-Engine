export class Animator {
  constructor(targetFPS) {
    this.interval = 1000 / targetFPS;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.simulationState = true;
    this.simulationId = null;
  }

  pause() {
    cancelAnimationFrame(this.simulationId);
    this.simulationState = false;
  }

  play(callback) {
    this.simulationState = true;
    this.lastTime = performance.now();

    this.start(this.callback);
  }

  start(callback) {
    this.callback = callback;
    const now = performance.now();
    const delta = now - this.lastTime;
    const clampedDelta = delta > 41.66 ? 41.66 : delta;

    this.lastTime = now;
    this.accumulator += clampedDelta;

    if (this.accumulator >= this.interval) {
      this.callback(clampedDelta);
      this.accumulator %= this.interval;
    }

    if (this.simulationState) {
      this.simulationId = requestAnimationFrame(() => this.start(callback));
    }
  }
}
