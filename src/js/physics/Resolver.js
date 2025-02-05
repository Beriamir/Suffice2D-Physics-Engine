import { Vec2 } from './Vec2.js'

export class Resolver {
  static resolveCollision(bodyA, bodyB, normal, overlapDepth, contactPoints) {
    const contactNum = contactPoints.length
    const leverArmsA = []
    const leverArmsB = []
    const tangents = Array.from({ length: contactNum }, _ => new Vec2())
    const normalImpulses = Array.from({ length: contactNum }, _ => 0)
    const tangentImpulses = Array.from({ length: contactNum }, _ => 0)
    const restitution = 1 + Math.min(bodyA.restitution, bodyB.restitution)
    const staticFriction = Math.min(
      bodyA.friction.static,
      bodyB.friction.static
    )
    const kineticFriction = Math.min(
      bodyA.friction.kinetic,
      bodyB.friction.kinetic
    )
    const inverseMassA = bodyA.inverseMass
    const inverseMassB = bodyB.inverseMass
    const inverseInertiaA = bodyA.inverseInertia
    const inverseInertiaB = bodyB.inverseInertia

    let torqueFactorA = bodyA.label == 'circle' ? 1 : 0.5
    let torqueFactorB = bodyB.label == 'circle' ? 1 : 0.5

    for (let i = 0; i < contactNum; ++i) {
      leverArmsA[i] = Vec2.subtract(contactPoints[i], bodyA.position)
      leverArmsB[i] = Vec2.subtract(contactPoints[i], bodyB.position)

      const armAPerp = leverArmsA[i].perp()
      const armBPerp = leverArmsB[i].perp()
      const angularVelocityA = armAPerp.clone().scale(bodyA.angularVelocity)
      const angularVelocityB = armBPerp.clone().scale(bodyB.angularVelocity)
      const relativeVelocity = Vec2.subtract(
        bodyB.velocity.clone().add(angularVelocityB),
        bodyA.velocity.clone().add(angularVelocityA)
      )
      const velocityAlongNormal = relativeVelocity.dot(normal)

      if (velocityAlongNormal > 0) continue
      else {
        tangents[i] = Vec2.subtract(
          relativeVelocity,
          normal.clone().scale(velocityAlongNormal)
        )
      }

      if (tangents[i].magnitudeSq() > 1e-6) {
        tangents[i].normalize()
      } else tangents[i].zero()

      const armAPerpAlongNormal = armAPerp.dot(normal)
      const armBPerpAlongNormal = armBPerp.dot(normal)
      const armAPerpAlongTangent = armAPerp.dot(tangents[i])
      const armBPerpAlongTangent = armBPerp.dot(tangents[i])
      const normalDenom =
        inverseMassA +
        inverseMassB +
        armAPerpAlongNormal ** 2 * inverseInertiaA +
        armBPerpAlongNormal ** 2 * inverseInertiaB
      const tangentDenom =
        inverseMassA +
        inverseMassB +
        armAPerpAlongTangent ** 2 * inverseInertiaA +
        armBPerpAlongTangent ** 2 * inverseInertiaB

      let normalImpulse = (-restitution * velocityAlongNormal) / normalDenom
      let tangentImpulse = -relativeVelocity.dot(tangents[i]) / tangentDenom

      // Coulomb's law
      if (Math.abs(tangentImpulse) > Math.abs(normalImpulse) * staticFriction)
        tangentImpulse = Math.abs(normalImpulse) * -kineticFriction

      normalImpulses[i] = normalImpulse / contactNum
      tangentImpulses[i] = tangentImpulse / contactNum
    }

    for (let i = 0; i < contactNum; ++i) {
      const normalTorqueA = leverArmsA[i].cross(
        normal.clone().scale(-normalImpulses[i])
      )
      const normalTorqueB = leverArmsB[i].cross(
        normal.clone().scale(normalImpulses[i])
      )
      const tangentTorqueA = leverArmsA[i].cross(
        tangents[i].clone().scale(-tangentImpulses[i])
      )
      const tangentTorqueB = leverArmsB[i].cross(
        tangents[i].clone().scale(tangentImpulses[i])
      )

      // Apply Angular Velocity Correction
      torqueFactorA = torqueFactorA / contactNum
      torqueFactorB = torqueFactorB / contactNum

      bodyA.angularVelocity +=
        normalTorqueA * inverseInertiaA * torqueFactorA +
        tangentTorqueA * inverseInertiaA * torqueFactorA
      bodyB.angularVelocity +=
        normalTorqueB * inverseInertiaB * torqueFactorB +
        tangentTorqueB * inverseInertiaB * torqueFactorB

      // Apply Linear Velocity Correction
      bodyA.velocity
        .add(normal, -normalImpulses[i] * inverseMassA)
        .add(tangents[i], -tangentImpulses[i] * inverseMassA)

      bodyB.velocity
        .add(normal, normalImpulses[i] * inverseMassB)
        .add(tangents[i], tangentImpulses[i] * inverseMassB)

      // Separate Bodies
      overlapDepth = Math.max(overlapDepth / contactNum, 0)

      if (bodyA.isStatic && !bodyB.isStatic)
        bodyB.position.add(normal, overlapDepth)
      else if (!bodyA.isStatic && bodyB.isStatic)
        bodyA.position.add(normal, -overlapDepth)
      else if (!bodyA.isStatic && !bodyB.isStatic) {
        bodyA.position.add(normal, -overlapDepth * 0.5)
        bodyB.position.add(normal, overlapDepth * 0.5)
      }
    }
  }
}
