import { Vec2 } from './Vec2.js';

export class Solver {
  static _clamp(value, min = 0, max = 1) {
    return value > max ? max : value < min ? min : value;
  }

  static solveCollision(bodyA, bodyB, manifold) {
    const { normal, overlapDepth: overlap, contactPoints } = manifold;

    // Separate Bodies
    if (bodyA.isStatic && !bodyB.isStatic) {
      bodyB.addForce(normal, overlap);
    } else if (!bodyA.isStatic && bodyB.isStatic) {
      bodyA.addForce(normal, -overlap);
    } else if (!bodyA.isStatic && !bodyB.isStatic) {
      bodyA.addForce(normal, -overlap * 0.5);
      bodyB.addForce(normal, overlap * 0.5);
    } else {
      return;
    }

    const vA = bodyA.linearVelocity;
    const vB = bodyB.linearVelocity;
    const wA = bodyA.angularVelocity;
    const wB = bodyB.angularVelocity;

    const mA = bodyA.inverseMass;
    const mB = bodyB.inverseMass;
    const iA = bodyA.inverseInertia;
    const iB = bodyB.inverseInertia;

    const rA = [];
    const rB = [];
    const tangent = [];
    const impulse = [];
    const friction = [];

    const restitution = Math.min(bodyA.restitution, bodyB.restitution);
    const staticFriction = Math.min(
      bodyA.friction.static,
      bodyB.friction.static
    );
    const kineticFriction = Math.min(
      bodyA.friction.kinetic,
      bodyB.friction.kinetic
    );

    const contactNum = contactPoints.length;
    const torqueFactor = 0.5;
    const biasFactor = 0.02;
    const biasSlop = 0.8;
    const impulseBias = Solver._clamp(overlap - biasSlop, 0, 1) * biasFactor;

    // Compute Impulses
    for (let i = 0; i < contactNum; ++i) {
      rA[i] = Vec2.subtract(contactPoints[i], bodyA.position);
      rB[i] = Vec2.subtract(contactPoints[i], bodyB.position);

      rA[i].scale(1 / contactNum);
      rB[i].scale(1 / contactNum);

      tangent[i] = new Vec2();
      impulse[i] = 0;
      friction[i] = 0;

      const rAPerp = rA[i].perp();
      const rBPerp = rB[i].perp();
      const vTanA = Vec2.scale(rAPerp, wA);
      const vTanB = Vec2.scale(rBPerp, wB);
      const relVel = Vec2.subtract(Vec2.add(vB, vTanB), Vec2.add(vA, vTanA));
      const velNormal = relVel.dot(normal);

      if (velNormal > 0) continue;

      tangent[i] = Vec2.subtract(relVel, Vec2.scale(normal, velNormal));

      if (tangent[i].magnitudeSq() < 1e-6) {
        tangent[i].zero();
      } else {
        tangent[i].normalize();
      }

      const rnA = rAPerp.dot(normal);
      const rnB = rBPerp.dot(normal);
      const rtA = rAPerp.dot(tangent[i]);
      const rtB = rBPerp.dot(tangent[i]);

      const normalDenom = mA + mB + rnA ** 2 * iA + rnB ** 2 * iB;
      impulse[i] = (-(1 + restitution) * velNormal + impulseBias) / normalDenom;

      const tangentDenom = mA + mB + rtA ** 2 * iA + rtB ** 2 * iB;
      friction[i] = -relVel.dot(tangent[i]) / tangentDenom;

      // Clamp impulse
      if (impulse[i] < 1e-6) impulse[i] = 0;

      const maxFriction = impulse[i] * kineticFriction;
      const minFriction = -maxFriction;

      // Coulomb's law
      if (Math.abs(friction[i]) > impulse[i] * staticFriction) {
        friction[i] = minFriction;
      }

      // Clamp friction
      friction[i] = Solver._clamp(friction[i], minFriction, maxFriction);

      impulse[i] /= contactNum;
      friction[i] /= contactNum;
    }

    // Apply Impulses
    for (let i = 0; i < contactNum; ++i) {
      bodyA.angularVelocity +=
        (rA[i].cross(Vec2.scale(normal, -impulse[i] * iA)) +
          rA[i].cross(Vec2.scale(tangent[i], -friction[i] * iA))) *
        torqueFactor;
      bodyB.angularVelocity +=
        (rB[i].cross(Vec2.scale(normal, impulse[i] * iB)) +
          rB[i].cross(Vec2.scale(tangent[i], friction[i] * iB))) *
        torqueFactor;

      bodyA.linearVelocity
        .add(normal, -impulse[i] * mA)
        .add(tangent[i], -friction[i] * mA);
      bodyB.linearVelocity
        .add(normal, impulse[i] * mB)
        .add(tangent[i], friction[i] * mB);
    }
  }
}
