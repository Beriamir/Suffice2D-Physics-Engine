import { Vec2 } from './Vec2.js';

export class Mouse {
  constructor(x, y) {
    this.position = new Vec2(x, y);
    this.selectedBody = null;
    this.selectedAnchor = null;
  }

  setPosition(x, y) {
    this.position.set(x, y);
  }

  touch(body) {
    let condition = false;

    switch (body.label) {
      case 'circle': {
        const distanceSq = Vec2.distanceSq(this.position, body.position);
        const radiusSq = body.radius * body.radius;

        if (distanceSq < radiusSq) {
          condition = true;
        }

        break;
      }
      case 'rectangle':
      case 'polygon': {
        const n = body.vertices.length;
        condition = true;

        for (let i = 0; i < n; ++i) {
          const a = body.vertices[i];
          const b = body.vertices[(i + 1) % n];

          const ab = Vec2.sub(b, a);
          const ap = Vec2.sub(this.position, a);
          const cross = ab.cross(ap);

          if (cross < 0) {
            condition = false;
            break;
          }
        }

        break;
      }

      case 'capsule': {
        const ab = Vec2.sub(body.center2, body.center1);
        const ap = Vec2.sub(this.position, body.center1);
        const abLengthSq = ab.magnitudeSq();
        const projection = ap.dot(ab) / abLengthSq;
        const contactPoint = Vec2.add(body.center1, ab, projection);

        if (projection < 0) {
          contactPoint.copy(body.center1);
        } else if (projection > 1) {
          contactPoint.copy(body.center2);
        }

        const distanceSq = Vec2.distanceSq(contactPoint, this.position);
        const radiusSq = body.radius * body.radius;

        if (distanceSq < radiusSq) {
          condition = true;
        }

        break;
      }
    }

    return condition;
  }

  grab(body) {
    if (!this.selectedBody) {
      this.selectedBody = body;
      this.selectedAnchor = this.selectedBody.addAnchorPoint(
        this.position.clone()
      );
    }
  }

  constrain(deltaTime = 1000 / 60) {
    if (this.selectedBody) {
      this.selectedBody.addAnchorVelocity(
        this.selectedAnchor,
        this.position,
        deltaTime
      );
    }
  }

  drop() {
    if (this.selectedBody) {
      this.selectedBody.removeAnchorPoint(this.selectedAnchor);
    }

    this.selectedBody = null;
    this.selectedAnchor = null;
  }

  render(ctx) {
    if (this.selectedAnchor) {
      ctx.beginPath();
      ctx.moveTo(this.selectedAnchor.x, this.selectedAnchor.y);
      ctx.lineTo(this.position.x, this.position.y);
      ctx.strokeStyle = 'white';
      ctx.stroke();
    }
  }
}
