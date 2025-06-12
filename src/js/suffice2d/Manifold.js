export class Manifold {
  constructor(collision, normal, overlapDepth, contactPoints) {
    this.collision = collision;
    this.normal = normal ?? null;
    this.overlapDepth = overlapDepth ?? null;
    this.contactPoints = contactPoints ?? null;
  }

  render(ctx) {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < this.contactPoints.length; ++i) {
      const point = this.contactPoints[i];

      ctx.beginPath();
      ctx.arc(point.x, point.y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
