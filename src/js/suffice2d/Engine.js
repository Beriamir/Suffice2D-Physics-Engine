import { Vec2 } from './Vec2.js';
import { UniformGrid } from './UniformGrid.js';
import { SpatialHashGrid } from './SpatialHashGrid.js';
import { Collision } from './Collision.js';
import { Solver } from './Solver.js';
import { World } from './World.js';
import { Animator } from './Animator.js';
import { Event } from './Event.js';
import { Manifold } from './Manifold.js';
import { Mouse } from './Mouse.js';

export class Engine {
  constructor(option = {}) {
    const bound = option.bound ?? {};

    this.world = new World(this);
    this.animator = new Animator(option.targetFPS ?? 60);
    this.event = new Event();
    this.mouse = new Mouse();
    this.grid = new UniformGrid(
      bound.x ?? 0,
      bound.y ?? 0,
      bound.width ?? innerWidth,
      bound.height ?? innerHeight,
      bound.scale ?? Math.sqrt(innerWidth) + Math.sqrt(innerHeight)
    );

    this.gravity = { x: 0, y: option.gravity ?? 9.81 };
    this.subSteps = option.subSteps ?? 4;
    this.removeOffBound = option.removeOffBound ?? false;
    this.contactPairs = new Map();

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

  pause() {
    this.animator.pause();
  }

  play() {
    this.animator.play();
  }

  start(callback) {
    this.animator.start(callback);
  }

  run(deltaTime = 1000 / 60) {
    const subDeltaTime = deltaTime / this.subSteps;
    const newContactPairs = new Map();

    for (let subStep = 1; subStep <= this.subSteps; ++subStep) {
      // Solve Constraints
      for (let i = 0; i < this.world.constraints.length; ++i) {
        this.world.constraints[i].constrain(subDeltaTime);
      }

      for (let i = 0; i < this.world.count; ++i) {
        // Integration
        const bodyA = this.world.collections[i];
        const acceleration = Vec2.scale(this.gravity, bodyA.inverseMass);

        bodyA.linearVelocity.add(acceleration, subDeltaTime);
        !bodyA.isStatic && bodyA.translate(bodyA.linearVelocity, subDeltaTime);
        !bodyA.fixedRot && bodyA.rotate(bodyA.angularVelocity * subDeltaTime);

        // Remove contactPoints and contactEdges
        // This is for visual debugging
        bodyA.contactPoints.length = 0;
        bodyA.edges.length = 0;

        // Broad Phase
        const nearby = this.grid.queryNearby(bodyA);

        for (const bodyB of nearby) {
          if (
            !bodyA.jointSelfCollision &&
            !bodyB.jointSelfCollision &&
            bodyA.jointId === bodyB.jointId
          ) {
            continue;
          }

          // Narrow Phase
          const manifold = this._getCollisionManifold(
            bodyA,
            bodyB,
            new Manifold()
          );

          if (!manifold.collision) continue;
          
          for (let i = 0; i < manifold.contactPoints.length; ++i) {
            bodyA.contactPoints.push(manifold.contactPoints[i]);
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
            (bodyA.isStatic && bodyB.isStatic)
          ) {
            continue;
          } else Solver.solveCollision(bodyA, bodyB, manifold);
        }

        // World Maintenance
        if (subStep === 1) {
          this.grid.update(bodyA);

          if (!bodyA.bound.overlaps(this.grid)) {
            this.grid.remove(bodyA);

            if (this.removeOffBound) {
              const last = this.world.count - 1;

              this.world.collections[i] = this.world.collections[last];
              this.world.collections[last] = bodyA;
              this.world.collections.pop();

              continue;
            }
          }
        }
      }
    }

    // Collision Cycle Extended
    for (const key of this.contactPairs.keys()) {
      const contactPair = this.contactPairs.get(key);

      if (!newContactPairs.has(key)) {
        this.event.emit('collisionEnd', contactPair);
        contactPair.bodyA.onCollisionEnd(contactPair.bodyB);
      }
    }

    this.contactPairs = newContactPairs;
  }

  _getCollisionManifold(bodyA, bodyB, manifold) {
    const type = `${bodyA.label}-${bodyB.label}`;
    const collisionType = this.collisionTypes[type];

    switch (collisionType) {
      case 'circle-circle':
        Collision.detectCircleToCircle(bodyA, bodyB, manifold);
        break;
      case 'polygon-circle':
        Collision.detectPolygonToCircle(bodyA, bodyB, manifold);
        break;
      case 'polygon-polygon':
        Collision.detectPolygonToPolygon(bodyA, bodyB, manifold);
        break;
      case 'polygon-capsule':
        Collision.detectPolygonToCapsule(bodyA, bodyB, manifold);
        break;
      case 'circle-capsule':
        Collision.detectCircleToCapsule(bodyA, bodyB, manifold);
        break;
      case 'capsule-capsule':
        Collision.detectCapsuleToCapsule(bodyA, bodyB, manifold);
        break;
    }

    return manifold;
  }
}
