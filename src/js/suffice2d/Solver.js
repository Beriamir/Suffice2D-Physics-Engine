import { Vec2 } from './Vec2.js';

export class Solver {
  static solveCollision(bodyA, bodyB, manifold) {
    const { normal, overlapDepth, contactPoints } = manifold;

    if (bodyA.isStatic && !bodyB.isStatic) {
      bodyB.translate(normal, overlapDepth);
    } else if (!bodyA.isStatic && bodyB.isStatic) {
      bodyA.translate(normal, -overlapDepth);
    } else if (!bodyA.isStatic && !bodyB.isStatic) {
      bodyA.translate(normal, -overlapDepth * 0.5);
      bodyB.translate(normal, overlapDepth * 0.5);
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
    const staticFriction = Math.min(bodyA.staticFriction, bodyB.staticFriction);
    const kineticFriction = Math.min(
      bodyA.kineticFriction,
      bodyB.kineticFriction
    );

    const contactNum = contactPoints.length;

    // Compute Impulses
    for (let i = 0; i < contactNum; ++i) {
      rA[i] = Vec2.subtract(contactPoints[i], bodyA.position);
      rB[i] = Vec2.subtract(contactPoints[i], bodyB.position);

      const rAPerp = rA[i].perp();
      const rBPerp = rB[i].perp();
      const vTanA = Vec2.scale(rAPerp, wA);
      const vTanB = Vec2.scale(rBPerp, wB);
      const relVel = Vec2.subtract(Vec2.add(vB, vTanB), Vec2.add(vA, vTanA));
      const velNormal = relVel.dot(normal);

      if (velNormal > 0) {
        tangent[i] = new Vec2();
        impulse[i] = 0;
        friction[i] = 0;

        continue;
      }

      tangent[i] = Vec2.subtract(
        relVel,
        Vec2.scale(normal, velNormal)
      ).normalize();

      const rnA = rAPerp.dot(normal);
      const rnB = rBPerp.dot(normal);
      const rtA = rAPerp.dot(tangent[i]);
      const rtB = rBPerp.dot(tangent[i]);

      const effMassN = mA + mB + rnA * rnA * iA + rnB * rnB * iB;
      const effMassT = mA + mB + rtA * rtA * iA + rtB * rtB * iB;

      if (effMassN === 0 || effMassT === 0) {
        continue;
      }

      const beta = 0.02;
      const slop = overlapDepth * 0.8;
      const bias = Math.max(overlapDepth - slop, 0) * beta;

      impulse[i] = (-(1 + restitution) * velNormal + bias) / effMassN;
      friction[i] = -relVel.dot(tangent[i]) / effMassT;

      // Clamp Impulses
      if (impulse[i] < 0) impulse[i] = 0;

      if (Math.abs(friction[i]) >= impulse[i] * staticFriction) {
        friction[i] = -impulse[i] * kineticFriction;
      }

      impulse[i] /= contactNum;
      friction[i] /= contactNum;
    }

    // Apply Impulses
    const torqueFactor = 0.9;

    for (let i = 0; i < contactNum; ++i) {
      const torqueA =
        rA[i].cross(normal) * impulse[i] * iA +
        rA[i].cross(tangent[i]) * friction[i] * iA;
      const torqueB =
        rB[i].cross(normal) * impulse[i] * iB +
        rB[i].cross(tangent[i]) * friction[i] * iB;

      bodyA.angularVelocity += -torqueA * torqueFactor;
      bodyB.angularVelocity += torqueB * torqueFactor;

      bodyA.linearVelocity
        .add(normal, -impulse[i] * mA)
        .add(tangent[i], -friction[i] * mA);
      bodyB.linearVelocity
        .add(normal, impulse[i] * mB)
        .add(tangent[i], friction[i] * mB);
    }
  }
}
