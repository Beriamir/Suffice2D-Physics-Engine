import { Vec2 } from './Vec2.js';

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

  _clamp(value, min = 0, max = 1) {
    return value < min ? min : value > max ? max : value;
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
      id: pairId,
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
      const { bodyA, anchorA, bodyB, anchorB, option } = this.pairs[i];

      const localAxis = option.localAxis ?? new Vec2(0, 1);
      const axis = localAxis.rotate(bodyA.rotation);
      const perpendicular = axis.leftPerp();

      const delta = Vec2.sub(anchorB, anchorA);
      const distance = delta.magnitude();
      if (distance === 0) continue;

      const stiffness = option.stiffness ?? 0.5;
      const min = option.min ?? -Infinity;
      const max = option.max ?? +Infinity;

      const mA = bodyA.inverseMass;
      const mB = bodyB.inverseMass;
      const iA = bodyA.inverseInertia;
      const iB = bodyB.inverseInertia;

      const rA = Vec2.sub(anchorA, bodyA.position);
      const rB = Vec2.sub(anchorB, bodyB.position);
      const rAPerp = rA.rigthPerp();
      const rBPerp = rB.rigthPerp();

      const vA = bodyA.linearVelocity;
      const vB = bodyB.linearVelocity;
      const wA = bodyA.angularVelocity;
      const wB = bodyB.angularVelocity;

      const vTanA = Vec2.scale(rAPerp, wA);
      const vTanB = Vec2.scale(rBPerp, wB);
      const relVel = Vec2.sub(Vec2.add(vB, vTanB), Vec2.add(vA, vTanA));

      // -----------------------------------------
      // 1. Constrain motion PERPENDICULAR to axis (velocity)
      // -----------------------------------------
      const velPerp = relVel.dot(perpendicular);
      const rnA = rAPerp.dot(perpendicular);
      const rnB = rBPerp.dot(perpendicular);
      const effMassPerp = mA + mB + rnA * rnA * iA + rnB * rnB * iB;

      if (effMassPerp !== 0) {
        const impulse = -velPerp / effMassPerp;
        const j = Vec2.scale(perpendicular, impulse);

        bodyA.angularVelocity += rnA * -impulse * iA;
        bodyB.angularVelocity += rnB * impulse * iB;

        bodyA.linearVelocity.add(perpendicular, -impulse * mA);
        bodyB.linearVelocity.add(perpendicular, impulse * mB);
      }

      // -----------------------------------------
      // 1b. Positional correction PERPENDICULAR to axis
      // -----------------------------------------
      const perpError = delta.dot(perpendicular);
      const betaPos = 0.4;
      const posImpulse = (-perpError * betaPos) / deltaTime;

      if (effMassPerp !== 0) {
        const j = Vec2.scale(perpendicular, posImpulse / effMassPerp);

        vA.sub(j, mA);
        vB.add(j, mB);
        bodyA.angularVelocity -= rnA * (posImpulse / effMassPerp) * iA;
        bodyB.angularVelocity += rnB * (posImpulse / effMassPerp) * iB;
      }

      // -----------------------------------------
      // 2. Limit distance ALONG joint axis
      // -----------------------------------------
      const slide = delta.dot(axis);
      let limitCorrection = 0;
      if (slide < min) {
        limitCorrection = slide - min;
      } else if (slide > max) {
        limitCorrection = slide - max;
      }

      const velAxis = relVel.dot(axis);
      const rtA = rAPerp.dot(axis);
      const rtB = rBPerp.dot(axis);
      const effMassAxis = mA + mB + rtA * rtA * iA + rtB * rtB * iB;

      if (effMassAxis !== 0) {
        const beta = 0.2 / deltaTime;
        const slop = 0.01;
        const posBias =
          -beta *
          Math.max(Math.abs(limitCorrection) - slop, 0) *
          Math.sign(limitCorrection);

        let impulse = -((1 - stiffness) * velAxis + posBias) / effMassAxis;

        // Clamp to avoid overcorrection in the wrong direction
        if ((slide < min && impulse > 0) || (slide > max && impulse < 0)) {
          impulse = 0;
        }

        const j = Vec2.scale(axis, impulse);

        vA.subtract(j, mA);
        vB.add(j, mB);
        bodyA.angularVelocity -= rtA * impulse * iA;
        bodyB.angularVelocity += rtB * impulse * iB;
      }

      // -----------------------------------------
      // 3. Apply friction ALONG the tangent
      // -----------------------------------------
      let tangent = Vec2.subtract(relVel, Vec2.scale(axis, velAxis));

      if (tangent.magnitudeSq() > 1e-6) {
        tangent = tangent.normalize();

        const ftA = rAPerp.dot(tangent);
        const ftB = rBPerp.dot(tangent);
        const effMassTangent = mA + mB + ftA * ftA * iA + ftB * ftB * iB;

        if (effMassTangent !== 0) {
          let frictionImpulse = relVel.dot(tangent) / effMassTangent;

          const staticFriction = Math.min(
            bodyA.staticFriction,
            bodyB.staticFriction
          );
          const kineticFriction = Math.min(
            bodyA.kineticFriction,
            bodyB.kineticFriction
          );
          const maxFriction = Math.abs(velAxis) * staticFriction;

          if (Math.abs(frictionImpulse) > maxFriction) {
            frictionImpulse = kineticFriction * Math.sign(frictionImpulse);
          }

          const jt = Vec2.scale(tangent, frictionImpulse);

          vA.subtract(jt, mA);
          vB.add(jt, mB);
          bodyA.angularVelocity -= ftA * frictionImpulse * iA;
          bodyB.angularVelocity += ftB * frictionImpulse * iB;
        }
      }
    }
  }

  fixedJoint(deltaTime) {
    for (let i = 0; i < this.pairs.length; ++i) {
      const { bodyA, bodyB, anchorA, anchorB, option } = this.pairs[i];
      const delta = Vec2.sub(anchorB, anchorA);
      const distanceSq = delta.magnitudeSq();

      if (distanceSq == 0) continue;

      const distance = Math.sqrt(distanceSq);
      const normal = delta.scale(1 / distance);
      const restLength = option.restLength ?? 0.0;
      const correction = distance - restLength;

      const mA = bodyA.inverseMass;
      const mB = bodyB.inverseMass;
      const iA = bodyA.inverseInertia;
      const iB = bodyB.inverseInertia;

      const beta = 0.2;
      const slop = 0.02;
      const stiffness = option.stiffness ?? 0.5;
      const sFriction = Math.max(bodyA.staticeFriction, bodyB.staticFriction);
      const kFriction = Math.max(bodyA.kineticFriction, bodyB.kineticFriction);

      // Constrain Rotation
      const relRotation = bodyB.rotation - bodyA.rotation;
      const relAngularVel = bodyB.angularVelocity - bodyA.angularVelocity;
      const effInertia = iA + iB;

      if (effInertia != 0) {
        const angularBias = (relRotation * beta) / deltaTime;
        const angularImpulse = -(relAngularVel + angularBias) / effInertia;

        bodyA.angularVelocity -= angularImpulse * iA;
        bodyB.angularVelocity += angularImpulse * iB;
      }

      // Fix Linear And Angular Velocity
      const rAPerp = Vec2.sub(anchorA, bodyA.position).leftPerp();
      const rBPerp = Vec2.sub(anchorB, bodyB.position).leftPerp();
      let velNormal = Vec2.sub(
        Vec2.add(
          bodyB.linearVelocity,
          Vec2.scale(rBPerp, bodyB.angularVelocity)
        ),
        Vec2.add(
          bodyA.linearVelocity,
          Vec2.scale(rAPerp, bodyA.angularVelocity)
        )
      ).dot(normal);

      const rnA = rAPerp.dot(normal);
      const rnB = rBPerp.dot(normal);
      const effNormalMass = mA + mB + rnA * rnA * iA + rnB * rnB * iB;
      let totalNormalImpulse = 0;

      if (effNormalMass != 0) {
        const bias = (Math.max(correction - slop, 0) * beta) / deltaTime;

        totalNormalImpulse = -(stiffness * velNormal + bias) / effNormalMass;
      }

      bodyA.angularVelocity -= rnA * totalNormalImpulse * iA;
      bodyB.angularVelocity += rnB * totalNormalImpulse * iB;
      bodyA.linearVelocity.sub(normal, totalNormalImpulse * mA);
      bodyB.linearVelocity.add(normal, totalNormalImpulse * mB);

      // Apply Friction
      const relVel = Vec2.sub(
        Vec2.add(
          bodyB.linearVelocity,
          Vec2.scale(rBPerp, bodyB.angularVelocity)
        ),
        Vec2.add(
          bodyA.linearVelocity,
          Vec2.scale(rAPerp, bodyA.angularVelocity)
        )
      );
      const tangent = Vec2.sub(
        relVel,
        Vec2.scale(normal, relVel.dot(normal))
      ).normalize();

      const rtA = rAPerp.dot(tangent);
      const rtB = rBPerp.dot(tangent);
      const effTangentMass = mA + mB + rtA * rtA * iA + rtB * rtB * iB;
      let frictionImpulse = 0;

      if (effTangentMass != 0) {
        frictionImpulse = -relVel.dot(tangent) / effTangentMass;

        if (Math.abs(frictionImpulse) >= totalNormalImpulse * sFriction) {
          frictionImpulse = -totalNormalImpulse * kFriction;
        }
      }

      bodyA.angularVelocity -= rtA * frictionImpulse * iA;
      bodyB.angularVelocity += rtB * frictionImpulse * iB;
      bodyA.linearVelocity.sub(tangent, frictionImpulse * mA);
      bodyB.linearVelocity.add(tangent, frictionImpulse * mB);
    }
  }

  revoluteJoint(deltaTime) {
    for (let i = 0; i < this.pairs.length; ++i) {
      const { bodyA, bodyB, anchorA, anchorB, option } = this.pairs[i];
      const delta = Vec2.sub(anchorB, anchorA);
      const distanceSq = delta.magnitudeSq();

      if (distanceSq == 0) continue;

      const distance = Math.sqrt(distanceSq);
      const normal = delta.scale(1 / distance);
      const restLength = option.restLength ?? 0.0;
      const correction = distance - restLength;

      const mA = bodyA.inverseMass;
      const mB = bodyB.inverseMass;
      const iA = bodyA.inverseInertia;
      const iB = bodyB.inverseInertia;

      const beta = 0.2;
      const slop = 0.02;
      const stiffness = option.stiffness ?? 0.5;
      const sFriction = Math.max(bodyA.staticFriction, bodyB.staticFriction);
      const kFriction = Math.max(bodyA.kineticFriction, bodyB.kineticFriction);

      // Constrain Rotation
      const relRotation = bodyB.rotation - bodyA.rotation;
      const minAngle = option.minAngle ?? -Infinity;
      const maxAngle = option.maxAngle ?? Infinity;
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

        if (effInertia != 0) {
          const bias = (angleError * beta) / deltaTime;
          const angleImpulse = -bias / effInertia;

          bodyA.angularVelocity -= angleImpulse * iA;
          bodyB.angularVelocity += angleImpulse * iB;
        }
      }

      // Fix Linear And Angular Velocity
      const rAPerp = Vec2.sub(anchorA, bodyA.position).leftPerp();
      const rBPerp = Vec2.sub(anchorB, bodyB.position).leftPerp();
      let velNormal = Vec2.sub(
        Vec2.add(
          bodyB.linearVelocity,
          Vec2.scale(rBPerp, bodyB.angularVelocity)
        ),
        Vec2.add(
          bodyA.linearVelocity,
          Vec2.scale(rAPerp, bodyA.angularVelocity)
        )
      ).dot(normal);

      const rnA = rAPerp.dot(normal);
      const rnB = rBPerp.dot(normal);
      const effNormalMass = mA + mB + rnA * rnA * iA + rnB * rnB * iB;
      let totalNormalImpulse = 0;

      if (effNormalMass != 0) {
        const bias = (Math.max(correction - slop, 0) * beta) / deltaTime;

        totalNormalImpulse = -(stiffness * velNormal + bias) / effNormalMass;
      }

      bodyA.angularVelocity -= rnA * totalNormalImpulse * iA;
      bodyB.angularVelocity += rnB * totalNormalImpulse * iB;
      bodyA.linearVelocity.sub(normal, totalNormalImpulse * mA);
      bodyB.linearVelocity.add(normal, totalNormalImpulse * mB);

      // Apply Friction
      const relVel = Vec2.sub(
        Vec2.add(
          bodyB.linearVelocity,
          Vec2.scale(rBPerp, bodyB.angularVelocity)
        ),
        Vec2.add(
          bodyA.linearVelocity,
          Vec2.scale(rAPerp, bodyA.angularVelocity)
        )
      );
      const tangent = Vec2.sub(
        relVel,
        Vec2.scale(normal, relVel.dot(normal))
      ).normalize();

      const rtA = rAPerp.dot(tangent);
      const rtB = rBPerp.dot(tangent);
      const effTangentMass = mA + mB + rtA * rtA * iA + rtB * rtB * iB;
      let frictionImpulse = 0;

      if (effTangentMass != 0) {
        frictionImpulse = relVel.dot(tangent) / effTangentMass;

        if (Math.abs(frictionImpulse) >= totalNormalImpulse * sFriction) {
          frictionImpulse = totalNormalImpulse * kFriction;
        }
      }

      bodyA.angularVelocity -= rtA * frictionImpulse * iA;
      bodyB.angularVelocity += rtB * frictionImpulse * iB;
      bodyA.linearVelocity.sub(tangent, frictionImpulse * mA);
      bodyB.linearVelocity.add(tangent, frictionImpulse * mB);
    }
  }

  distanceJoint(deltaTime) {
    for (let i = 0; i < this.pairs.length; i++) {
      const { bodyA, bodyB, anchorA, anchorB, option } = this.pairs[i];
      const delta = Vec2.sub(anchorB, anchorA);
      const distanceSq = delta.magnitudeSq();

      if (distanceSq == 0) continue;

      const distance = Math.sqrt(distanceSq);
      const normal = delta.scale(1 / distance);
      const restLength = option.restLength ?? 0;
      const correction = distance - restLength;

      // Positional Correction
      if (bodyA.isStatic && !bodyB.isStatic) {
        bodyB.translate(normal, -correction);
      } else if (!bodyA.isStatic && bodyB.isStatic) {
        bodyA.translate(normal, correction);
      } else if (!bodyA.isStatic && !bodyB.isStatic) {
        bodyA.translate(normal, correction * 0.5);
        bodyB.translate(normal, -correction * 0.5);
      }

      const mA = bodyA.inverseMass;
      const mB = bodyB.inverseMass;
      const iA = bodyA.inverseInertia;
      const iB = bodyB.inverseInertia;

      const beta = 0.2;
      const slop = 0.02;
      const stiffness = option.stiffness ?? 0.5;
      const sFriction = Math.max(bodyA.staticFriction, bodyB.staticFriction);
      const kFriction = Math.max(bodyA.kineticFriction, bodyB.kineticFriction);

      const rAPerp = Vec2.sub(anchorA, bodyA.position).leftPerp();
      const rBPerp = Vec2.sub(anchorB, bodyB.position).leftPerp();
      let velNormal = Vec2.sub(
        Vec2.add(
          bodyB.linearVelocity,
          Vec2.scale(rBPerp, bodyB.angularVelocity)
        ),
        Vec2.add(
          bodyA.linearVelocity,
          Vec2.scale(rAPerp, bodyA.angularVelocity)
        )
      ).dot(normal);

      const rnA = rAPerp.dot(normal);
      const rnB = rBPerp.dot(normal);
      const effNormalMass = mA + mB + rnA * rnA * iA + rnB * rnB * iB;
      let totalNormalImpulse = 0;

      if (effNormalMass != 0) {
        const bias = (Math.max(correction - slop, 0) * beta) / deltaTime;

        totalNormalImpulse = -(stiffness * velNormal + bias) / effNormalMass;
      }

      bodyA.angularVelocity -= rnA * totalNormalImpulse * iA;
      bodyB.angularVelocity += rnB * totalNormalImpulse * iB;
      bodyA.linearVelocity.sub(normal, totalNormalImpulse * mA);
      bodyB.linearVelocity.add(normal, totalNormalImpulse * mB);

      // Apply Friction

      const relVel = Vec2.sub(
        Vec2.add(
          bodyB.linearVelocity,
          Vec2.scale(rBPerp, bodyB.angularVelocity)
        ),
        Vec2.add(
          bodyA.linearVelocity,
          Vec2.scale(rAPerp, bodyA.angularVelocity)
        )
      );
      const tangent = Vec2.sub(
        relVel,
        Vec2.scale(normal, relVel.dot(normal))
      ).normalize();
      const rtA = rAPerp.dot(tangent);
      const rtB = rBPerp.dot(tangent);
      const effTangentMass = mA + mB + rtA * rtA * iA + rtB * rtB * iB;
      let frictionImpulse = 0;

      if (effTangentMass != 0) {
        frictionImpulse = relVel.dot(tangent) / effTangentMass;

        if (Math.abs(frictionImpulse) >= totalNormalImpulse * sFriction) {
          frictionImpulse = totalNormalImpulse * kFriction;
        }
      }

      bodyA.angularVelocity -= rtA * frictionImpulse * iA;
      bodyB.angularVelocity += rtB * frictionImpulse * iB;
      bodyA.linearVelocity.sub(tangent, frictionImpulse * mA);
      bodyB.linearVelocity.add(tangent, frictionImpulse * mB);
    }
  }

  springJoint(deltaTime) {
    for (let i = 0; i < this.pairs.length; i++) {
      const { bodyA, bodyB, anchorA, anchorB, option } = this.pairs[i];
      const delta = Vec2.sub(anchorB, anchorA);
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

      const rA = Vec2.sub(anchorA, bodyA.position);
      const rB = Vec2.sub(anchorB, bodyB.position);
      const rAPerp = rA.leftPerp();
      const rBPerp = rB.leftPerp();

      const vrA = Vec2.add(vA, Vec2.scale(rAPerp, wA));
      const vrB = Vec2.add(vB, Vec2.scale(rBPerp, wB));
      const relVel = Vec2.sub(vrB, vrA);
      const velNormal = relVel.dot(normal);

      const tangent = Vec2.sub(
        relVel,
        Vec2.scale(normal, velNormal)
      ).normalize();

      const rnA = rAPerp.dot(normal);
      const rnB = rBPerp.dot(normal);
      const rtA = rAPerp.dot(tangent);
      const rtB = rBPerp.dot(tangent);

      const effNormalMass = mA + mB + rnA * rnA * iA + rnB * rnB * iB;
      const effTangentMass = mA + mB + rtA * rtA * iA + rtB * rtB * iB;

      let impulse = 0;
      let friction = 0;

      if (effNormalMass !== 0) {
        const f = 2 * Math.PI * stiffness;
        const k = effNormalMass * f * f;
        const d = 2 * effNormalMass * damping * f;

        impulse = (-k * correction - d * velNormal) / effNormalMass;

        if (effTangentMass !== 0) {
          friction = (-d * relVel.dot(tangent)) / effTangentMass;
          if (Math.abs(friction) >= impulse * staticFriction) {
            friction = impulse * kineticFriction;
          }
        }
      }

      bodyA.angularVelocity -= rnA * impulse * iA;
      bodyA.angularVelocity -= rtA * friction * iA;
      bodyB.angularVelocity += rnB * impulse * iB;
      bodyB.angularVelocity += rtB * friction * iB;

      bodyA.linearVelocity.sub(normal, impulse * mA);
      bodyA.linearVelocity.sub(tangent, friction * mA);
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
