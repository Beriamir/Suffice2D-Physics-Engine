import { Vec2 } from './Vec2.js';

export class ContactPoint {
  constructor(x, y) {
    this.position = new Vec2(x, y);
    this.impulse = 0;
    this.friction = 0;
  }

  setImpulse(impulse, friction) {
    this.impulse = impulse;
    this.friction = friction;
  }
}
