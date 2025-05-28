import { Vec2 } from './Vec2.js';

export class Manifold {
  constructor() {
    this.id = null;
    this.collision = null;
    this.normal = new Vec2();
    this.overlapDepth = Infinity;
    this.contactPoints = [];
  }

  reset() {
    this.id = null;
    this.collision = null;
    this.normal.zero();
    this.overlapDepth = Infinity;
    this.contactPoints.length = 0;

    return this;
  }
}
