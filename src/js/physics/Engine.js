import { Vector2 } from './Vector2.js';
import { SpatialGrid } from './SpatialGrid.js';
import { Bounds } from './Bounds.js';
import { Composite } from './Composite.js';
import { Collision } from './Collision.js';
import { Resolver } from './Resolver.js';

export class Engine {
  constructor(option = {}) {
    this.world = [];
    this.gravity = {
      x: 0,
      y: option.gravity || (typeof option.gravity !== 'number' && 9.81) || 0
    };

    if (!option.grid) option.grid = {};
    this.grid = new SpatialGrid(
      option.grid.x || 0,
      option.grid.y || 0,
      option.grid.width || innerWidth,
      option.grid.height || innerHeight,
      option.grid.scale || 40
    );
    this.subSteps = option.subSteps || 4;
  }

  render(ctx) {
    for (let i = 0; i < this.world.length; i++) {
      const body = this.world[i];

      if (body.label === 'circle') {
        ctx.beginPath();
        ctx.arc(body.position.x, body.position.y, body.radius, 0, Math.PI * 2);
      } else if (body.label === 'polygon' || body.label === 'rectangle') {
        ctx.beginPath();
        ctx.moveTo(body.vertices[0].x, body.vertices[0].y);
        for (let i = 1; i < body.vertices.length; i++)
          ctx.lineTo(body.vertices[i].x, body.vertices[i].y);
        ctx.closePath();
      } else if (body.label === 'pill') {
        const startDirP1 = Vector2.subtract(body.vertices[0], body.startPoint);
        const startDirP2 = Vector2.subtract(body.vertices[2], body.endPoint);
        const endDirP1 = Vector2.subtract(body.vertices[1], body.startPoint);
        const endDirP2 = Vector2.subtract(body.vertices[3], body.endPoint);

        const startAngleP1 = Math.atan2(startDirP1.y, startDirP1.x);
        const startAngleP2 = Math.atan2(startDirP2.y, startDirP2.x);
        const endAngleP1 = Math.atan2(endDirP1.y, endDirP1.x);
        const endAngleP2 = Math.atan2(endDirP2.y, endDirP2.x);

        ctx.beginPath();
        ctx.arc(
          body.startPoint.x,
          body.startPoint.y,
          body.radius,
          startAngleP1,
          endAngleP1
        );
        ctx.arc(
          body.endPoint.x,
          body.endPoint.y,
          body.radius,
          startAngleP2,
          endAngleP2
        );
        ctx.closePath();
      }

      if (body.wireframe) {
        if (body.axisPoint) {
          ctx.moveTo(body.position.x, body.position.y);
          ctx.lineTo(body.axisPoint.x, body.axisPoint.y);
        } else {
          ctx.moveTo(body.startPoint.x, body.startPoint.y);
          ctx.lineTo(body.endPoint.x, body.endPoint.y);
        }
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      } else {
        ctx.fillStyle = body.color;
        ctx.fill();
      }
    }
  }

  renderGrid(ctx) {
    this.grid.render(ctx);
  }

  renderBounds(ctx) {
    this.world.forEach(body => {
      const { min, width, height } = Bounds.getBound(body);

      ctx.strokeStyle = '#e08728';
      ctx.strokeRect(min[0], min[1], width, height);
    });
  }

  run(deltaTime = 1000 / 60) {
    for (let subStep = 1; subStep <= this.subSteps; subStep++) {
      const dt = deltaTime / this.subSteps;
      for (let i = 0; i < this.world.length; i++) {
        const bodyA = this.world[i];
        const acceleration = Vector2.scale(this.gravity, bodyA.inverseMass);

        bodyA.velocity.add(acceleration, dt);
        bodyA.position.add(bodyA.velocity, dt);
        bodyA.updateVertices();
        bodyA.prevPosition.copy(bodyA.position);
        bodyA.rotate(bodyA.angularVelocity * dt);

        if (subStep === this.subSteps) {
          this.grid.updateData(bodyA);
        }

        const nearby = this.grid.queryNearby(bodyA);

        for (let i = 0; i < nearby.length; i++) {
          const bodyB = nearby[i];
          const boundA = bodyA.getBound();
          const boundB = bodyB.getBound();

          if (!Bounds.overlaps(boundA, boundB)) {
            continue;
          } else {
            this._handleCollision(bodyA, bodyB);
          }
        }
      }
    }

    // Remove offgrid bodies from the spatial hash grid
    this.world.forEach(body => {
      const { min, max, width, height } = Bounds.getBound(body);

      if (
        min[0] < -width ||
        min[1] < -height ||
        max[0] > this.grid.bounds[1][0] + width ||
        max[1] > this.grid.bounds[1][1] + height
      ) {
        this.grid.removeData(body);
      }
    });
  }

  _getCollisionType(labelA, labelB) {
    if (labelA === 'circle' && labelB === 'circle') return 'circle-circle';
    if (labelA === 'circle' && (labelB === 'rectangle' || labelB === 'polygon'))
      return 'circle-rectangle-polygon';
    if (
      (labelA === 'rectangle' || labelA === 'polygon') &&
      (labelB === 'rectangle' || labelB === 'polygon')
    )
      return 'rectangle-polygon';
    if ((labelA === 'rectangle' || labelA === 'polygon') && labelB === 'pill')
      return 'polygon-pill';
    if (labelA === 'circle' && labelB === 'pill') return 'circle-pill';
    if (labelA === 'pill' && labelB === 'pill') return 'pill-pill';
    return 'unknown';
  }

  _handleCollision(bodyA, bodyB) {
    const collisionType = this._getCollisionType(bodyA.label, bodyB.label);

    switch (collisionType) {
      case 'circle-circle': {
        const { collision, normal, overlapDepth } =
          Collision.detectCircleToCircle(bodyA, bodyB);
        if (collision) {
          const contactPoints = Collision.supportsCircleToCircle(bodyA, normal);
          Resolver.separatesBodies(bodyA, bodyB, normal, overlapDepth);
          Resolver.resolveCollision(bodyA, bodyB, normal, contactPoints);
        }
        break;
      }

      case 'circle-rectangle-polygon': {
        const { collision, normal, overlapDepth } =
          Collision.detectCircleToRectangle(bodyA, bodyB);
        if (collision) {
          const contactPoints = Collision.supportsCircleToRectangle(
            bodyA.position,
            bodyB.vertices,
            normal
          );
          Resolver.separatesBodies(bodyA, bodyB, normal, overlapDepth);
          Resolver.resolveCollision(bodyA, bodyB, normal, contactPoints);
        }
        break;
      }

      case 'rectangle-polygon': {
        const { collision, normal, overlapDepth } =
          Collision.detectPolygonToPolygon(bodyA, bodyB);
        if (collision) {
          const contactPoints = Collision.supportsPolygonToPolygon(
            bodyA,
            bodyB
          );
          Resolver.separatesBodies(bodyA, bodyB, normal, overlapDepth);
          Resolver.resolveCollision(bodyA, bodyB, normal, contactPoints);
        }
        break;
      }

      case 'polygon-pill': {
        const { collision, normal, overlapDepth } =
          Collision.detectPolygonToPill(bodyA, bodyB);
        if (collision) {
          const contactPoints = Collision.supportsPolygonToPill(
            bodyA,
            bodyB,
            normal
          );
          Resolver.separatesBodies(bodyA, bodyB, normal, overlapDepth);
          Resolver.resolveCollision(bodyA, bodyB, normal, contactPoints);
        }
        break;
      }

      case 'circle-pill': {
        const { collision, normal, overlapDepth } =
          Collision.detectCircleToPill(bodyA, bodyB);
        if (collision) {
          const contactPoints = Collision.supportsCircleToPill(bodyA, normal);
          Resolver.separatesBodies(bodyA, bodyB, normal, overlapDepth);
          Resolver.resolveCollision(bodyA, bodyB, normal, contactPoints);
        }
        break;
      }

      case 'pill-pill': {
        const { collision, normal, overlapDepth } = Collision.detectPillToPill(
          bodyA,
          bodyB
        );
        if (collision) {
          const contactPoints = Collision.supportsPillToPill(
            bodyA,
            bodyB,
            normal
          );
          Resolver.separatesBodies(bodyA, bodyB, normal, overlapDepth);
          Resolver.resolveCollision(bodyA, bodyB, normal, contactPoints);
        }
        break;
      }
    }
  }
}
