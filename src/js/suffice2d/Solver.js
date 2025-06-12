import { Vec2 } from './Vec2.js';

export class Solver {
  static solveCollision(bodyA, bodyB, manifold, deltaTime) {
    const { normal, overlapDepth, contactPoints: cp } = manifold;

    // Positional Correction
    if (bodyA.isStatic && !bodyB.isStatic) {
      bodyB.translate(normal, overlapDepth);
    } else if (!bodyA.isStatic && bodyB.isStatic) {
      bodyA.translate(normal, -overlapDepth);
    } else if (!bodyA.isStatic && !bodyB.isStatic) {
      bodyA.translate(normal, -overlapDepth * 0.5);
      bodyB.translate(normal, overlapDepth * 0.5);
    }

    const contactNum = cp.length;
    const invContactNum = 1 / contactNum;

    const mA = bodyA.inverseMass;
    const mB = bodyB.inverseMass;
    const iA = bodyA.inverseInertia;
    const iB = bodyB.inverseInertia;

    const beta = 0.1;
    const slop = 0.02;
    const bias = (Math.max(overlapDepth - slop, 0) * beta) / deltaTime;
    const restitution = Math.min(bodyA.restitution, bodyB.restitution);
    const sFriction = Math.max(bodyA.staticFriction, bodyB.staticFriction);
    const kFriction = Math.max(bodyA.kineticFriction, bodyB.kineticFriction);

    const rAPerp = [];
    const rBPerp = [];

    const normalTorqueA = new Float32Array(contactNum);
    const normalTorqueB = new Float32Array(contactNum);
    const tangentTorqueA = new Float32Array(contactNum);
    const tangentTorqueB = new Float32Array(contactNum);

    const totalNormalImpulse = new Float32Array(contactNum);
    const tangentialImpulse = new Array(contactNum);

    // Compute Correct Linear And Angular Impulses
    for (let i = 0; i < contactNum; ++i) {
      rAPerp[i] = Vec2.sub(cp[i], bodyA.position).leftPerp();
      rBPerp[i] = Vec2.sub(cp[i], bodyB.position).leftPerp();
      const velNormal = Vec2.sub(
        Vec2.add(
          bodyB.linearVelocity,
          Vec2.scale(rBPerp[i], bodyB.angularVelocity)
        ),
        Vec2.add(
          bodyA.linearVelocity,
          Vec2.scale(rAPerp[i], bodyA.angularVelocity)
        )
      ).dot(normal);

      if (velNormal > 0) {
        normalTorqueA[i] = 0.0;
        normalTorqueB[i] = 0.0;
        totalNormalImpulse[i] = 0.0;

        continue;
      }

      const rnA = rAPerp[i].dot(normal);
      const rnB = rBPerp[i].dot(normal);
      const effNormalMass = mA + mB + rnA * rnA * iA + rnB * rnB * iB;

      if (effNormalMass != 0) {
        totalNormalImpulse[i] =
          (-(1 + restitution) * velNormal + bias) / effNormalMass;
      }

      totalNormalImpulse[i] *= invContactNum;
      normalTorqueA[i] = rnA * totalNormalImpulse[i];
      normalTorqueB[i] = rnB * totalNormalImpulse[i];
    }

    // Apply Velocity Correction
    for (let i = 0; i < contactNum; ++i) {
      bodyA.angularVelocity -= normalTorqueA[i] * iA;
      bodyB.angularVelocity += normalTorqueB[i] * iB;
      bodyA.linearVelocity.sub(normal, totalNormalImpulse[i] * mA);
      bodyB.linearVelocity.add(normal, totalNormalImpulse[i] * mB);
    }

    // Compute Tangential Impulses
    for (let i = 0; i < contactNum; ++i) {
      const relVel = Vec2.sub(
        Vec2.add(
          bodyB.linearVelocity,
          Vec2.scale(rBPerp[i], bodyB.angularVelocity)
        ),
        Vec2.add(
          bodyA.linearVelocity,
          Vec2.scale(rAPerp[i], bodyA.angularVelocity)
        )
      );
      const tangent = Vec2.sub(
        relVel,
        Vec2.scale(normal, relVel.dot(normal))
      ).normalize();

      const rtA = rAPerp[i].dot(tangent);
      const rtB = rBPerp[i].dot(tangent);
      const effTangentMass = mA + mB + rtA * rtA * iA + rtB * rtB * iB;
      let frictionImpulse = 0.0;

      if (effTangentMass != 0) {
        frictionImpulse = -relVel.dot(tangent) / effTangentMass;

        if (Math.abs(frictionImpulse) >= totalNormalImpulse[i] * sFriction) {
          frictionImpulse = -totalNormalImpulse[i] * kFriction;
        }
      }

      tangentTorqueA[i] = rtA * frictionImpulse;
      tangentTorqueB[i] = rtB * frictionImpulse;
      tangentialImpulse[i] = Vec2.scale(tangent, frictionImpulse);
    }

    // Apply Friction
    for (let i = 0; i < contactNum; ++i) {
      bodyA.angularVelocity -= tangentTorqueA[i] * iA;
      bodyB.angularVelocity += tangentTorqueB[i] * iB;
      bodyA.linearVelocity.sub(tangentialImpulse[i], mA);
      bodyB.linearVelocity.add(tangentialImpulse[i], mB);
    }
  }
}
