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
    this.min.set(Infinity, Infinity);
    this.max.set(-Infinity, -Infinity);
    const radius = this.body.radius;

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

      case 'pill':
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

  render(ctx) {
    ctx.strokeStyle = 'rgb(24,141,67)';
    ctx.strokeRect(this.min.x, this.min.y, this.width, this.height);
  }
}
