import { Vec2 } from './Vec2.js';

export class Solver {
  static _clamp(value, min = 0, max = 1) {
    return value > max ? max : value < min ? min : value;
  }

  static solveCollision(bodyA, bodyB, manifold) {
    const { normal, overlapDepth: overlap, contactPoints } = manifold;

    // Separate Bodies
    if (!bodyA.isStatic && bodyB.isStatic) {
      bodyA.addForce(normal, -overlap);
    } else if (bodyA.isStatic && !bodyB.isStatic) {
      bodyB.addForce(normal, overlap);
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
    const vImpulse = [];
    const wImpulse = [];

    const biasFactor = 0.02;
    const biasSlop = 0.8;
    const impulseBias = this._clamp(overlap - biasSlop, 0, 1) * biasFactor;

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
    const torqueFactorA = 0.5;
    const torqueFactorB = 0.5;

    // Compute Impulses
    for (let i = 0; i < contactNum; ++i) {
      rA[i] = Vec2.subtract(contactPoints[i], bodyA.position);
      rB[i] = Vec2.subtract(contactPoints[i], bodyB.position);
      tangent[i] = new Vec2();
      vImpulse[i] = 0;
      wImpulse[i] = 0;

      const rAPerp = rA[i].perp();
      const rBPerp = rB[i].perp();
      const vTanA = rAPerp.clone().scale(wA);
      const vTanB = rBPerp.clone().scale(wB);
      const relativeVelocity = Vec2.subtract(
        Vec2.add(vB, vTanB),
        Vec2.add(vA, vTanA)
      );

      const velNormal = relativeVelocity.dot(normal);
      const rnA = rAPerp.dot(normal);
      const rnB = rBPerp.dot(normal);

      if (velNormal > 0) continue;

      tangent[i] = Vec2.subtract(
        relativeVelocity,
        normal.clone().scale(velNormal)
      );

      if (tangent[i].magnitudeSq() == 0) {
        tangent[i].zero();
      } else tangent[i].normalize();

      const velTangent = relativeVelocity.dot(tangent[i]);
      const rtA = rAPerp.dot(tangent[i]);
      const rtB = rBPerp.dot(tangent[i]);

      const normalDenom = mA + mB + rnA ** 2 * iA + rnB ** 2 * iB;
      const tangentDenom = mA + mB + rtA ** 2 * iA + rtB ** 2 * iB;

      vImpulse[i] =
        (-(1 + restitution) * velNormal + impulseBias) / normalDenom;
      wImpulse[i] = -(velTangent + impulseBias) / tangentDenom;

      // Coulomb's law
      if (Math.abs(wImpulse[i]) > vImpulse[i] * staticFriction)
        wImpulse[i] = -vImpulse[i] * kineticFriction;

      wImpulse[i] = Solver._clamp(
        wImpulse[i],
        -vImpulse[i] * staticFriction,
        vImpulse[i] * staticFriction
      );

      vImpulse[i] /= contactNum;
      wImpulse[i] /= contactNum;
    }

    // Apply Impulses
    for (let i = 0; i < contactNum; ++i) {
      const nTorqueImpulseA = rA[i].cross(Vec2.scale(normal, -vImpulse[i]));
      const tTorqueImpulseA = rA[i].cross(Vec2.scale(tangent[i], -wImpulse[i]));
      const nTorqueImpulseB = rB[i].cross(Vec2.scale(normal, vImpulse[i]));
      const tTorqueImpulseB = rB[i].cross(Vec2.scale(tangent[i], wImpulse[i]));

      bodyA.angularVelocity +=
        nTorqueImpulseA * iA * torqueFactorA +
        tTorqueImpulseA * iA * torqueFactorA;
      bodyB.angularVelocity +=
        nTorqueImpulseB * iB * torqueFactorB +
        tTorqueImpulseB * iB * torqueFactorB;

      bodyA.linearVelocity
        .add(normal, -vImpulse[i] * mA)
        .add(tangent[i], -wImpulse[i] * mA);
      bodyB.linearVelocity
        .add(normal, vImpulse[i] * mB)
        .add(tangent[i], wImpulse[i] * mB);
    }
  }
}
