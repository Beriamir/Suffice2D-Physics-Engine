import { Vec2 } from './Vec2.js';
import { SpatialGrid } from './SpatialGrid.js';
import { Collision } from './Collision.js';
import { Solver } from './Solver.js';
import { World } from './World.js';
import { Animator } from './Animator.js';

export class Engine {
  constructor(option = {}) {
    this.world = new World(this);
    this.animator = new Animator(option.targetFPS ?? 60);
    this.gravity = { x: 0, y: option.gravity ?? 9.81 };
    this.velocityDamp = option.velocityDamp ?? 0.999;
    this.subSteps = option.subSteps ?? 4;
    this.removeOffBound = option.removeOffBound ?? false;

    option.bound = option.bound ?? {};

    this.grid = new SpatialGrid(
      option.bound.x ?? 0,
      option.bound.y ?? 0,
      option.bound.width ?? innerWidth,
      option.bound.height ?? innerHeight,
      option.bound.scale ?? 50
    );
  }

  renderGrid(ctx) {
    this.grid.render(ctx);
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
  }

  removeOffBound(body, boundX, boundY, boundW, boundH) {
    const { min, max, width, height } = body.bound;

    if (
      min.x < boundX - width ||
      min.y < boundY - height ||
      max.x > boundW + width ||
      max.y > boundH + height
    ) {
      this.world.removeBody(body);
    }
  }

  run(deltaTime = 1000 / 60) {
    deltaTime /= this.subSteps;

    for (let subStep = 1; subStep <= this.subSteps; ++subStep) {
      for (let i = 0; i < this.world.collections.length; ++i) {
        const bodyA = this.world.collections[i];
        const force = this.gravity;
        const acceleration = Vec2.scale(force, bodyA.inverseMass);

        bodyA.linearVelocity.add(acceleration, deltaTime);
        if (!bodyA.isStatic) bodyA.addForce(bodyA.linearVelocity, deltaTime);
        if (bodyA.rotation) bodyA.rotate(bodyA.angularVelocity * deltaTime);

        if (subStep == 1) {
          bodyA.linearVelocity.scale(this.velocityDamp);
          bodyA.angularVelocity *= this.velocityDamp;
          this.grid.updateData(bodyA);

          if (
            bodyA.bound.min.x < this.grid.bound[0] - bodyA.bound.width ||
            bodyA.bound.min.y < this.grid.bound[1] - bodyA.bound.height ||
            bodyA.bound.max.x > this.grid.bound[2] + bodyA.bound.width ||
            bodyA.bound.max.y > this.grid.bound[3] + bodyA.bound.height
          ) {
            this.grid.removeData(bodyA);

            if (this.removeOffBound) {
              const last = this.world.collections.length - 1;

              this.world.collections[i] = this.world.collections[last];
              this.world.collections[last] = bodyA;
              this.world.collections.pop();

              continue;
            }
          }
        }

        bodyA.contactPoints.length = 0;
        bodyA.edges.length = 0;

        const nearby = this.grid.queryNearby(bodyA);

        for (const bodyB of nearby) {
          const manifold = this._detectCollision(bodyA, bodyB);

          if (manifold) {
            Solver.solveCollision(bodyA, bodyB, manifold);
          }
        }
      }
    }
  }

  _getCollisionType(labelA, labelB) {
    if (labelA == 'circle' && labelB == 'circle') return 'circle-circle';

    if (labelA == 'circle' && (labelB == 'rectangle' || labelB == 'polygon')) {
      return 'circle-polygon';
    }

    if (
      (labelA == 'rectangle' || labelA == 'polygon') &&
      (labelB == 'rectangle' || labelB == 'polygon')
    ) {
      return 'polygon-polygon';
    }

    if ((labelA == 'rectangle' || labelA == 'polygon') && labelB == 'capsule') {
      return 'polygon-capsule';
    }

    if (labelA == 'circle' && labelB == 'capsule') return 'circle-capsule';

    if (labelA == 'capsule' && labelB == 'capsule') return 'capsule-capsule';

    return 'unknown';
  }

  _detectCollision(bodyA, bodyB) {
    const collisionType = this._getCollisionType(bodyA.label, bodyB.label);

    switch (collisionType) {
      case 'circle-circle': {
        const manifold = Collision.detectCircleToCircle(bodyA, bodyB);

        return manifold.collision ? manifold : null;
        break;
      }

      case 'circle-polygon': {
        const manifold = Collision.detectCircleToRectangle(bodyA, bodyB);

        return manifold.collision ? manifold : null;
        break;
      }

      case 'polygon-polygon': {
        const manifold = Collision.detectPolygonToPolygon(bodyA, bodyB);

        return manifold.collision ? manifold : null;
        break;
      }

      case 'polygon-capsule': {
        const manifold = Collision.detectPolygonToCapsule(bodyA, bodyB);

        return manifold.collision ? manifold : null;
        break;
      }

      case 'circle-capsule': {
        const manifold = Collision.detectCircleToCapsule(bodyA, bodyB);

        return manifold.collision ? manifold : null;
        break;
      }

      case 'capsule-capsule': {
        const manifold = Collision.detectCapsuleToCapsule(bodyA, bodyB);

        return manifold.collision ? manifold : null;
        break;
      }
    }
  }
}

// Runge-Kutta-4th
/*
let tempForce = null;
let tempAcceleration = null;
const acceleration = Vec2.scale(this.gravity, bodyA.inverseMass);
const k1 = Vec2.scale(acceleration, deltaTime);

tempForce = Vec2.add(this.gravity, Vec2.scale(k1, 0.5));
tempAcceleration = Vec2.scale(tempForce, bodyA.inverseMass);
const k2 = Vec2.scale(tempAcceleration, deltaTime);

tempForce = Vec2.add(this.gravity, Vec2.scale(k2, 0.5));
tempAcceleration = Vec2.scale(tempForce, bodyA.inverseMass);
const k3 = Vec2.scale(tempAcceleration, deltaTime);

tempForce = Vec2.add(this.gravity, Vec2.scale(k3, deltaTime));
tempAcceleration = Vec2.scale(tempForce, bodyA.inverseMass);
const k4 = Vec2.scale(tempAcceleration, deltaTime);

bodyA.linearVelocity.add(
  Vec2.scale(k1.add(k2.scale(2)).add(k3.scale(2)).add(k4), 1 / 6)
);
*/
