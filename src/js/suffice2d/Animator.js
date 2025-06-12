export class Animator {
  constructor(targetFPS) {
    this.interval = 1000 / targetFPS;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.simulationState = true;
    this.simulationId = null;
    this.minDeltaTime = 1000 / 12;
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
    const deltaTime = now - this.lastTime;
    const clampedDelta =
      deltaTime > this.minDeltaTime ? this.minDeltaTime : deltaTime;

    this.lastTime = now;
    this.accumulator += clampedDelta;

    if (this.accumulator >= this.interval) {
      callback(clampedDelta);
      this.accumulator %= this.interval;
    }

    if (this.simulationState) {
      this.simulationId = requestAnimationFrame(() => this.start(callback));
    }
  }
}
