export class Utils {
  static clamp(value, min = 0, max = 1) {
    return value > max ? max : value < min ? min : value;
  }

  static throttle(callback, delay) {
    let lastTime = 0;
    return (...args) => {
      const now = performance.now();
      if (now - lastTime > delay) {
        callback(...args);
        lastTime = now;
      }
    };
  }
}
