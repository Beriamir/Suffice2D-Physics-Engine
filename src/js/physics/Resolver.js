import { Vector2 } from './Vector2.js';

export class Resolver {
  static separatesBodies(bodyA, bodyB, normal, overlapDepth) {
    if (bodyA.isStatic && !bodyB.isStatic) {
      bodyB.position.add(normal, overlapDepth * 2);
    } else if (!bodyA.isStatic && bodyB.isStatic) {
      bodyA.position.add(normal, -overlapDepth * 2);
    } else if (!bodyA.isStatic && !bodyB.isStatic) {
      bodyA.position.add(normal, -overlapDepth);
      bodyB.position.add(normal, overlapDepth);
    }
  }

  static resolveCollision(bodyA, bodyB, normal, contactPoints) {
    let raList = [];
    let rbList = [];
    let tangents = [new Vector2(), new Vector2(), new Vector2()];
    let impulses = [0, 0, 0];
    let frictionImpulses = [0, 0, 0];
    let restitution = Math.min(bodyA.restitution, bodyB.restitution);
    const friction = {
      static: (bodyA.friction.static + bodyB.friction.static) * 0.5,
      dynamic: (bodyA.friction.dynamic + bodyB.friction.dynamic) * 0.5
    };
    const m1 = bodyA.inverseMass;
    const m2 = bodyB.inverseMass;
    const I1 = bodyA.inverseInertia;
    const I2 = bodyB.inverseInertia;

    const dampFactor = 0.9999;
    const torqueFactor = 0.6;

    for (let i = 0; i < contactPoints.length; i++) {
      const ra = Vector2.subtract(contactPoints[i], bodyA.position);
      const rb = Vector2.subtract(contactPoints[i], bodyB.position);

      raList[i] = ra;
      rbList[i] = rb;

      const raPerp = ra.perp();
      const rbPerp = rb.perp();

      const angularVelocityA = Vector2.scale(raPerp, bodyA.angularVelocity);
      const angularVelocityB = Vector2.scale(rbPerp, bodyB.angularVelocity);
      const relativeVelocity = Vector2.subtract(
        Vector2.add(bodyB.velocity, angularVelocityB),
        Vector2.add(bodyA.velocity, angularVelocityA)
      );

      const velocityAlongNormal = relativeVelocity.dot(normal);

      if (velocityAlongNormal > 0) {
        continue;
      }

      const tangent = Vector2.subtract(
        relativeVelocity,
        Vector2.scale(normal, velocityAlongNormal)
      );

      tangents[i] = tangent;

      if (tangent.equal(new Vector2())) {
        tangent.zero();
      } else {
        tangent.normalize();
      }

      const raPerpAlongNormal = raPerp.dot(normal);
      const rbPerpAlongNormal = rbPerp.dot(normal);
      const raPerpAlongTangent = raPerp.dot(tangent);
      const rbPerpAlongTangent = rbPerp.dot(tangent);

      const denom =
        m1 + m2 + raPerpAlongNormal ** 2 * I1 + rbPerpAlongNormal ** 2 * I2;

      const impulse = (-(1 + restitution) * velocityAlongNormal) / denom;
      let frictionImpulse = -relativeVelocity.dot(tangent) / denom;

      if (Math.abs(frictionImpulse) > impulse * friction.static) {
        frictionImpulse = -impulse * friction.dynamic;
      }

      impulses[i] = impulse / contactPoints.length;
      frictionImpulses[i] = frictionImpulse / contactPoints.length;
    }

    for (let i = 0; i < contactPoints.length; i++) {
      const ra = raList[i];
      const rb = rbList[i];
      const tangent = tangents[i];
      const impulse = impulses[i];
      const frictionImpulse = frictionImpulses[i];

      const impulseTorqueA = ra.cross(Vector2.scale(normal, -impulse));
      const impulseTorqueB = rb.cross(Vector2.scale(normal, impulse));
      const frictionTorqueA = ra.cross(
        Vector2.scale(tangent, -frictionImpulse)
      );
      const frictionTorqueB = rb.cross(Vector2.scale(tangent, frictionImpulse));

      // Apply damping
      bodyA.velocity.scale(dampFactor);
      bodyB.velocity.scale(dampFactor);

      // Correct Velocity And Rotation
      bodyA.velocity.add(normal, -impulse * m1);
      bodyB.velocity.add(normal, impulse * m2);

      bodyA.angularVelocity += impulseTorqueA * I1 * torqueFactor;
      bodyB.angularVelocity += impulseTorqueB * I2 * torqueFactor;

      bodyA.velocity.add(tangent, -frictionImpulse * m1);
      bodyB.velocity.add(tangent, frictionImpulse * m2);

      bodyA.angularVelocity += frictionTorqueA * I1 * torqueFactor;
      bodyB.angularVelocity += frictionTorqueB * I2 * torqueFactor;
    }
  }
}
