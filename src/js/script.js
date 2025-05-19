import * as suffice2d from './suffice2d/index.js';

onload = function main() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  let canvasWidth = (canvas.width = innerWidth);
  let canvasHeight = (canvas.height = innerHeight);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const engine = new suffice2d.Engine({
    gravity: 9.81,
    subSteps: 4,
    targetFPS: 60,
    bound: {
      scale: 50
    }
  });
  const wireframe = false;
  const isRenderGrid = false;
  const isRenderDebug = false;
  const restitution = 0.4;
  const circleRadius = 30;
  const grabForce = 1;
  const density = null;
  const initialCount = 1;

  const mouse = new suffice2d.Mouse(canvasWidth / 2, canvasHeight / 2);

  canvas.addEventListener('touchstart', function (event) {
    mouse.setPosition(event.touches[0].clientX, event.touches[0].clientY);

    engine.forEach(body => {
      if (body.containsAnchor(mouse.position)) {
        mouse.grabBody(body);

        return null;
      }
    });
  });

  canvas.addEventListener('touchmove', function (event) {
    mouse.setPosition(event.touches[0].clientX, event.touches[0].clientY);
  });

  canvas.addEventListener('touchend', function (event) {
    mouse.dropBody();
  });

  function init() {
    const minWidth = 50;
    const minHeight = 50;
    const option = {
      isStatic: true,
      fixedRotation: true,
      wireframe,
      tag: 'wall'
    };

    const staticBodies = {
      // Ground
      0: new suffice2d.Bodies.rectangle(
        canvasWidth / 2,
        canvasHeight + minHeight / 2,
        canvasWidth,
        minHeight,
        option
      ),
      // Left Wall
      1: new suffice2d.Bodies.rectangle(
        -(minWidth / 2),
        canvasHeight / 2,
        50,
        canvasHeight,
        option
      ),
      // Right Wall
      2: new suffice2d.Bodies.rectangle(
        canvasWidth + minWidth / 2,
        canvasHeight / 2,
        50,
        canvasHeight,
        option
      ),
      // Ceiling
      3: new suffice2d.Bodies.rectangle(
        canvasWidth / 2,
        -(minHeight / 2),
        canvasWidth,
        50,
        option
      ),
      length: 4
    };

    engine.world.addBodies(Array.from(staticBodies));

    const jointRadius = 20;
    const rectConstraints = [];
    const circleConstraints2 = [];
    const capsuleConstraints = [];

    const distanceJoint = new suffice2d.Constraints.distanceJoint(engine, {
      restLength: jointRadius,
      stiffness: 1,
      id: 2
    });
    const springJoint = new suffice2d.Constraints.springJoint(engine, {
      restLength: jointRadius * 4,
      stiffness: 0.9,
      damping: 0.5,
      id: 2
    });
    const revoluteJoint = new suffice2d.Constraints.revoluteJoint(engine, {
      id: 2
    });

    const prismaticJoint = new suffice2d.Constraints.prismaticJoint(engine, {
      restLength: jointRadius * 2,
      id: 2
    });

    const bodyA = new suffice2d.Bodies.circle(100, 600, 30, {
      wireframe,
      restitution
    });
    const bodyB = new suffice2d.Bodies.circle(100, 650, 30, {
      wireframe,
      restitution
    });

    engine.world.addBodies([bodyA, bodyB]);

    for (let i = 0; i < 4; i++) {
      const x = canvasWidth * 0.3;
      const y = i * jointRadius * 1.5 + 100;
      
      

      const body = new suffice2d.Bodies.rectangle(
        x,
        y,
        jointRadius * 2 - i * 5,
        jointRadius * 6 - i * 10,
        {
          wireframe,
          friction: {
            static: 1,
            kinetic: 0.8
          },
          isStatic: i == 0 ? true : false,
          fixedRotation: i == 0 ? true : false
        }
      );

      rectConstraints.push(body);
    }

    for (let i = 0; i < 2; i++) {
      const x = canvasWidth / 2 + 150;
      const y = i * jointRadius * 4 + 100;

      const body = new suffice2d.Bodies.circle(x, y, jointRadius * 2, {
        friction: {
          static: 0.3,
          kinetic: 0.1
        },
        wireframe,
        density: null
        // isStatic: i === 0 ? true : false,
        // fixedRotation: i === 0 ? true : false
      });

      circleConstraints2.push(body);
    }

    for (let i = 0; i < 10; i++) {
      const x = canvasWidth / 2 + 50;
      const y = i * jointRadius * 2.5 + 100;

      const body = new suffice2d.Bodies.capsule(
        x,
        y,
        jointRadius * 0.5,
        jointRadius * 1.5,
        {
          friction: {
            static: 0.3,
            kinetic: 0.1
          },
          wireframe,
          density: null,
          isStatic: i === 0 ? true : false,
          fixedRotation: i === 0 ? true : false
        }
      );

      capsuleConstraints.push(body);
    }

    for (let i = 0; i < rectConstraints.length - 1; i++) {
      const bodyA = rectConstraints[i];
      const bodyB = rectConstraints[i + 1];

      const anchorA = bodyA.position.clone();
      const anchorB = bodyB.position.clone();

      anchorA.y += bodyA.height * 0.25;
      anchorB.y -= bodyB.height * 0.25;

      revoluteJoint.addJoint({
        bodyA,
        bodyB,
        anchorA,
        anchorB
      });
    }

    for (let i = 0; i < circleConstraints2.length - 1; i++) {
      const bodyA = circleConstraints2[i];
      const bodyB = circleConstraints2[i + 1];

      const anchorA = bodyA.position.clone();
      const anchorB = bodyB.position.clone();

      anchorA.y += bodyA.radius;
      anchorB.y -= bodyB.radius;

      springJoint.addJoint({
        bodyA,
        bodyB,
        anchorA,
        anchorB
      });
    }

    for (let i = 0; i < capsuleConstraints.length - 1; i++) {
      const bodyA = capsuleConstraints[i];
      const bodyB = capsuleConstraints[i + 1];

      const anchorA = bodyA.position.clone();
      const anchorB = bodyB.position.clone();

      anchorA.y += bodyA.height / 2;
      anchorB.y -= bodyB.height / 2;

      distanceJoint.addJoint({
        bodyA,
        bodyB,
        anchorA,
        anchorB
      });
    }
  }

  init();

  function spawnRagdoll() {
    const id = Math.random() * 1826622527;
    const revoluteJoint = new suffice2d.Constraints.revoluteJoint(engine, {
      stiffness: 0.5,
      id
    });
    const fixedJoint = new suffice2d.Constraints.fixedJoint(engine, {
      stiffness: 0.5,
      id
    });

    const head = new suffice2d.Bodies.circle(
      canvasWidth / 2,
      canvasHeight * 0.3,
      35,
      {
        wireframe,
        color: '#fbc48f'
      }
    );
    const body = new suffice2d.Bodies.capsule(
      canvasWidth / 2,
      canvasHeight * 0.3,
      35,
      60,
      {
        wireframe,
        color: '#3597f4'
      }
    );
    const arm1 = new suffice2d.Bodies.capsule(
      canvasWidth / 2,
      canvasHeight * 0.3,
      25,
      50,
      {
        wireframe,
        color: '#3597f4'
      }
    );
    const arm2 = new suffice2d.Bodies.capsule(
      canvasWidth / 2,
      canvasHeight * 0.3,
      25,
      50,
      {
        wireframe,
        color: '#3597f4'
      }
    );
    const arm3 = new suffice2d.Bodies.capsule(
      canvasWidth / 2,
      canvasHeight * 0.3,
      20,
      80,
      {
        wireframe,
        color: '#fbc48f'
      }
    );
    const arm4 = new suffice2d.Bodies.capsule(
      canvasWidth / 2,
      canvasHeight * 0.3,
      20,
      80,
      {
        wireframe,
        color: '#fbc48f'
      }
    );

    const hip = new suffice2d.Bodies.capsule(
      canvasWidth / 2,
      canvasHeight * 0.3,
      35,
      10,
      {
        wireframe,
        color: '#6d2e17'
      }
    );
    const leg1 = new suffice2d.Bodies.capsule(
      canvasWidth / 2,
      canvasHeight * 0.3,
      25,
      80,
      {
        wireframe,
        color: '#6d2e17'
      }
    );
    const leg2 = new suffice2d.Bodies.capsule(
      canvasWidth / 2,
      canvasHeight * 0.3,
      25,
      80,
      {
        wireframe,
        color: '#6d2e17'
      }
    );
    const leg3 = new suffice2d.Bodies.capsule(
      canvasWidth / 2,
      canvasHeight * 0.3,
      20,
      80,
      {
        wireframe,
        color: '#fbc48f'
      }
    );
    const leg4 = new suffice2d.Bodies.capsule(
      canvasWidth / 2,
      canvasHeight * 0.3,
      20,
      80,
      {
        wireframe,
        color: '#fbc48f'
      }
    );

    // engine.world.addBodies([
    //   head,
    //   body,
    //   arm1,
    //   arm2,
    //   arm3,
    //   arm4,
    //   hip,
    //   leg1,
    //   leg2,
    //   leg3,
    //   leg4,
    // ]);

    const headToBodyAnchorA = head.position.clone();
    const headToBodyAnchorB = body.position.clone();

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

    headToBodyAnchorA.y += head.radius;
    headToBodyAnchorB.y -= body.height / 2 + body.radius;
    arm1ToBodyAnchorA.y -= arm1.height / 2;
    arm1ToBodyAnchorB.y -= body.height / 2 + body.radius * 0.25;
    arm2ToBodyAnchorA.y -= body.height / 2 + body.radius * 0.25;
    arm2ToBodyAnchorB.y -= arm2.height / 2;

    arm3ToArm1AnchorA.y -= arm3.height / 2;
    arm3ToArm1AnchorB.y += arm1.height / 2;
    arm4ToArm2AnchorA.y -= arm4.height / 2;
    arm4ToArm2AnchorB.y += arm2.height / 2;

    bodyToHipAnchorA.y += body.height / 2 + body.radius * 0.5;
    bodyToHipAnchorB.y -= hip.height / 2;

    hipToLeg1AnchorA.y += hip.height / 2;
    hipToLeg1AnchorB.y -= leg1.height / 2;
    hipToLeg2AnchorA.y += hip.height / 2;
    hipToLeg2AnchorB.y -= leg2.height / 2;

    leg3ToLeg1AnchorA.y -= leg3.height / 2;
    leg3ToLeg1AnchorB.y += leg1.height / 2;
    leg4ToLeg2AnchorA.y -= leg4.height / 2;
    leg4ToLeg2AnchorB.y += leg2.height / 2;

    revoluteJoint.addJoint({
      bodyA: arm1,
      bodyB: body,
      anchorA: arm1ToBodyAnchorA,
      anchorB: arm1ToBodyAnchorB
    });

    revoluteJoint.addJoint({
      bodyA: leg3,
      bodyB: leg1,
      anchorA: leg3ToLeg1AnchorA,
      anchorB: leg3ToLeg1AnchorB
    });

    revoluteJoint.addJoint({
      bodyA: hip,
      bodyB: leg1,
      anchorA: hipToLeg1AnchorA,
      anchorB: hipToLeg1AnchorB
    });

    revoluteJoint.addJoint({
      bodyA: body,
      bodyB: arm2,
      anchorA: arm2ToBodyAnchorA,
      anchorB: arm2ToBodyAnchorB
    });

    revoluteJoint.addJoint({
      bodyA: arm4,
      bodyB: arm2,
      anchorA: arm4ToArm2AnchorA,
      anchorB: arm4ToArm2AnchorB
    });

    fixedJoint.addJoint({
      bodyA: body,
      bodyB: hip,
      anchorA: bodyToHipAnchorA,
      anchorB: bodyToHipAnchorB
    });

    revoluteJoint.addJoint({
      bodyA: hip,
      bodyB: leg2,
      anchorA: hipToLeg2AnchorA,
      anchorB: hipToLeg2AnchorB
    });

    fixedJoint.addJoint({
      bodyA: head,
      bodyB: body,
      anchorA: headToBodyAnchorA,
      anchorB: headToBodyAnchorB
    });

    revoluteJoint.addJoint({
      bodyA: leg4,
      bodyB: leg2,
      anchorA: leg4ToLeg2AnchorA,
      anchorB: leg4ToLeg2AnchorB
    });

    revoluteJoint.addJoint({
      bodyA: arm3,
      bodyB: arm1,
      anchorA: arm3ToArm1AnchorA,
      anchorB: arm3ToArm1AnchorB
    });
  }

  spawnRagdoll();
  // spawnRagdoll();

  function render(ctx, dt) {
    const fontSize = 12;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    if (isRenderGrid) engine.renderGrid(ctx);
    engine.world.collections.forEach(body => {
      body.render(ctx);
      if (isRenderDebug) body.renderDebug(ctx);
    });
    mouse.renderGrab(ctx);

    ctx.fillStyle = 'white';
    ctx.font = `normal ${fontSize}px Arial`;
    ctx.fillText(
      `
        ${Math.round(1000 / dt)} FPS 
        ${engine.world.collections.length} Rigid Bodies 
        ${engine.subSteps} Sub Steps
      `,
      canvasWidth * 0.5,
      fontSize * 2
    );
  }

  engine.event.on('collisionStart', ({ bodyA, bodyB }) => {
    //
  });
  engine.event.on('collisionEnd', ({ bodyA, bodyB }) => {
    //
  });
  engine.event.on('collisionActive', ({ bodyA, bodyB }) => {
    //
  });

  function update(dt) {
    render(ctx, dt);
    engine.run(dt);
    mouse.constrainBody(grabForce);
  }

  engine.animator.start(update);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      engine.animator.pause();
    } else {
      engine.animator.play();
    }
  });
};
