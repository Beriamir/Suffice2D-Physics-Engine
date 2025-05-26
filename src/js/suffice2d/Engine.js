import { Vec2 } from './Vec2.js';
import { UniformGrid } from './UniformGrid.js';
import { SpatialHashGrid } from './SpatialHashGrid.js';
import { Collision } from './Collision.js';
import { Solver } from './Solver.js';
import { World } from './World.js';
import { Animator } from './Animator.js';
import { Event } from './Event.js';
import { Manifold } from './Manifold.js';

export class Engine {
  constructor(option = {}) {
    const bound = option.bound ?? {};

    this.world = new World(this);
    this.animator = new Animator(option.targetFPS ?? 60);
    this.event = new Event();
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
      'circle-rectangle': 'circle-polygon',
      'circle-polygon': 'circle-polygon',
      'circle-capsule': 'circle-capsule',
      'rectangle-rectangle': 'polygon-polygon',
      'rectangle-polygon': 'polygon-polygon',
      'rectangle-capsule': 'polygon-capsule',
      'polygon-rectangle': 'polygon-polygon',
      'polygon-polygon': 'polygon-polygon',
      'polygon-capsule': 'polygon-capsule',
      'capsule-capsule': 'capsule-capsule'
    };
  }

  renderGrid(ctx) {
    this.grid.render(ctx);

    // Draw Origin
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
  }

  start(callback) {
    this.animator.start(callback);
  }

  pause() {
    this.animator.pause();
  }

  play() {
    this.animator.play();
  }

  run(deltaTime = 1000 / 60) {
    deltaTime /= this.subSteps;
    const newContactPairs = new Map();

    for (let subStep = 1; subStep <= this.subSteps; ++subStep) {
      // Solve Constraints
      for (let i = 0; i < this.world.constraints.length; ++i) {
        this.world.constraints[i].constrain(deltaTime);
      }

      for (let i = 0; i < this.world.count; ++i) {
        // Integration
        const bodyA = this.world.collections[i];
        const acceleration = Vec2.scale(this.gravity, bodyA.inverseMass);

        bodyA.linearVelocity.add(acceleration, deltaTime);
        if (!bodyA.isStatic) bodyA.translate(bodyA.linearVelocity, deltaTime);
        if (!bodyA.fixedRot) bodyA.rotate(bodyA.angularVelocity * deltaTime);
        
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

          // Collision Cycle
          const idA = bodyA.id;
          const idB = bodyB.id;
          const key = idA < idB ? idA * 1_000_000 + idB : idB * 1_000_000 + idA;
          const contactPair = { bodyA, bodyB };

          if (!this.contactPairs.has(key)) {
            this.event.emit('collisionStart', contactPair);
            if (bodyA.onCollisionStart) bodyA.onCollisionStart(bodyB);
          } else {
            if (!bodyA.isSensor && !bodyB.isSensor) {
              this.event.emit('collisionActive', contactPair);
              if (bodyA.onCollisionActive) bodyA.onCollisionActive(bodyB);
            }
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
          this.grid.updateData(bodyA);

          if (!bodyA.bound.overlaps(this.grid)) {
            this.grid.removeData(bodyA);

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
        if (contactPair.bodyA.onCollisionEnd) {
          contactPair.bodyA.onCollisionEnd(contactPair.bodyB);
        }
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
      case 'circle-polygon':
        Collision.detectCircleToRectangle(bodyA, bodyB, manifold);
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
