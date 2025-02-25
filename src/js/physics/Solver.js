import { Vec2 } from './Vec2.js';

export class Solver {
  static _clamp(value, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value));
  }

  static resolveCollision(bodyA, bodyB, normal, overlapDepth, contactPoints) {
    const contactNum = contactPoints.length;
    const epsilon = 1e-3;

    // Separate Bodies
    overlapDepth /= contactNum;
    if (bodyA.isStatic && !bodyB.isStatic) {
      bodyB.translate(normal, overlapDepth);
      bodyB.linearVelocity.add(normal, overlapDepth * epsilon);
    } else if (!bodyA.isStatic && bodyB.isStatic) {
      bodyA.translate(normal, -overlapDepth);
      bodyA.linearVelocity.add(normal, -overlapDepth * epsilon);
    } else if (!bodyA.isStatic && !bodyB.isStatic) {
      bodyA.translate(normal, -overlapDepth * 0.25);
      bodyA.linearVelocity.add(normal, -overlapDepth * epsilon);

      bodyB.translate(normal, overlapDepth * 0.25);
      bodyB.linearVelocity.add(normal, overlapDepth * epsilon);
    } else return;

    const anchorA = [];
    const anchorB = [];
    const tangent = [];
    const normalImpulse = [];
    const tangentImpulse = [];
    const restitution = 1 + Math.min(bodyA.restitution, bodyB.restitution);
    const staticFriction = Math.max(
      bodyA.friction.static,
      bodyB.friction.static
    );
    const kineticFriction = Math.min(
      bodyA.friction.kinetic,
      bodyB.friction.kinetic
    );
    const mA = bodyA.inverseMass;
    const mB = bodyB.inverseMass;
    const iA = bodyA.inverseInertia;
    const iB = bodyB.inverseInertia;
    const torqueFactorA = 0.5;
    const torqueFactorB = 0.5;
    let normalImpulseAccu = 0;
    let tangentImpulseAccu = 0;
    let velocityBias = Math.max(0, overlapDepth * 0.1) * 0.1;

    // Compute Impulses
    for (let i = 0; i < contactNum; ++i) {
      velocityBias /= contactNum;
      anchorA[i] = Vec2.subtract(contactPoints[i], bodyA.position);
      anchorB[i] = Vec2.subtract(contactPoints[i], bodyB.position);
      tangent[i] = new Vec2();
      normalImpulse[i] = 0;
      tangentImpulse[i] = 0;

      const anchorAPerp = anchorA[i].perp();
      const anchorBPerp = anchorB[i].perp();
      const angularVelocityA = anchorAPerp.clone().scale(bodyA.angularVelocity);
      const angularVelocityB = anchorBPerp.clone().scale(bodyB.angularVelocity);
      const relativeVelocity = Vec2.subtract(
        Vec2.add(bodyB.linearVelocity, angularVelocityB),
        Vec2.add(bodyA.linearVelocity, angularVelocityA)
      );

      const velocityAlongNormal = relativeVelocity.dot(normal);
      const anchorAPerpAlongNormal = anchorAPerp.dot(normal);
      const anchorBPerpAlongNormal = anchorBPerp.dot(normal);

      if (velocityAlongNormal > 0) continue;
      else {
        tangent[i] = Vec2.subtract(
          relativeVelocity,
          normal.clone().scale(velocityAlongNormal)
        );
      }

      if (tangent[i].magnitudeSq() > 0) {
        tangent[i].normalize();
      } else tangent[i].zero();

      const velocityAlongTangent = relativeVelocity.dot(tangent[i]);
      const anchorAPerpAlongTangent = anchorAPerp.dot(tangent[i]);
      const anchorBPerpAlongTangent = anchorBPerp.dot(tangent[i]);

      const normalDenom =
        mA +
        mB +
        anchorAPerpAlongNormal ** 2 * iA +
        anchorBPerpAlongNormal ** 2 * iB;
      const tangentDenom =
        mA +
        mB +
        anchorAPerpAlongTangent ** 2 * iA +
        anchorBPerpAlongTangent ** 2 * iB;

      normalImpulse[i] =
        (-restitution * velocityAlongNormal + velocityBias) / normalDenom;
      tangentImpulse[i] = -velocityAlongTangent / tangentDenom;

      // Coulomb's law
      if (Math.abs(tangentImpulse[i]) > normalImpulse[i] * staticFriction)
        tangentImpulse[i] = -normalImpulse[i] * kineticFriction;

      normalImpulse[i] /= contactNum;
      tangentImpulse[i] /= contactNum;

      const oldNormalImpulse = normalImpulseAccu;
      normalImpulseAccu = Math.max(normalImpulseAccu + normalImpulse[i], 0);
      normalImpulse[i] = normalImpulseAccu - oldNormalImpulse;

      const oldTangentImpulse = tangentImpulseAccu;
      tangentImpulseAccu = this._clamp(
        tangentImpulseAccu + tangentImpulse[i],
        -normalImpulse[i],
        normalImpulse[i]
      );
      tangentImpulse[i] = tangentImpulseAccu - oldTangentImpulse;
    }

    // Apply Impulses
    for (let i = 0; i < contactNum; ++i) {
      const normalTorqueA = anchorA[i].cross(
        Vec2.scale(normal, -normalImpulse[i])
      );
      const normalTorqueB = anchorB[i].cross(
        Vec2.scale(normal, normalImpulse[i])
      );
      const tangentTorqueA = anchorA[i].cross(
        Vec2.scale(tangent[i], -tangentImpulse[i])
      );
      const tangentTorqueB = anchorB[i].cross(
        Vec2.scale(tangent[i], tangentImpulse[i])
      );

      bodyA.angularVelocity +=
        (normalTorqueA + tangentTorqueA) * iA * torqueFactorA;
      bodyB.angularVelocity +=
        (normalTorqueB + tangentTorqueB) * iB * torqueFactorB;

      bodyA.linearVelocity
        .add(normal, -normalImpulse[i] * mA)
        .add(tangent[i], -tangentImpulse[i] * mA);
      bodyB.linearVelocity
        .add(normal, normalImpulse[i] * mB)
        .add(tangent[i], tangentImpulse[i] * mB);
    }
  }
}
