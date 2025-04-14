function solveContactConstraints(
  world,
  constraints,
  constraintCount,
  inverseDeltaTime,
  useBias
) {
  const bodies = world.bodies;

  for (let i = 0; i < constraintCount; ++i) {
    const constraint = constraints[i];

    const bodyA = bodies[constraint.indexA];
    const bodyB = bodies[constraint.indexB];

    const invMassA = bodyA.invMass;
    const invInertiaA = bodyA.invI;
    const invMassB = bodyB.invMass;
    const invInertiaB = bodyB.invI;

    const contactCount = constraint.pointCount;

    let velocityA = bodyA.linearVelocity;
    let angularVelocityA = bodyA.angularVelocity;
    let velocityB = bodyB.linearVelocity;
    let angularVelocityB = bodyB.angularVelocity;

    const deltaPositionA = bodyA.deltaPosition;
    const rotationA = bodyA.rot;
    const deltaPositionB = bodyB.deltaPosition;
    const rotationB = bodyB.rot;

    const contactNormal = constraint.normal;
    const contactTangent = s2RightPerp(contactNormal);
    const frictionCoefficient = constraint.friction;

    for (let j = 0; j < contactCount; ++j) {
      const point = constraint.points[j];

      const worldAnchorA = s2RotateVector(rotationA, point.localAnchorA);
      const worldAnchorB = s2RotateVector(rotationB, point.localAnchorB);

      const separationVec = s2Add(
        s2Sub(deltaPositionB, deltaPositionA),
        s2Sub(worldAnchorB, worldAnchorA)
      );
      const separation =
        s2Dot(separationVec, contactNormal) + point.adjustedSeparation;

      let bias = 0.0;
      let massScale = 1.0;
      let impulseScale = 0.0;

      if (separation > 0.0) {
        bias = separation * inverseDeltaTime;
      } else if (useBias) {
        bias = Math.max(
          point.biasCoefficient * separation,
          -s2_maxBaumgarteVelocity
        );
        massScale = point.massCoefficient;
        impulseScale = point.impulseCoefficient;
      }

      const relativeVelocityB = s2Add(
        velocityB,
        s2CrossSV(angularVelocityB, worldAnchorB)
      );
      const relativeVelocityA = s2Add(
        velocityA,
        s2CrossSV(angularVelocityA, worldAnchorA)
      );
      const normalRelativeVelocity = s2Dot(
        s2Sub(relativeVelocityB, relativeVelocityA),
        contactNormal
      );

      let normalImpulse =
        -point.normalMass * massScale * (normalRelativeVelocity + bias) -
        impulseScale * point.normalImpulse;

      let totalNormalImpulse = Math.max(
        point.normalImpulse + normalImpulse,
        0.0
      );
      normalImpulse = totalNormalImpulse - point.normalImpulse;
      point.normalImpulse = totalNormalImpulse;

      const normalImpulseVec = s2MulSV(normalImpulse, contactNormal);
      velocityA = s2MulSub(velocityA, invMassA, normalImpulseVec);
      angularVelocityA -= invInertiaA * s2Cross(worldAnchorA, normalImpulseVec);

      velocityB = s2MulAdd(velocityB, invMassB, normalImpulseVec);
      angularVelocityB += invInertiaB * s2Cross(worldAnchorB, normalImpulseVec);
    }

    for (let j = 0; j < contactCount; ++j) {
      const point = constraint.points[j];

      const worldAnchorA = s2RotateVector(rotationA, point.localAnchorA);
      const worldAnchorB = s2RotateVector(rotationB, point.localAnchorB);

      const relativeVelocityB = s2Add(
        velocityB,
        s2CrossSV(angularVelocityB, worldAnchorB)
      );
      const relativeVelocityA = s2Add(
        velocityA,
        s2CrossSV(angularVelocityA, worldAnchorA)
      );
      const tangentRelativeVelocity = s2Dot(
        s2Sub(relativeVelocityB, relativeVelocityA),
        contactTangent
      );

      let tangentImpulse = -point.tangentMass * tangentRelativeVelocity;
      const maxTangentImpulse = frictionCoefficient * point.normalImpulse;

      let totalTangentImpulse = s2Clamp(
        point.tangentImpulse + tangentImpulse,
        -maxTangentImpulse,
        maxTangentImpulse
      );
      tangentImpulse = totalTangentImpulse - point.tangentImpulse;
      point.tangentImpulse = totalTangentImpulse;

      const tangentImpulseVec = s2MulSV(tangentImpulse, contactTangent);
      velocityA = s2MulSub(velocityA, invMassA, tangentImpulseVec);
      angularVelocityA -=
        invInertiaA * s2Cross(worldAnchorA, tangentImpulseVec);

      velocityB = s2MulAdd(velocityB, invMassB, tangentImpulseVec);
      angularVelocityB +=
        invInertiaB * s2Cross(worldAnchorB, tangentImpulseVec);
    }

    bodyA.linearVelocity = velocityA;
    bodyA.angularVelocity = angularVelocityA;
    bodyB.linearVelocity = velocityB;
    bodyB.angularVelocity = angularVelocityB;
  }
}
