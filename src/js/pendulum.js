import * as suffice2d from './suffice2d/index.js';

onload = function main() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const fontSize = 12;

  let canvasWidth = (canvas.width = innerWidth);
  let canvasHeight = (canvas.height = innerHeight);

  const engine = new suffice2d.Engine();
  const mouse = new suffice2d.Mouse(canvasWidth / 2, canvasHeight / 2);

  canvas.addEventListener('touchstart', function (event) {
    mouse.setPosition(event.touches[0].clientX, event.touches[0].clientY);

    engine.world.forEach(body => {
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
    const revoluteJoint = new suffice2d.Constraints.revoluteJoint(engine, {
      selfCollision: false
    });
    const arrayBodies = [];
    const bodiesSize = 20;

    for (let i = 0; i < 4; i++) {
      const x = canvasWidth * 0.5;
      const y = bodiesSize * i + canvasHeight * 0.3;
      const body = new suffice2d.RigidBodies.capsule(
        x,
        y,
        bodiesSize * 0.5,
        bodiesSize * 2 * i,
        {
          wireframe: false,
          restitution: 0.4,
          staticFriction: 0.0,
          kineticFriction: 0.0,
          isStatic: i === 0,
          fixedRot: i === 0
        }
      );

      arrayBodies.push(body);

      if (i > 0) {
        const prev = arrayBodies[i - 1];
        const anchorA = prev.position.clone();
        const anchorB = body.position.clone();

        anchorA.y += prev.height * 0.5;
        anchorB.y -= body.height * 0.5;
        revoluteJoint.addJoint(prev, body, anchorA, anchorB, {
          stiffness: 1,
          springiness: 0
        });
      }
    }
  }

  init();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `normal ${fontSize}px Arial`;

  function render(ctx, dt) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    engine.renderGrid(ctx);
    engine.world.forEach(body => {
      body.render(ctx);
      body.renderDebug(ctx);
    });
    mouse.renderGrab(ctx);

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
    mouse.constrainBody(dt);
  }

  engine.start(update);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      engine.pause();
    } else engine.play();
  });
};
