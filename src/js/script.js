import * as suffice2d from './suffice2d/index.js';

onload = function main() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  let canvasWidth = (canvas.width = innerWidth);
  let canvasHeight = (canvas.height = innerHeight);
  const engine = new suffice2d.Engine({
    subSteps: 4
  });
  const wireframe = false;
  const isRenderGrid = false;
  const isRenderDebug = false;
  const restitution = 0.4;
  const circleRadius = 30;
  const density = null;
  const initialCount = 1;
  const ragdolSize = 40;
  const ragdolMass = 100_000;
  const initialRagdolCount = 1;
  const fontSize = 12;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `normal ${fontSize}px Arial`;

  canvas.addEventListener('touchstart', function (event) {
    engine.mouse.setPosition(
      event.touches[0].clientX,
      event.touches[0].clientY
    );

    engine.world.forEach(body => {
      if (engine.mouse.touch(body)) {
        engine.mouse.grab(body);
        return true;
      }
    });
  });

  canvas.addEventListener('touchmove', function (event) {
    engine.mouse.setPosition(
      event.touches[0].clientX,
      event.touches[0].clientY
    );
  });

  canvas.addEventListener('touchend', function (event) {
    engine.mouse.drop();
  });

  function init() {
    const minWidth = 50;
    const minHeight = 50;
    const option = {
      isStatic: true,
      fixedRot: true,
      wireframe,
      tag: 'wall'
    };

    const staticRigidBodies = {
      // Ground
      0: new suffice2d.RigidBodies.rectangle(
        canvasWidth / 2,
        canvasHeight + minHeight / 2,
        canvasWidth,
        minHeight,
        option
      ),
      // Left Wall
      1: new suffice2d.RigidBodies.rectangle(
        -(minWidth / 2),
        canvasHeight / 2,
        50,
        canvasHeight,
        option
      ),
      // Right Wall
      2: new suffice2d.RigidBodies.rectangle(
        canvasWidth + minWidth / 2,
        canvasHeight / 2,
        50,
        canvasHeight,
        option
      ),
      // Ceiling
      3: new suffice2d.RigidBodies.rectangle(
        canvasWidth / 2,
        -(minHeight / 2),
        canvasWidth,
        50,
        option
      ),
      length: 4
    };

    engine.world.addBodies(Array.from(staticRigidBodies));

    const jointRadius = 20;
    const rectConstraints = []; // Hinge
    const rectConstraints2 = []; // Fixed
    const circleConstraints = [];
    const capsuleConstraints = [];

    const distanceJoint = new suffice2d.Constraints.distanceJoint(engine, {
      id: 2,
      selfCollision: true
    });
    const springJoint = new suffice2d.Constraints.springJoint(engine, {
      id: 3,
      selfCollision: true
    });
    const revoluteJoint = new suffice2d.Constraints.revoluteJoint(engine, {
      id: 4,
      selfCollision: false
    });
    const fixedJoint = new suffice2d.Constraints.fixedJoint(engine, {
      id: 5,
      selfCollision: false
    });

    // Fixed Joint
    for (let i = 0; i < 4; i++) {
      const x = canvasWidth * 0.2;
      const y = i * jointRadius * 1.5 + 100;
      const body = new suffice2d.RigidBodies.rectangle(
        x,
        y,
        jointRadius,
        jointRadius * 4,
        {
          wireframe,
          isStatic: i === 0,
          staticFriction: 0.3,
          kineticFriction: 0.1
        }
      );

      rectConstraints2.push(body);

      if (i > 0) {
        const prev = rectConstraints2[i - 1];
        const anchorA = prev.position.clone();
        const anchorB = body.position.clone();

        anchorA.y += prev.height * 0.5;
        anchorB.y -= body.height * 0.25;
        fixedJoint.addJoint(prev, body, anchorA, anchorB, {
          stiffness: 0.5
        });
      }
    }

    // Revolute Joint
    for (let i = 0; i < 8; i++) {
      const x = canvasWidth * 0.4;
      const y = i * jointRadius * 1.5 + 100;
      const body = new suffice2d.RigidBodies.rectangle(
        x,
        y,
        jointRadius,
        jointRadius * 2,
        {
          wireframe,
          isStatic: i === 0,
          fixedRot: i === 0,
          staticFriction: 0.3,
          kineticFriction: 0.1
        }
      );

      rectConstraints.push(body);

      if (i > 0) {
        const prev = rectConstraints[i - 1];
        const anchorA = prev.position.clone();
        const anchorB = body.position.clone();

        anchorA.y += prev.height * 0.5;
        anchorB.y -= body.height * 0.25;
        revoluteJoint.addJoint(prev, body, anchorA, anchorB, {
          stiffness: 0.5,
          minAngle: -Math.PI * 0.2,
          maxAngle: Math.PI * 0.2
        });
      }
    }

    // Spring Joint
    for (let i = 0; i < 6; i++) {
      const x = canvasWidth * 0.6;
      const y = i * jointRadius * 2 + 100;
      const body = new suffice2d.RigidBodies.circle(x, y, jointRadius, {
        wireframe,
        isStatic: i === 0,
        fixedRot: i === 0,
        staticFriction: 0.3,
        kineticFriction: 0.1
      });

      circleConstraints.push(body);

      if (i > 0) {
        const prev = circleConstraints[i - 1];
        const anchorA = prev.position.clone();
        const anchorB = body.position.clone();

        anchorA.y += prev.radius * 0.5;
        anchorB.y -= body.radius * 0.5;
        springJoint.addJoint(prev, body, anchorA, anchorB, {
          stiffness: 0.5,
          restLength: jointRadius
        });
      }
    }

    // Distance Joint
    for (let i = 0; i < 8; i++) {
      const x = canvasWidth * 0.8;
      const y = i * jointRadius * 2 + 100;
      const body = new suffice2d.RigidBodies.capsule(
        x,
        y,
        jointRadius * 0.5,
        jointRadius,
        {
          wireframe,
          isStatic: i === 0,
          fixedRot: i === 0,
          staticFriction: 0.3,
          kineticFriction: 0.1
        }
      );

      capsuleConstraints.push(body);

      if (i > 0) {
        const prev = capsuleConstraints[i - 1];
        const anchorA = prev.position.clone();
        const anchorB = body.position.clone();

        anchorA.y += prev.height / 2;
        anchorB.y -= body.height / 2;
        distanceJoint.addJoint(prev, body, anchorA, anchorB, {
          stiffness: 0.5,
          restLength: jointRadius * 1.25
        });
      }
    }

    // Random Circles
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * canvasWidth;
      const y = Math.random() * canvasHeight;
      const body = new suffice2d.RigidBodies.circle(x, y, 20, {
        wireframe,
        restitution,
        staticFriction: 0.3,
        kineticFriction: 0.1
      });

      engine.world.addBody(body);
    }
  }

  init();

  function spawnRagdollRect(x, y, size, option = {}) {
    const id = option.id ?? Math.random() * 1826622527;
    const alpha = 1;
    const skinColor = option.skinColor ?? `rgba(168, 124, 95, ${alpha})`;
    const shirtColor = option.shirtColor ?? `rgba(76, 152, 179, ${alpha})`;
    const pantColor = option.pantColor ?? `rgba(59, 59, 115, ${alpha})`;

    const joints = {
      revolute: new suffice2d.Constraints.revoluteJoint(engine, { id }),
      fixed: new suffice2d.Constraints.fixedJoint(engine, { id })
    };

    const mass = ragdolMass;
    const head = new suffice2d.RigidBodies.rectangle(
      x,
      y,
      size * 2,
      size * 2.25,
      {
        wireframe,
        restitution,
        color: skinColor,
        mass,
        staticFriction: 0.3,
        kineticFriction: 0.1
      }
    );
    const neck = new suffice2d.RigidBodies.rectangle(x, y, size, size, {
      wireframe,
      restitution,
      color: skinColor,
      mass: mass,
      staticFriction: 0.3,
      kineticFriction: 0.1
    });
    const body = new suffice2d.RigidBodies.rectangle(
      x,
      y,
      size * 2.25,
      size * 4,
      {
        wireframe,
        restitution,
        color: shirtColor,
        mass,
        staticFriction: 0.3,
        kineticFriction: 0.1
      }
    );
    const arm1 = new suffice2d.RigidBodies.rectangle(
      x,
      y,
      size * 1.4,
      size * 3,
      {
        wireframe,
        restitution,
        color: shirtColor,
        mass,
        staticFriction: 0.3,
        kineticFriction: 0.1
      }
    );
    const arm2 = new suffice2d.RigidBodies.rectangle(
      x,
      y,
      size * 1.4,
      size * 3,
      {
        wireframe,
        restitution,
        color: shirtColor,
        mass,
        staticFriction: 0.3,
        kineticFriction: 0.1
      }
    );
    const arm3 = new suffice2d.RigidBodies.rectangle(x, y, size, size * 3, {
      wireframe,
      restitution,
      color: skinColor,
      mass,
      staticFriction: 0.3,
      kineticFriction: 0.1
    });
    const arm4 = new suffice2d.RigidBodies.rectangle(x, y, size, size * 3, {
      wireframe,
      restitution,
      color: skinColor,
      mass,
      staticFriction: 0.3,
      kineticFriction: 0.1
    });
    const hip = new suffice2d.RigidBodies.rectangle(x, y, size * 2, size * 2, {
      wireframe,
      restitution,
      color: pantColor,
      mass,
      staticFriction: 0.3,
      kineticFriction: 0.1
    });
    const leg1 = new suffice2d.RigidBodies.rectangle(
      x,
      y,
      size * 1.5,
      size * 3,
      {
        wireframe,
        restitution,
        color: pantColor,
        mass,
        staticFriction: 0.3,
        kineticFriction: 0.1
      }
    );
    const leg2 = new suffice2d.RigidBodies.rectangle(
      x,
      y,
      size * 1.5,
      size * 3,
      {
        wireframe,
        restitution,
        color: pantColor,
        staticFriction: 0.3,
        kineticFriction: 0.1
      }
    );
    const leg3 = new suffice2d.RigidBodies.rectangle(x, y, size, size * 4, {
      wireframe,
      restitution,
      color: skinColor,
      mass,
      staticFriction: 0.3,
      kineticFriction: 0.1
    });
    const leg4 = new suffice2d.RigidBodies.rectangle(x, y, size, size * 4, {
      wireframe,
      restitution,
      color: skinColor,
      mass,
      staticFriction: 0.3,
      kineticFriction: 0.1
    });

    engine.world.addBodies([
      arm3,
      arm1,
      leg3,
      leg1,
      neck,
      head,
      hip,
      body,
      leg4,
      leg2,
      arm4,
      arm2
    ]);

    const headToNeckAnchorA = head.position.clone();
    const headToNeckAnchorB = neck.position.clone();

    const neckToBodyAnchorA = neck.position.clone();
    const neckToBodyAnchorB = body.position.clone();

    const arm1ToBodyAnchorA = arm1.position.clone();
    const arm1ToBodyAnchorB = body.position.clone();

    const arm2ToBodyAnchorA = arm2.position.clone();
    const arm2ToBodyAnchorB = body.position.clone();

    const arm3ToArm1AnchorA = arm3.position.clone();
    const arm3ToArm1AnchorB = arm1.position.clone();
    const arm4ToArm2AnchorA = arm4.position.clone();
    const arm4ToArm2AnchorB = arm2.position.clone();

    const bodyToHipAnchorA = body.position.clone();
    const bodyToHipAnchorB = hip.position.clone();

    const hipToLeg1AnchorA = hip.position.clone();
    const hipToLeg1AnchorB = leg1.position.clone();
    const hipToLeg2AnchorA = hip.position.clone();
    const hipToLeg2AnchorB = leg2.position.clone();

    const leg3ToLeg1AnchorA = leg3.position.clone();
    const leg3ToLeg1AnchorB = leg1.position.clone();
    const leg4ToLeg2AnchorA = leg4.position.clone();
    const leg4ToLeg2AnchorB = leg2.position.clone();

    headToNeckAnchorA.y += head.height / 2;
    headToNeckAnchorB.y -= neck.height * 0.25;

    neckToBodyAnchorA.y += neck.height * 0.25;
    neckToBodyAnchorB.y -= body.height * 0.5;

    arm1ToBodyAnchorA.y -= arm1.height * 0.25;
    arm1ToBodyAnchorB.y -= body.height * 0.25;
    arm2ToBodyAnchorA.y -= body.height * 0.25;
    arm2ToBodyAnchorB.y -= arm2.height * 0.25;

    arm3ToArm1AnchorA.y -= arm3.height / 2;
    arm3ToArm1AnchorB.y += arm1.height / 2;
    arm4ToArm2AnchorA.y -= arm4.height / 2;
    arm4ToArm2AnchorB.y += arm2.height / 2;

    bodyToHipAnchorA.y += body.height * 0.5;
    bodyToHipAnchorB.y -= hip.height * 0.25;

    hipToLeg1AnchorA.y += hip.height * 0.25;
    hipToLeg1AnchorB.y -= leg1.height * 0.25;
    hipToLeg2AnchorA.y += hip.height * 0.25;
    hipToLeg2AnchorB.y -= leg2.height * 0.25;

    leg3ToLeg1AnchorA.y -= leg3.height / 2;
    leg3ToLeg1AnchorB.y += leg1.height / 2;
    leg4ToLeg2AnchorA.y -= leg4.height / 2;
    leg4ToLeg2AnchorB.y += leg2.height / 2;

    // Arm1 To Body
    joints.revolute.addJoint(arm1, body, arm1ToBodyAnchorA, arm1ToBodyAnchorB, {
      minAngle: -Math.PI / 4,
      maxAngle: Math.PI
    });
    // Leg3 To Leg1
    joints.revolute.addJoint(leg3, leg1, leg3ToLeg1AnchorA, leg3ToLeg1AnchorB, {
      minAngle: -Math.PI / 1.5,
      maxAngle: Math.PI / 12
    });
    // Body To Arm2
    joints.revolute.addJoint(body, arm2, arm2ToBodyAnchorA, arm2ToBodyAnchorB, {
      minAngle: -Math.PI,
      maxAngle: Math.PI / 4
    });
    // Arm4 To Arm2
    joints.revolute.addJoint(arm4, arm2, arm4ToArm2AnchorA, arm4ToArm2AnchorB, {
      minAngle: -Math.PI / 12,
      maxAngle: Math.PI / 2
    });
    // Hip To Leg1
    joints.revolute.addJoint(hip, leg1, hipToLeg1AnchorA, hipToLeg1AnchorB, {
      minAngle: -Math.PI / 2,
      maxAngle: Math.PI / 4
    });
    // Body To Hip
    joints.fixed.addJoint(body, hip, bodyToHipAnchorA, bodyToHipAnchorB);
    // Hip To Leg2
    joints.revolute.addJoint(hip, leg2, hipToLeg2AnchorA, hipToLeg2AnchorB, {
      minAngle: -Math.PI / 2,
      maxAngle: Math.PI / 4
    });
    // Neck To Body
    joints.fixed.addJoint(neck, body, neckToBodyAnchorA, neckToBodyAnchorB);
    // Head To Neck
    joints.revolute.addJoint(head, neck, headToNeckAnchorA, headToNeckAnchorB, {
      minAngle: -Math.PI / 3,
      maxAngle: Math.PI / 12
    });
    // Leg4 To Leg2
    joints.revolute.addJoint(leg4, leg2, leg4ToLeg2AnchorA, leg4ToLeg2AnchorB, {
      minAngle: -Math.PI / 1.5,
      maxAngle: Math.PI / 12
    });
    // Arm3 To arm1
    joints.revolute.addJoint(arm3, arm1, arm3ToArm1AnchorA, arm3ToArm1AnchorB, {
      minAngle: -Math.PI / 12,
      maxAngle: Math.PI / 2
    });
  }

  function spawnRagdollCapsule(x, y, size, option = {}) {
    const id = option.id ?? Math.random() * 1826622527;
    const alpha = 1;
    const skinColor = option.skinColor ?? `rgba(168, 124, 95, ${alpha})`;
    const shirtColor = option.shirtColor ?? `rgba(76, 152, 179, ${alpha})`;
    const pantColor = option.pantColor ?? `rgba(59, 59, 115, ${alpha})`;

    const joints = {
      revolute: new suffice2d.Constraints.revoluteJoint(engine, { id }),
      fixed: new suffice2d.Constraints.fixedJoint(engine, { id })
    };
    const mass = ragdolMass;

    const head = new suffice2d.RigidBodies.capsule(x, y, size, size * 0.8, {
      wireframe,
      restitution,
      color: skinColor,
      mass,
      staticFriction: 0.3,
      kineticFriction: 0.1
    });
    const neck = new suffice2d.RigidBodies.capsule(
      x,
      y,
      size * 0.6,
      size * 0.4,
      {
        wireframe,
        restitution,
        color: skinColor,
        mass: mass,
        staticFriction: 0.3,
        kineticFriction: 0.1
      }
    );
    const body = new suffice2d.RigidBodies.capsule(x, y, size * 1.2, size * 2, {
      wireframe,
      restitution,
      color: shirtColor,
      mass,
      staticFriction: 0.3,
      kineticFriction: 0.1
    });
    const arm1 = new suffice2d.RigidBodies.capsule(x, y, size * 0.5, size * 2, {
      wireframe,
      restitution,
      color: shirtColor,
      mass,
      staticFriction: 0.3,
      kineticFriction: 0.1
    });
    const arm2 = new suffice2d.RigidBodies.capsule(x, y, size * 0.5, size * 2, {
      wireframe,
      restitution,
      color: shirtColor,
      mass,
      staticFriction: 0.3,
      kineticFriction: 0.1
    });
    const arm3 = new suffice2d.RigidBodies.capsule(x, y, size * 0.4, size * 3, {
      wireframe,
      restitution,
      color: skinColor,
      mass,
      staticFriction: 0.3,
      kineticFriction: 0.1
    });
    const arm4 = new suffice2d.RigidBodies.capsule(x, y, size * 0.4, size * 3, {
      wireframe,
      restitution,
      color: skinColor,
      mass,
      staticFriction: 0.3,
      kineticFriction: 0.1
    });
    const hip = new suffice2d.RigidBodies.capsule(
      x,
      y,
      size * 1.4,
      size * 0.4,
      {
        wireframe,
        restitution,
        color: pantColor,
        mass,
        staticFriction: 0.3,
        kineticFriction: 0.1
      }
    );
    const leg1 = new suffice2d.RigidBodies.capsule(
      x,
      y,
      size * 0.9,
      size * 2.5,
      {
        wireframe,
        restitution,
        color: pantColor,
        mass,
        staticFriction: 0.3,
        kineticFriction: 0.1
      }
    );
    const leg2 = new suffice2d.RigidBodies.capsule(
      x,
      y,
      size * 0.9,
      size * 2.5,
      {
        wireframe,
        restitution,
        color: pantColor,
        staticFriction: 0.3,
        kineticFriction: 0.1
      }
    );
    const leg3 = new suffice2d.RigidBodies.capsule(
      x,
      y,
      size * 0.45,
      size * 3,
      {
        wireframe,
        restitution,
        color: skinColor,
        mass,
        staticFriction: 0.3,
        kineticFriction: 0.1
      }
    );
    const leg4 = new suffice2d.RigidBodies.capsule(
      x,
      y,
      size * 0.45,
      size * 3,
      {
        wireframe,
        restitution,
        color: skinColor,
        mass,
        staticFriction: 0.3,
        kineticFriction: 0.1
      }
    );

    engine.world.addBodies([
      arm3,
      arm1,
      leg3,
      leg1,
      neck,
      head,
      hip,
      body,
      leg4,
      leg2,
      arm4,
      arm2
    ]);

    const headToNeckAnchorA = head.position.clone();
    const headToNeckAnchorB = neck.position.clone();

    const neckToBodyAnchorA = neck.position.clone();
    const neckToBodyAnchorB = body.position.clone();

    const arm1ToBodyAnchorA = arm1.position.clone();
    const arm1ToBodyAnchorB = body.position.clone();

    const arm2ToBodyAnchorA = arm2.position.clone();
    const arm2ToBodyAnchorB = body.position.clone();

    const arm3ToArm1AnchorA = arm3.position.clone();
    const arm3ToArm1AnchorB = arm1.position.clone();
    const arm4ToArm2AnchorA = arm4.position.clone();
    const arm4ToArm2AnchorB = arm2.position.clone();

    const bodyToHipAnchorA = body.position.clone();
    const bodyToHipAnchorB = hip.position.clone();

    const hipToLeg1AnchorA = hip.position.clone();
    const hipToLeg1AnchorB = leg1.position.clone();
    const hipToLeg2AnchorA = hip.position.clone();
    const hipToLeg2AnchorB = leg2.position.clone();

    const leg3ToLeg1AnchorA = leg3.position.clone();
    const leg3ToLeg1AnchorB = leg1.position.clone();
    const leg4ToLeg2AnchorA = leg4.position.clone();
    const leg4ToLeg2AnchorB = leg2.position.clone();

    headToNeckAnchorA.y += head.height / 2 + head.radius;
    headToNeckAnchorB.y -= neck.height / 2;

    neckToBodyAnchorA.y += neck.height / 2;
    neckToBodyAnchorB.y -= body.height / 2 + body.radius;

    arm1ToBodyAnchorA.y -= arm1.height / 2;
    arm1ToBodyAnchorB.y -= body.height * 0.5;
    arm2ToBodyAnchorA.y -= body.height * 0.5;
    arm2ToBodyAnchorB.y -= arm2.height / 2;

    arm3ToArm1AnchorA.y -= arm3.height / 2;
    arm3ToArm1AnchorB.y += arm1.height / 2;
    arm4ToArm2AnchorA.y -= arm4.height / 2;
    arm4ToArm2AnchorB.y += arm2.height / 2;

    bodyToHipAnchorA.y += body.height * 0.5;
    bodyToHipAnchorB.y -= hip.height * 0.5 + hip.radius;

    hipToLeg1AnchorA.y += hip.height * 0.5;
    hipToLeg1AnchorB.y -= leg1.height * 0.5;
    hipToLeg2AnchorA.y += hip.height * 0.5;
    hipToLeg2AnchorB.y -= leg2.height * 0.5;

    leg3ToLeg1AnchorA.y -= leg3.height / 2;
    leg3ToLeg1AnchorB.y += leg1.height / 2;
    leg4ToLeg2AnchorA.y -= leg4.height / 2;
    leg4ToLeg2AnchorB.y += leg2.height / 2;

    // Arm1 To Body
    joints.revolute.addJoint(arm1, body, arm1ToBodyAnchorA, arm1ToBodyAnchorB, {
      minAngle: -Math.PI / 4,
      maxAngle: Math.PI
    });
    // Leg3 To Leg1
    joints.revolute.addJoint(leg3, leg1, leg3ToLeg1AnchorA, leg3ToLeg1AnchorB, {
      minAngle: -Math.PI / 1.5,
      maxAngle: Math.PI / 12
    });
    // Body To Arm2
    joints.revolute.addJoint(body, arm2, arm2ToBodyAnchorA, arm2ToBodyAnchorB, {
      minAngle: -Math.PI,
      maxAngle: Math.PI / 4
    });
    // Arm4 To Arm2
    joints.revolute.addJoint(arm4, arm2, arm4ToArm2AnchorA, arm4ToArm2AnchorB, {
      minAngle: -Math.PI / 12,
      maxAngle: Math.PI / 2
    });
    // Hip To Leg1
    joints.revolute.addJoint(hip, leg1, hipToLeg1AnchorA, hipToLeg1AnchorB, {
      minAngle: -Math.PI / 2,
      maxAngle: Math.PI / 4
    });
    // Body To Hip
    joints.fixed.addJoint(body, hip, bodyToHipAnchorA, bodyToHipAnchorB);
    // Hip To Leg2
    joints.revolute.addJoint(hip, leg2, hipToLeg2AnchorA, hipToLeg2AnchorB, {
      minAngle: -Math.PI / 2,
      maxAngle: Math.PI / 4
    });
    // Neck To Body
    joints.fixed.addJoint(neck, body, neckToBodyAnchorA, neckToBodyAnchorB);
    // Head To Neck
    joints.revolute.addJoint(head, neck, headToNeckAnchorA, headToNeckAnchorB, {
      minAngle: -Math.PI / 3,
      maxAngle: Math.PI / 12
    });
    // Leg4 To Leg2
    joints.revolute.addJoint(leg4, leg2, leg4ToLeg2AnchorA, leg4ToLeg2AnchorB, {
      minAngle: -Math.PI / 1.5,
      maxAngle: Math.PI / 12
    });
    // Arm3 To arm1
    joints.revolute.addJoint(arm3, arm1, arm3ToArm1AnchorA, arm3ToArm1AnchorB, {
      minAngle: -Math.PI / 12,
      maxAngle: Math.PI / 2
    });
  }

  const skinColors = [
    '#e0af9f', // white
    '#b78465', // Brown
    '#4E4645' // Black
  ];

  for (let i = 1; i <= initialRagdolCount; i++) {
    const size = ragdolSize;
    const x = i * size * 2;
    const y = canvasHeight * 0.75;

    spawnRagdollRect(x, y, size * 0.5, {
      skinColor: skinColors[1],
      stiffness: 0.5
    });
  }

  for (let i = 1; i <= initialRagdolCount; i++) {
    const size = ragdolSize;
    const x = i * size * 2;
    const y = canvasHeight * 0.4;

    spawnRagdollCapsule(x, y, size * 0.5, {
      stiffness: 0.9,
      skinColor: skinColors[0],
      shirtColor: '#3bb27d',
      pantColor: '#47322c'
    });
  }

  function render(ctx, dt) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    if (isRenderGrid) engine.grid.render(ctx);
    engine.world.forEach(body => {
      body.render(ctx);
      if (isRenderDebug) body.renderDebug(ctx);
    });
    engine.mouse.render(ctx);

    ctx.fillStyle = 'white';
    ctx.fillText(
      `
        ${Math.round(1000 / dt)} FPS 
        ${engine.world.count} RigidBodies 
        ${engine.subSteps} Sub Steps
      `,
      canvasWidth * 0.5,
      fontSize * 2
    );
  }

  function update(dt) {
    render(ctx, dt);
    engine.run(dt);
    engine.mouse.constrain(dt);
  }

  engine.start(update);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      engine.pause();
    } else engine.play();
  });
};
