import { Vec2 } from './Vec2.js';

export class Solver {
  static _clamp(value, min = 0, max = 1) {
    return value > max ? max : value < min ? min : value;
  }

  static removeOverlap(bodyA, bodyB, manifold) {
    const { normal, overlapDepth: overlap } = manifold;

    if (bodyA.isStatic && !bodyB.isStatic) {
      bodyB.addForce(normal, overlap);
    } else if (!bodyA.isStatic && bodyB.isStatic) {
      bodyA.addForce(normal, -overlap);
    } else if (!bodyA.isStatic && !bodyB.isStatic) {
      bodyA.addForce(normal, -overlap * 0.5);
      bodyB.addForce(normal, overlap * 0.5);
    }
  }

  static solveCollision(bodyA, bodyB, manifold) {
    const { normal, overlapDepth: overlap, contactPoints } = manifold;

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
    const biasFactor = 0.02;
    const biasSlop = 0.8;
    const impulseBias = this._clamp(overlap - biasSlop, 0, 1) * biasFactor;

    // Compute Impulses
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

      if (velNormal > 0) {
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

      impulse[i] = (-(1 + restitution) * velNormal + impulseBias) / effMassN;
      friction[i] = -relVel.dot(tangent[i]) / effMassT;

      const maxStatic = impulse[i] * staticFriction;
      const maxKinetic = impulse[i] * kineticFriction;

      // Clamp Friction
      if (friction[i] > maxStatic) {
        friction[i] = this._clamp(friction[i], -maxKinetic, maxKinetic);
      } else if (friction[i] < -maxStatic) {
        friction[i] = this._clamp(friction[i], -maxKinetic, maxKinetic);
      } else {
        friction[i] = this._clamp(friction[i], -maxStatic, maxStatic);
      }
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
