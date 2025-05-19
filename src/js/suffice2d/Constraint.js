import { Solver } from './Solver.js';
import { Vec2 } from './Vec2.js';

export class Constraint {
  constructor(properties, option = {}) {
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
      }
    }

    this.stiffness = option.stiffness ?? 0.5;
    this.damping = option.damping ?? 0.5;
    this.restLength = option.restLength ?? 1;
    this.pairs = [];
  }

  static _clamp(value, min = 0, max = 1) {
    return value > max ? max : value < min ? min : value;
  }

  addJoint(data = {}) {
    const idA = data.bodyA.id;
    const idB = data.bodyB.id;
    const pairId = idA < idB ? idA * 1_000_000 + idB : idB * 1_000_000 + idA;

    data.bodyA.jointId = this.id;
    data.bodyB.jointId = this.id;

    if (this.label === 'revoluteJoint' || this.label === 'fixedJoint') {
      data.bodyA.allowContact = false;
      data.bodyB.allowContact = false;
    }

    data.bodyA.addAnchorPoint(data.anchorA);
    data.bodyB.addAnchorPoint(data.anchorB);
    data.bodyA.anchorPairs.push({
      id: pairId,
      anchorA: data.anchorA,
      anchorB: data.anchorB
    });

    data.id = pairId;

    this.pairs.push(data);

    this.engine.world.addBodies([data.bodyA, data.bodyB]);
    this.engine.world.addConstraint(this);
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

    bodyA.allowContact = true;
    bodyB.allowContact = true;
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
    for (let i = 0; i < this.pairs.length; i++) {
      const { bodyA, anchorA, bodyB, anchorB } = this.pairs[i];

      const delta = Vec2.subtract(anchorB, anchorA);
      const distance = delta.magnitude();

      if (distance === 0) continue;

      const normal = delta.clone().normalize();
      const correction = distance - this.restLength;

      if (bodyA.isStatic && !bodyB.isStatic) {
        bodyB.addForce(normal, -correction);
      } else if (!bodyA.isStatic && bodyB.isStatic) {
        bodyA.addForce(normal, correction);
      } else if (!bodyA.isStatic && !bodyB.isStatic) {
        bodyA.addForce(normal, correction * 0.5);
        bodyB.addForce(normal, -correction * 0.5);
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
        bodyA.friction.static,
        bodyB.friction.static
      );
      const kineticFriction = Math.min(
        bodyA.friction.kinetic,
        bodyB.friction.kinetic
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

      if (effMassN === 0 || effMassT === 0) continue;

      const beta = 0.1;
      const bias = (this.stiffness * correction * beta) / deltaTime;
      const impulse = -(bias + velNormal) / effMassN;
      let friction = relVel.dot(tangent) / effMassT;

      const maxStatic = impulse * staticFriction;
      const maxKinetic = impulse * kineticFriction;

      // Clamp Friction
      if (friction > maxStatic) {
        friction = Constraint._clamp(friction, -maxKinetic, maxKinetic);
      } else if (friction < -maxStatic) {
        friction = Constraint._clamp(friction, -maxKinetic, maxKinetic);
      } else {
        friction = Constraint._clamp(friction, -maxStatic, maxStatic);
      }

      bodyA.angularVelocity += rnA * -impulse * iA;
      bodyA.angularVelocity += rtA * -friction * iA;
      bodyB.angularVelocity += rnB * impulse * iB;
      bodyB.angularVelocity += rtB * friction * iB;

      bodyA.linearVelocity.add(normal, -impulse * mA);
      bodyA.linearVelocity.add(tangent, -friction * mA);
      bodyB.linearVelocity.add(normal, impulse * mB);
      bodyB.linearVelocity.add(tangent, friction * mB);

      const relRotation = bodyB.rotation - bodyA.rotation;
      const relAngularVel = bodyB.angularVelocity - bodyA.angularVelocity;
      const effInertia = iA + iB;

      if (effInertia > 0) {
        const angularBias = (relRotation * beta) / deltaTime;
        const angularImpulse = -(angularBias + relAngularVel) / effInertia;

        bodyA.angularVelocity += -angularImpulse * iA;
        bodyB.angularVelocity += angularImpulse * iB;
      }
    }
  }

  revoluteJoint(deltaTime) {
    for (let i = 0; i < this.pairs.length; i++) {
      const { bodyA, anchorA, bodyB, anchorB } = this.pairs[i];

      const delta = Vec2.subtract(anchorB, anchorA);
      const distance = delta.magnitude();

      if (distance === 0) continue;

      const normal = delta.scale(1 / distance);
      const correction = (this.stiffness * distance);

      if (bodyA.isStatic && !bodyB.isStatic) {
        bodyB.addForce(normal, -correction);
      } else if (!bodyA.isStatic && bodyB.isStatic) {
        bodyA.addForce(normal, correction);
      } else if (!bodyA.isStatic && !bodyB.isStatic) {
        bodyA.addForce(normal, correction * 0.5);
        bodyB.addForce(normal, -correction * 0.5);
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
        bodyA.friction.static,
        bodyB.friction.static
      );
      const kineticFriction = Math.min(
        bodyA.friction.kinetic,
        bodyB.friction.kinetic
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

      const beta = 0.1;
      const bias = (this.stiffness * distance * beta) / deltaTime;
      const impulse = -(velNormal + bias) / effMassN;
      let friction = -relVel.dot(tangent) / effMassT;

      const maxStatic = impulse * staticFriction;
      const maxKinetic = impulse * kineticFriction;

      // Clamp Friction
      if (friction > maxStatic) {
        friction = Constraint._clamp(friction, -maxKinetic, maxKinetic);
      } else if (friction < -maxStatic) {
        friction = Constraint._clamp(friction, -maxKinetic, maxKinetic);
      } else {
        friction = Constraint._clamp(friction, -maxStatic, maxStatic);
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

  distanceJoint(deltaTime) {
    for (let i = 0; i < this.pairs.length; i++) {
      const { bodyA, anchorA, bodyB, anchorB } = this.pairs[i];

      const delta = Vec2.subtract(anchorB, anchorA);
      const distance = delta.magnitude();

      if (distance === 0) continue;

      const normal = delta.scale(1 / distance);
      const correction = (distance - (this.restLength + 1));

      if (bodyA.isStatic && !bodyB.isStatic) {
        bodyB.addForce(normal, -correction);
      } else if (!bodyA.isStatic && bodyB.isStatic) {
        bodyA.addForce(normal, correction);
      } else if (!bodyA.isStatic && !bodyB.isStatic) {
        bodyA.addForce(normal, correction * 0.5);
        bodyB.addForce(normal, -correction * 0.5);
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
        bodyA.friction.static,
        bodyB.friction.static
      );
      const kineticFriction = Math.min(
        bodyA.friction.kinetic,
        bodyB.friction.kinetic
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

      const beta = 0.1;
      const bias = (this.stiffness * correction * beta) / deltaTime;
      const impulse = -(velNormal + bias) / effNormalMass;
      let friction = relVel.dot(tangent) / effTangentMass;

      const maxStatic = impulse * staticFriction;
      const maxKinetic = impulse * kineticFriction;

      // Clamp Friction
      if (friction > maxStatic) {
        friction = Constraint._clamp(friction, -maxKinetic, maxKinetic);
      } else if (friction < -maxStatic) {
        friction = Constraint._clamp(friction, -maxKinetic, maxKinetic);
      } else {
        friction = Constraint._clamp(friction, -maxStatic, maxStatic);
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
      const { bodyA, anchorA, bodyB, anchorB } = this.pairs[i];

      const delta = Vec2.subtract(anchorB, anchorA);
      const distance = delta.magnitude();

      if (distance === 0) continue;

      const normal = delta.scale(1 / distance);
      const correction = distance - this.restLength;

      const vA = bodyA.linearVelocity;
      const vB = bodyB.linearVelocity;
      const wA = bodyA.angularVelocity;
      const wB = bodyB.angularVelocity;

      const mA = bodyA.inverseMass;
      const mB = bodyB.inverseMass;
      const iA = bodyA.inverseInertia;
      const iB = bodyB.inverseInertia;

      const staticFriction = Math.min(
        bodyA.friction.static,
        bodyB.friction.static
      );
      const kineticFriction = Math.min(
        bodyA.friction.kinetic,
        bodyB.friction.kinetic
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

      const stiffness = 2 * Math.PI * this.stiffness;
      const k = effNormalMass * stiffness * stiffness;
      const d = 2 * effNormalMass * this.damping * stiffness;

      let impulse = (-k * correction - d * velNormal) / effNormalMass;
      let friction = (-d * relVel.dot(tangent)) / effTangentMass;

      const maxStatic = impulse * staticFriction;
      const maxKinetic = impulse * kineticFriction;

      // Clamp Friction
      if (friction > maxStatic) {
        friction = Constraint._clamp(friction, -maxKinetic, maxKinetic);
      } else if (friction < -maxStatic) {
        friction = Constraint._clamp(friction, -maxKinetic, maxKinetic);
      } else {
        friction = Constraint._clamp(friction, -maxStatic, maxStatic);
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
