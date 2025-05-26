import { Vec2 } from './Vec2.js';
import { Utils } from './Utils.js';

export class Constraint {
  constructor(properties) {
    for (const property in properties) {
      const value = properties[property];

      switch (property) {
        case 'id': {
          this.id = value;
          break;
        }
        case 'label': {
          this.label = value;
          break;
        }
        case 'engine': {
          this.engine = value;
          break;
        }
        case 'selfCollision': {
          this.selfCollision = value;
          break;
        }
      }
    }

    this.engine.world.addConstraint(this);
    this.pairs = [];
  }

  addJoint(bodyA, bodyB, anchorA, anchorB, option = {}) {
    const idA = bodyA.id;
    const idB = bodyB.id;
    const pairId = idA < idB ? idA * 1_000_000 + idB : idB * 1_000_000 + idA;

    bodyA.jointId = this.id;
    bodyB.jointId = this.id;
    bodyA.jointSelfCollision = this.selfCollision;
    bodyB.jointSelfCollision = this.selfCollision;

    bodyA.addAnchorPoint(anchorA);
    bodyB.addAnchorPoint(anchorB);
    bodyA.anchorPairs.push({
      id: pairId, // Unique ID for later removal of the anchor A and B
      anchorA: anchorA,
      anchorB: anchorB
    });

    this.pairs.push({ id: pairId, bodyA, bodyB, anchorA, anchorB, option });
    this.engine.world.addBodies([bodyA, bodyB]);
  }

  removeJoint(bodyA, bodyB) {
    const idA = bodyA.id;
    const idB = bodyB.id;
    const pairId = idA < idB ? idA * 1_000_000 + idB : idB * 1_000_000 + idA;

    for (let i = 0; i < this.pairs.length; ++i) {
      const pair = this.pairs[i];

      if (pair.id === pairId) {
        this.pairs.splice(i, 1);

        for (let i = 0; i < bodyA.anchorPairs.length; ++i) {
          const anchorPair = bodyA.anchorPairs[i];

          if (anchorPair.id === pairId) {
            bodyA.removeAnchorPoint(anchorPair.anchorA);
            bodyB.removeAnchorPoint(anchorPair.anchorB);
            bodyA.anchorPairs.splice(i, 1);

            break;
          }
        }

        break;
      }
    }

    bodyA.jointSelfCollision = true;
    bodyB.jointSelfCollision = true;
    bodyA.jointId = Math.random() * 256727;
    bodyB.jointId = Math.random() * 276325;
  }

  prismaticJoint(deltaTime) {
    for (let i = 0; i < this.pairs.length; i++) {
      const { bodyA, anchorA, bodyB, anchorB, axis, maxLength } = this.pairs[i];
      //
    }
  }

  fixedJoint(deltaTime) {
    for (let i = 0; i < this.pairs.length; ++i) {
      const { bodyA, bodyB, anchorA, anchorB, option } = this.pairs[i];
      const delta = Vec2.subtract(anchorB, anchorA);
      const distance = delta.magnitude();

      if (distance === 0) continue;

      const stiffness = option.stiffness || 0.5;
      const springiness = option.springiness || 0.5;
      const restLength = option.restLength || 0;
      const normal = delta.scale(1 / distance);
      const correction = distance - restLength;

      if (bodyA.isStatic && !bodyB.isStatic) {
        bodyB.translate(normal, -correction);
      } else if (!bodyA.isStatic && bodyB.isStatic) {
        bodyA.translate(normal, correction);
      } else if (!bodyA.isStatic && !bodyB.isStatic) {
        bodyA.translate(normal, correction * 0.5);
        bodyB.translate(normal, -correction * 0.5);
      }

      const vA = bodyA.linearVelocity;
      const vB = bodyB.linearVelocity;
      const wA = bodyA.angularVelocity;
      const wB = bodyB.angularVelocity;

      const mA = bodyA.inverseMass;
      const mB = bodyB.inverseMass;
      const iA = bodyA.inverseInertia;
      const iB = bodyB.inverseInertia;

      const staticFriction = Math.min(
        bodyA.staticFriction,
        bodyB.staticFriction
      );
      const kineticFriction = Math.min(
        bodyA.kineticFriction,
        bodyB.kineticFriction
      );

      const rA = Vec2.subtract(anchorA, bodyA.position);
      const rB = Vec2.subtract(anchorB, bodyB.position);
      const rAPerp = rA.perp();
      const rBPerp = rB.perp();
      const vTanA = Vec2.scale(rAPerp, wA);
      const vTanB = Vec2.scale(rBPerp, wB);
      const relVel = Vec2.subtract(Vec2.add(vB, vTanB), Vec2.add(vA, vTanA));
      const velNormal = relVel.dot(normal);

      const tangent = Vec2.subtract(
        relVel,
        Vec2.scale(normal, velNormal)
      ).normalize();

      const rnA = rAPerp.dot(normal);
      const rnB = rBPerp.dot(normal);
      const rtA = rAPerp.dot(tangent);
      const rtB = rBPerp.dot(tangent);

      const effMassN = mA + mB + rnA * rnA * iA + rnB * rnB * iB;
      const effMassT = mA + mB + rtA * rtA * iA + rtB * rtB * iB;

      if (effMassN === 0 || effMassT === 0) {
        continue;
      }

      const beta = 0.2 / deltaTime;
      const slop = correction * 0.8;
      const bias = Math.max(correction - slop, 0) * beta;
      const impulse = -((1 - springiness) * velNormal + bias) / effMassN;
      let friction = relVel.dot(tangent) / effMassT;

      // Clamp Friction
      if (Math.abs(friction) >= impulse * staticFriction) {
        friction = impulse * kineticFriction;
      }

      bodyA.angularVelocity += rnA * -impulse * iA;
      bodyA.angularVelocity += rtA * -friction * iA;
      bodyB.angularVelocity += rnB * impulse * iB;
      bodyB.angularVelocity += rtB * friction * iB;

      const relRotation = bodyB.rotation - bodyA.rotation;
      const relAngularVel = bodyB.angularVelocity - bodyA.angularVelocity;
      const effInertia = iA + iB;

      if (effInertia > 0) {
        const angularBias = relRotation * beta;
        const angularImpulse = -(angularBias + relAngularVel) / effInertia;

        bodyA.angularVelocity += -angularImpulse * iA;
        bodyB.angularVelocity += angularImpulse * iB;
      }

      bodyA.linearVelocity.add(normal, -impulse * mA);
      bodyA.linearVelocity.add(tangent, -friction * mA);
      bodyB.linearVelocity.add(normal, impulse * mB);
      bodyB.linearVelocity.add(tangent, friction * mB);
    }
  }

  revoluteJoint(deltaTime) {
    for (let i = 0; i < this.pairs.length; i++) {
      const { bodyA, bodyB, anchorA, anchorB, option } = this.pairs[i];
      const delta = Vec2.subtract(anchorB, anchorA);
      const distance = delta.magnitude();

      if (distance === 0) continue;

      const stiffness = option.stiffness ?? 0.5;
      const springiness = option.springiness ?? 0.5;
      const restLength = option.restLength ?? 0;
      const minAngle = option.minAngle ?? -Infinity;
      const maxAngle = option.maxAngle ?? Infinity;
      const normal = delta.scale(1 / distance);
      const correction = distance - restLength;

      if (bodyA.isStatic && !bodyB.isStatic) {
        bodyB.translate(normal, -correction);
      } else if (!bodyA.isStatic && bodyB.isStatic) {
        bodyA.translate(normal, correction);
      } else if (!bodyA.isStatic && !bodyB.isStatic) {
        bodyA.translate(normal, correction * 0.5);
        bodyB.translate(normal, -correction * 0.5);
      }

      const vA = bodyA.linearVelocity;
      const vB = bodyB.linearVelocity;
      const wA = bodyA.angularVelocity;
      const wB = bodyB.angularVelocity;

      const mA = bodyA.inverseMass;
      const mB = bodyB.inverseMass;
      const iA = bodyA.inverseInertia;
      const iB = bodyB.inverseInertia;

      const staticFriction = Math.min(
        bodyA.staticFriction,
        bodyB.staticFriction
      );
      const kineticFriction = Math.min(
        bodyA.kineticFriction,
        bodyB.kineticFriction
      );

      const rA = Vec2.subtract(anchorA, bodyA.position);
      const rB = Vec2.subtract(anchorB, bodyB.position);
      const rAPerp = rA.perp();
      const rBPerp = rB.perp();
      const vTanA = Vec2.scale(rAPerp, wA);
      const vTanB = Vec2.scale(rBPerp, wB);
      const relVel = Vec2.subtract(Vec2.add(vB, vTanB), Vec2.add(vA, vTanA));
      const velNormal = relVel.dot(normal);

      const tangent = Vec2.subtract(relVel, Vec2.scale(normal, velNormal));

      const rnA = rAPerp.dot(normal);
      const rnB = rBPerp.dot(normal);
      const rtA = rAPerp.dot(tangent);
      const rtB = rBPerp.dot(tangent);

      const effMassN = mA + mB + rnA * rnA * iA + rnB * rnB * iB;
      const effMassT = mA + mB + rtA * rtA * iA + rtB * rtB * iB;

      if (effMassN === 0 || effMassT === 0) continue;

      const beta = 0.2 / deltaTime;
      const slop = correction * 0.8;
      const bias = Math.max(correction - slop, 0) * beta;
      const impulse = -((1 - springiness) * velNormal + bias) / effMassN;
      let friction = relVel.dot(tangent) / effMassT;

      // Clamp Friction
      if (Math.abs(friction) >= impulse * staticFriction) {
        friction = impulse * kineticFriction;
      }

      bodyA.angularVelocity += rnA * -impulse * iA;
      bodyA.angularVelocity += rtA * -friction * iA;
      bodyB.angularVelocity += rnB * impulse * iB;
      bodyB.angularVelocity += rtB * friction * iB;

      const relRotation = bodyB.rotation - bodyA.rotation;
      let angleError = 0;
      let limitExceeded = false;

      if (relRotation < minAngle) {
        angleError = relRotation - minAngle;
        limitExceeded = true;
      } else if (relRotation > maxAngle) {
        angleError = relRotation - maxAngle;
        limitExceeded = true;
      }

      if (limitExceeded) {
        const effInertia = iA + iB;

        if (effInertia !== 0) {
          const bias = beta * angleError;
          const angleImpulse = -bias / effInertia;

          bodyA.angularVelocity += -angleImpulse * iA;
          bodyB.angularVelocity += angleImpulse * iB;
        }
      }

      bodyA.linearVelocity.add(normal, -impulse * mA);
      bodyA.linearVelocity.add(tangent, -friction * mA);
      bodyB.linearVelocity.add(normal, impulse * mB);
      bodyB.linearVelocity.add(tangent, friction * mB);
    }
  }

  distanceJoint(deltaTime) {
    for (let i = 0; i < this.pairs.length; i++) {
      const { bodyA, bodyB, anchorA, anchorB, option } = this.pairs[i];
      const delta = Vec2.subtract(anchorB, anchorA);
      const distance = delta.magnitude();

      if (distance === 0) continue;

      const stiffness = option.stiffness ?? 0.5;
      const springiness = option.springiness ?? 0.5;
      const restLength = option.restLength ?? 0;
      const normal = delta.scale(1 / distance);
      const correction = distance - restLength;

      if (bodyA.isStatic && !bodyB.isStatic) {
        bodyB.translate(normal, -correction);
      } else if (!bodyA.isStatic && bodyB.isStatic) {
        bodyA.translate(normal, correction);
      } else if (!bodyA.isStatic && !bodyB.isStatic) {
        bodyA.translate(normal, correction * 0.5);
        bodyB.translate(normal, -correction * 0.5);
      }

      const vA = bodyA.linearVelocity;
      const vB = bodyB.linearVelocity;
      const wA = bodyA.angularVelocity;
      const wB = bodyB.angularVelocity;

      const mA = bodyA.inverseMass;
      const mB = bodyB.inverseMass;
      const iA = bodyA.inverseInertia;
      const iB = bodyB.inverseInertia;

      const staticFriction = Math.min(
        bodyA.staticFriction,
        bodyB.staticFriction
      );
      const kineticFriction = Math.min(
        bodyA.kineticFriction,
        bodyB.kineticFriction
      );

      const rA = Vec2.subtract(anchorA, bodyA.position);
      const rB = Vec2.subtract(anchorB, bodyB.position);
      const rAPerp = rA.perp();
      const rBPerp = rB.perp();
      const vTanA = Vec2.scale(rAPerp, wA);
      const vTanB = Vec2.scale(rBPerp, wB);
      const relVel = Vec2.subtract(Vec2.add(vB, vTanB), Vec2.add(vA, vTanA));
      const velNormal = relVel.dot(normal);

      const tangent = Vec2.subtract(
        relVel,
        Vec2.scale(normal, velNormal)
      ).normalize();

      const rtA = rAPerp.dot(tangent);
      const rtB = rBPerp.dot(tangent);
      const rnA = rAPerp.dot(normal);
      const rnB = rBPerp.dot(normal);

      const effNormalMass = mA + mB + rnA * rnA * iA + rnB * rnB * iB;
      const effTangentMass = mA + mB + rtA * rtA * iA + rtB * rtB * iB;

      if (effNormalMass === 0 || effTangentMass === 0) {
        continue;
      }

      const beta = 0.2 / deltaTime;
      const slop = correction * 0.8;
      const bias = Math.max(correction - slop, 0) * beta;
      let impulse = -((1 - springiness) * velNormal + bias) / effNormalMass;
      let friction = relVel.dot(tangent) / effTangentMass;

      // Clamp Friction
      if (Math.abs(friction) >= impulse * staticFriction) {
        friction = impulse * kineticFriction;
      }

      bodyA.angularVelocity += rA.cross(normal) * -impulse * iA;
      bodyA.angularVelocity += rA.cross(tangent) * -friction * iA;
      bodyB.angularVelocity += rB.cross(normal) * impulse * iB;
      bodyB.angularVelocity += rB.cross(tangent) * friction * iB;

      bodyA.linearVelocity.add(normal, -impulse * mA);
      bodyA.linearVelocity.add(tangent, -friction * mA);
      bodyB.linearVelocity.add(normal, impulse * mB);
      bodyB.linearVelocity.add(tangent, friction * mB);
    }
  }

  springJoint(deltaTime) {
    for (let i = 0; i < this.pairs.length; i++) {
      const { bodyA, bodyB, anchorA, anchorB, option } = this.pairs[i];
      const delta = Vec2.subtract(anchorB, anchorA);
      const distance = delta.magnitude();

      if (distance === 0) continue;

      const stiffness = option.stiffness ?? 0.5;
      const restLength = option.restLength ?? 0;
      const damping = option.damping ?? 1;
      const normal = delta.scale(1 / distance);
      const correction = distance - restLength;

      const vA = bodyA.linearVelocity;
      const vB = bodyB.linearVelocity;
      const wA = bodyA.angularVelocity;
      const wB = bodyB.angularVelocity;

      const mA = bodyA.inverseMass;
      const mB = bodyB.inverseMass;
      const iA = bodyA.inverseInertia;
      const iB = bodyB.inverseInertia;

      const staticFriction = Math.min(
        bodyA.staticFriction,
        bodyB.staticFriction
      );
      const kineticFriction = Math.min(
        bodyA.kineticFriction,
        bodyB.kineticFriction
      );

      const rA = Vec2.subtract(anchorA, bodyA.position);
      const rB = Vec2.subtract(anchorB, bodyB.position);
      const rAPerp = rA.perp();
      const rBPerp = rB.perp();
      const vTanA = Vec2.scale(rAPerp, wA);
      const vTanB = Vec2.scale(rBPerp, wB);
      const relVel = Vec2.subtract(Vec2.add(vB, vTanB), Vec2.add(vA, vTanA));
      const velNormal = relVel.dot(normal);

      const tangent = Vec2.subtract(
        relVel,
        Vec2.scale(normal, velNormal)
      ).normalize();

      const rnA = rAPerp.dot(normal);
      const rnB = rBPerp.dot(normal);
      const rtA = rAPerp.dot(tangent);
      const rtB = rBPerp.dot(tangent);

      const effNormalMass = mA + mB + rnA * rnA * iA + rnB * rnB * iB;
      const effTangentMass = mA + mB + rtA * rtA * iA + rtB * rtB * iB;

      if (effNormalMass === 0 || effTangentMass === 0) {
        continue;
      }

      const f = 2 * Math.PI * stiffness;
      const k = effNormalMass * f * f;
      const d = 2 * effNormalMass * damping * f;

      let impulse = (-k * correction - d * velNormal) / effNormalMass;
      let friction = (-d * relVel.dot(tangent)) / effTangentMass;

      // Clamp Friction
      if (Math.abs(friction) >= impulse * staticFriction) {
        friction = impulse * kineticFriction;
      }

      bodyA.angularVelocity += rnA * -impulse * iA;
      bodyA.angularVelocity += rtA * -friction * iA;
      bodyB.angularVelocity += rnB * impulse * iB;
      bodyB.angularVelocity += rtB * friction * iB;

      bodyA.linearVelocity.add(normal, -impulse * mA);
      bodyA.linearVelocity.add(tangent, -friction * mA);
      bodyB.linearVelocity.add(normal, impulse * mB);
      bodyB.linearVelocity.add(tangent, friction * mB);
    }
  }

  constrain(deltaTime) {
    switch (this.label) {
      case 'distanceJoint': {
        this.distanceJoint(deltaTime);
        break;
      }

      case 'revoluteJoint': {
        this.revoluteJoint(deltaTime);
        break;
      }

      case 'springJoint': {
        this.springJoint(deltaTime);
        break;
      }

      case 'prismaticJoint': {
        this.prismaticJoint(deltaTime);
        break;
      }

      case 'fixedJoint': {
        this.fixedJoint(deltaTime);
        break;
      }
    }
  }
}
