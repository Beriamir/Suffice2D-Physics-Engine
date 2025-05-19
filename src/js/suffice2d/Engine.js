import { Vec2 } from './Vec2.js';
import { SpatialGrid } from './SpatialGrid.js';
import { Collision } from './Collision.js';
import { Solver } from './Solver.js';
import { World } from './World.js';
import { Animator } from './Animator.js';
import { Event } from './Event.js';

export class Engine {
  constructor(option = {}) {
    this.world = new World(this);
    this.animator = new Animator(option.targetFPS ?? 60);
    this.gravity = { x: 0, y: option.gravity ?? 9.81 };
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

    this.event = new Event();
    this.contactPairs = [];
  }

  renderGrid(ctx) {
    this.grid.render(ctx);

    // Draw Origin
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
  }

  forEach(callback) {
    for (let i = 0; i < this.world.collections.length; ++i) {
      const body = this.world.collections[i];

      callback(body);
    }
  }

  run(deltaTime = 1000 / 60) {
    deltaTime /= this.subSteps;
    const newContactPairs = [];

    for (let subStep = 1; subStep <= this.subSteps; ++subStep) {
      for (let i = 0; i < this.world.constraints.length; ++i) {
        const constraint = this.world.constraints[i];

        constraint.constrain(deltaTime);
      }

      for (let i = 0; i < this.world.collections.length; ++i) {
        const bodyA = this.world.collections[i];
        const force = this.gravity;
        const acceleration = Vec2.scale(force, bodyA.inverseMass);

        bodyA.linearVelocity.add(acceleration, deltaTime);
        if (!bodyA.isStatic) {
          bodyA.addForce(bodyA.linearVelocity, deltaTime);
        }
        if (!bodyA.fixedRotation) {
          bodyA.rotate(bodyA.angularVelocity * deltaTime);
        }
        bodyA.contactPoints.length = 0;
        bodyA.edges.length = 0;

        const nearby = this.grid.queryNearby(bodyA);

        for (const bodyB of nearby) {
          if (
            !bodyA.allowContact &&
            !bodyB.allowContact &&
            bodyA.jointId === bodyB.jointId
          ) {
            continue;
          }

          const manifold = this._detectCollision(bodyA, bodyB);

          if (!manifold) continue;

          const idA = bodyA.id;
          const idB = bodyB.id;
          const key = idA < idB ? idA * 1_000_000 + idB : idB * 1_000_000 + idA;
          const contactPair = {
            key,
            bodyA,
            bodyB
          };

          let exists = false;
          for (let i = 0; i < this.contactPairs.length; ++i) {
            if (contactPair.key === this.contactPairs[i].key) {
              exists = true;
              break;
            }
          }

          newContactPairs.push(contactPair);

          if (!exists) {
            this.event.emit('collisionStart', { bodyA, bodyB });
            if (bodyA.onCollisionStart) {
              bodyA.onCollisionStart(bodyB);
            }
          } else {
            this.event.emit('collisionActive', { bodyA, bodyB });
            if (bodyA.onCollisionActive) {
              bodyA.onCollisionActive(bodyB);
            }
          }

          if (
            bodyA.isSensor ||
            bodyB.isSensor ||
            (bodyA.isStatic && bodyB.isStatic)
          ) {
            continue;
          }

          Solver.removeOverlap(bodyA, bodyB, manifold);
          Solver.solveCollision(bodyA, bodyB, manifold);
        }

        if (subStep == 1) {
          this.grid.updateData(bodyA);

          if (!bodyA.bound.overlaps(this.grid)) {
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
      }
    }

    for (let i = 0; i < this.contactPairs.length; ++i) {
      const old = this.contactPairs[i];
      let exists = false;

      for (let j = 0; j < newContactPairs.length; ++j) {
        const newPair = newContactPairs[j];

        if (newPair.key === old.key) {
          exists = true;
          break;
        }
      }

      if (!exists) {
        this.event.emit('collisionEnd', { bodyA: old.bodyA, bodyB: old.bodyB });
        if (old.bodyA.onCollisionEnd) {
          old.bodyA.onCollisionEnd(old.bodyB);
        }
      }
    }

    this.contactPairs = newContactPairs;
  }

  _detectCollision(bodyA, bodyB) {
    const collisionType = Collision.getCollisionType(bodyA.label, bodyB.label);

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
