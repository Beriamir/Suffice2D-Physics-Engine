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
    } else return;

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

    // Compute Impulses
    const contactNum = contactPoints.length;
    const biasFactor = 0.03;
    const biasSlop = 0.9;
    const impulseBias = Solver._clamp(overlap - biasSlop, 0, 1) * biasFactor;

    for (let i = 0; i < contactNum; ++i) {
      rA[i] = Vec2.subtract(contactPoints[i], bodyA.position);
      rB[i] = Vec2.subtract(contactPoints[i], bodyB.position);

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

      if (tangent[i].magnitudeSq() > 1e-12) {
        tangent[i].normalize();
      } else tangent[i].zero();

      const rnA = rAPerp.dot(normal);
      const rnB = rBPerp.dot(normal);
      const rtA = rAPerp.dot(tangent[i]);
      const rtB = rBPerp.dot(tangent[i]);
      const normalDenom = mA + mB + rnA * rnA * iA + rnB * rnB * iB;
      const tangentDenom = mA + mB + rtA * rtA * iA + rtB * rtB * iB;

      impulse[i] = (-(1 + restitution) * velNormal + impulseBias) / normalDenom;
      friction[i] = -(relVel.dot(tangent[i]) + impulseBias) / tangentDenom;

      const maxStatic = impulse[i] * staticFriction;
      const maxKinetic = impulse[i] * kineticFriction;

      // Coulomb's law
      if (Math.abs(friction[i]) > maxStatic) {
        friction[i] = Solver._clamp(friction[i], -maxKinetic, maxKinetic);
      } else {
        friction[i] = Solver._clamp(friction[i], -maxStatic, maxStatic);
      }

      impulse[i] /= contactNum;
      friction[i] /= contactNum;
    }

    // Apply Impulses
    for (let i = 0; i < contactNum; ++i) {
      bodyA.angularVelocity +=
        rA[i].cross(Vec2.scale(normal, -impulse[i] * iA)) +
        rA[i].cross(Vec2.scale(tangent[i], -friction[i] * iA));
      bodyB.angularVelocity +=
        rB[i].cross(Vec2.scale(normal, impulse[i] * iB)) +
        rB[i].cross(Vec2.scale(tangent[i], friction[i] * iB));

      bodyA.linearVelocity
        .add(normal, -impulse[i] * mA)
        .add(tangent[i], -friction[i] * mA);
      bodyB.linearVelocity
        .add(normal, impulse[i] * mB)
        .add(tangent[i], friction[i] * mB);
    }
  }
}
