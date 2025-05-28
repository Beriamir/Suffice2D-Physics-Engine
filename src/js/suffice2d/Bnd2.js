import { Vec2 } from './Vec2.js';

export class Bnd2 {
  constructor(body) {
    this.body = body;
    this.min = new Vec2(Infinity, Infinity);
    this.max = new Vec2(-Infinity, -Infinity);
    this.width = 0;
    this.height = 0;

    this.update();
  }

  update() {
    const radius = this.body.radius;

    this.min.set(Infinity, Infinity);
    this.max.set(-Infinity, -Infinity);

    switch (this.body.label) {
      case 'circle':
        this.min.x = this.body.position.x - radius;
        this.min.y = this.body.position.y - radius;
        this.max.x = this.body.position.x + radius;
        this.max.y = this.body.position.y + radius;
        break;

      case 'rectangle':
      case 'polygon':
        this.body.vertices.forEach(vertex => {
          if (vertex.x < this.min.x) this.min.x = vertex.x;
          if (vertex.y < this.min.y) this.min.y = vertex.y;
          if (vertex.x > this.max.x) this.max.x = vertex.x;
          if (vertex.y > this.max.y) this.max.y = vertex.y;
        });
        break;

      case 'capsule':
        for (const vertex of [this.body.startPoint, this.body.endPoint]) {
          if (vertex.x - radius < this.min.x) this.min.x = vertex.x - radius;
          if (vertex.y - radius < this.min.y) this.min.y = vertex.y - radius;
          if (vertex.x + radius > this.max.x) this.max.x = vertex.x + radius;
          if (vertex.y + radius > this.max.y) this.max.y = vertex.y + radius;
        }
        break;
    }

    this.width = this.max.x - this.min.x;
    this.height = this.max.y - this.min.y;
  }

  contains(point) {
    return (
      point.x >= this.min.x &&
      point.y >= this.min.y &&
      point.x <= this.max.x &&
      point.y <= this.max.y
    );
  }

  overlaps(bound) {
    return (
      this.max.x >= bound.min.x &&
      this.max.y >= bound.min.y &&
      this.min.x <= bound.max.x &&
      this.min.y <= bound.max.y
    );
  }

  static expand(bound, scalar = 1) {
    return {
      min: {
        x: bound.min.x - scalar,
        y: bound.min.y - scalar
      },
      max: {
        x: bound.max.x + scalar,
        y: bound.max.y + scalar
      }
    };
  }

  static overlaps(boundA, boundB) {
    return (
      boundA.max.x >= boundB.min.x &&
      boundA.max.y >= boundB.min.y &&
      boundA.min.x <= boundB.max.x &&
      boundA.min.y <= boundB.max.y
    );
  }

  render(ctx) {
    ctx.strokeStyle = '#ffffff80';
    ctx.strokeRect(this.min.x, this.min.y, this.width, this.height);
  }
}
