import { Vec2 } from './Vec2.js'

export class Resolver {
  static resolveCollision(bodyA, bodyB, normal, overlapDepth, contactPoints) {
    // Separate Bodies
    if (bodyA.isStatic && !bodyB.isStatic) {
      bodyB.position.add(normal, overlapDepth)
    } else if (!bodyA.isStatic && bodyB.isStatic) {
      bodyA.position.add(normal, -overlapDepth)
    } else if (!bodyA.isStatic && !bodyB.isStatic) {
      bodyA.position.add(normal, -overlapDepth * 0.5)
      bodyB.position.add(normal, overlapDepth * 0.5)
    } else {
      return null
    }

    const n = contactPoints.length
    let leverArmsA = []
    let leverArmsB = []
    let tangents = Array.from({ length: n }, () => new Vec2())
    let normalImpulses = Array.from({ length: n }, () => 0)
    let tangentImpulses = Array.from({ length: n }, () => 0)

    let restitution = 1 + Math.min(bodyA.restitution, bodyB.restitution)
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

    const dampFactor = 0.9999
    const torqueFactorA = bodyA.label == 'circle' ? 0.9 : 0.6
    const torqueFactorB = bodyB.label == 'circle' ? 0.9 : 0.6

    for (let i = 0; i < n; ++i) {
      const armA = Vec2.subtract(contactPoints[i], bodyA.position)
      const armB = Vec2.subtract(contactPoints[i], bodyB.position)

      leverArmsA[i] = armA
      leverArmsB[i] = armB

      const armAPerp = armA.perp()
      const armBPerp = armB.perp()
      const angularVelocityA = Vec2.scale(armAPerp, bodyA.angularVelocity)
      const angularVelocityB = Vec2.scale(armBPerp, bodyB.angularVelocity)

      const relativeVelocity = Vec2.subtract(
        Vec2.add(bodyB.velocity, angularVelocityB),
        Vec2.add(bodyA.velocity, angularVelocityA)
      )
      const velocityAlongNormal = relativeVelocity.dot(normal)

      if (velocityAlongNormal > 0) continue

      const tangent = Vec2.subtract(
        relativeVelocity,
        Vec2.scale(normal, velocityAlongNormal)
      )

      tangents[i] = tangent

      tangent.equal(new Vec2()) ? tangent.zero() : tangent.normalize()

      const armAPerpAlongNormal = armAPerp.dot(normal)
      const armBPerpAlongNormal = armBPerp.dot(normal)
      const armAPerpAlongTangent = armAPerp.dot(tangent)
      const armBPerpAlongTangent = armBPerp.dot(tangent)

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
      let tangentImpulse = -relativeVelocity.dot(tangent) / tangentDenom

      // Coulomb's law
      if (Math.abs(tangentImpulse) > normalImpulse * staticFriction)
        tangentImpulse = -normalImpulse * kineticFriction

      normalImpulses[i] = normalImpulse / n
      tangentImpulses[i] = tangentImpulse / n
    }

    for (let i = 0; i < n; ++i) {
      const armA = leverArmsA[i]
      const armB = leverArmsB[i]
      const tangent = tangents[i]
      const normalImpulse = normalImpulses[i]
      const tangentImpulse = tangentImpulses[i]

      const normalTorqueA = armA.cross(Vec2.scale(normal, -normalImpulse))
      const normalTorqueB = armB.cross(Vec2.scale(normal, normalImpulse))
      const tangentTorqueA = armA.cross(Vec2.scale(tangent, -tangentImpulse))
      const tangentTorqueB = armB.cross(Vec2.scale(tangent, tangentImpulse))

      // Apply damping
      bodyA.angularVelocity *= dampFactor
      bodyB.angularVelocity *= dampFactor
      bodyA.velocity.scale(dampFactor)
      bodyB.velocity.scale(dampFactor)

      // Apply Angular Velocity Correction
      bodyA.angularVelocity += normalTorqueA * inverseInertiaA * torqueFactorA
      bodyB.angularVelocity += normalTorqueB * inverseInertiaB * torqueFactorB
      bodyA.angularVelocity += tangentTorqueA * inverseInertiaA * torqueFactorA
      bodyB.angularVelocity += tangentTorqueB * inverseInertiaB * torqueFactorB

      // Apply Linear Velocity Correction
      bodyA.velocity.add(normal, -normalImpulse * inverseMassA)
      bodyB.velocity.add(normal, normalImpulse * inverseMassB)
      bodyA.velocity.add(tangent, -tangentImpulse * inverseMassA)
      bodyB.velocity.add(tangent, tangentImpulse * inverseMassB)
    }
  }
}
