export class Animator {
  constructor(targetFPS) {
    this.interval = 1000 / targetFPS;
    this.lastTime = performance.now();
    this.accumulator = 0;
  }

  start(callback) {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;
    this.accumulator += delta;

    if (this.accumulator >= this.interval) {
      callback(delta);
      this.accumulator %= this.interval;
    }

    requestAnimationFrame(() => this.start(callback));
  }
}
