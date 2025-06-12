import { Vec2 } from './Vec2.js';
import { FixedSpatialGrid } from './FixedSpatialGrid.js';
import { Collision } from './Collision.js';
import { Solver } from './Solver.js';
import { World } from './World.js';
import { Animator } from './Animator.js';
import { Event } from './Event.js';
import { Manifold } from './Manifold.js';
import { Mouse } from './Mouse.js';

export class Engine {
  constructor(option = {}) {
    option.grid || (option.grid = {});

    this.world = new World(this);
    this.animator = new Animator(option.targetFPS ?? 60);
    this.event = new Event();
    this.mouse = new Mouse();
    this.spatialGrid = new FixedSpatialGrid(
      option.grid.x ?? 0,
      option.grid.y ?? 0,
      option.grid.width ?? innerWidth,
      option.grid.height ?? innerHeight,
      option.grid.scale ?? 64
    );

    this.gravity = { x: 0, y: option.gravity ?? 9.81 };
    this.subSteps = option.subSteps ?? 4;
    this.removeOffBound = option.removeOffBound || false;
    this.contactPairs = new Map();
    this.manifolds = new Map();

    this.collisionTypes = {
      'circle-circle': 'circle-circle',
      'rectangle-circle': 'polygon-circle',
      'polygon-circle': 'polygon-circle',
      'polygon-polygon': 'polygon-polygon',
      'rectangle-polygon': 'polygon-polygon',
      'rectangle-rectangle': 'polygon-polygon',
      'polygon-capsule': 'polygon-capsule',
      'rectangle-capsule': 'polygon-capsule',
      'circle-capsule': 'circle-capsule',
      'capsule-capsule': 'capsule-capsule'
    };
  }

  run(deltaTime = 1000 / 60) {
    const subDeltaTime = deltaTime / this.subSteps;
    const newContactPairs = new Map();
    const newManifolds = new Map();

    for (let subStep = 1; subStep <= this.subSteps; ++subStep) {
      // Solve Constraints
      for (let i = 0; i < this.world.constraints.length; ++i) {
        this.world.constraints[i].constrain(subDeltaTime);
      }

      for (let i = 0; i < this.world.rigidBodies.length; ++i) {
        // Integration
        const bodyA = this.world.rigidBodies[i];
        const acceleration = Vec2.scale(this.gravity, bodyA.inverseMass);

        bodyA.linearVelocity.add(acceleration, subDeltaTime);
        !bodyA.isStatic && bodyA.translate(bodyA.linearVelocity, subDeltaTime);
        !bodyA.fixedRot && bodyA.rotate(bodyA.angularVelocity * subDeltaTime);

        // Broad Phase
        const nearby = this.spatialGrid.query(bodyA);

        for (const bodyB of nearby) {
          if (
            !bodyA.bound.overlaps(bodyB.bound) ||
            (!bodyA.jointSelfCollision &&
              !bodyB.jointSelfCollision &&
              bodyA.jointId === bodyB.jointId)
          ) {
            continue;
          }

          // Narrow Phase
          const manifold = this._getCollisionManifold(bodyA, bodyB);

          if (!manifold.collision) {
            continue;
          }

          // Collision Cycle
          const idA = bodyA.id;
          const idB = bodyB.id;
          const key = idA < idB ? idA * 1_000_000 + idB : idB * 1_000_000 + idA;
          const contactPair = { bodyA, bodyB };

          if (!this.contactPairs.has(key)) {
            this.event.emit('collisionStart', contactPair);
            bodyA.onCollisionStart(bodyB);
          } else {
            this.event.emit('collisionActive', contactPair);
            bodyA.onCollisionActive(bodyB);
          }

          newContactPairs.set(key, contactPair);

          // Resolution Phase
          if (
            bodyA.isSensor ||
            bodyB.isSensor ||
            (!bodyA.collision && !bodyB.collision)
          ) {
            continue;
          } else {
            Solver.solveCollision(bodyA, bodyB, manifold, subDeltaTime);
          }

          newManifolds.set(key, manifold);
        }

        // World Maintenance
        if (subStep == 1) {
          if (!bodyA.bound.overlaps(this.spatialGrid)) {
            this.spatialGrid.remove(bodyA);

            if (this.removeOffBound) {
              const last = this.world.rigidBodies.length - 1;

              this.world.rigidBodies[i] = this.world.rigidBodies[last];
              this.world.rigidBodies.pop();
              --i;
            }
          } else {
            this.spatialGrid.update(bodyA);
          }
        }
      }

      this.mouse.constrain(deltaTime);
    }

    // Collision Cycle Extended
    for (const [key, contactPair] of this.contactPairs) {
      if (!newContactPairs.has(key)) {
        this.event.emit('collisionEnd', contactPair);
        contactPair.bodyA.onCollisionEnd(contactPair.bodyB);
      }
    }

    this.contactPairs = newContactPairs;
    this.manifolds = newManifolds;
  }

  _getCollisionManifold(bodyA, bodyB) {
    const type = `${bodyA.label}-${bodyB.label}`;
    const labels = this.collisionTypes[type];
    let manifold = null;

    switch (labels) {
      case 'circle-circle':
        manifold = Collision.detectCircleToCircle(bodyA, bodyB);
        break;
      case 'polygon-circle':
        manifold = Collision.detectPolygonToCircle(bodyA, bodyB);
        break;
      case 'polygon-polygon':
        manifold = Collision.detectPolygonToPolygon(bodyA, bodyB);
        break;
      case 'polygon-capsule':
        manifold = Collision.detectPolygonToCapsule(bodyA, bodyB);
        break;
      case 'circle-capsule':
        manifold = Collision.detectCircleToCapsule(bodyA, bodyB);
        break;
      case 'capsule-capsule':
        manifold = Collision.detectCapsuleToCapsule(bodyA, bodyB);
        break;
    }

    return manifold || new Manifold(false);
  }
}
