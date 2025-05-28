import * as suffice2d from './suffice2d/index.js';

onload = function main() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  let canvasWidth = (canvas.width = innerWidth);
  let canvasHeight = (canvas.height = innerHeight);
  const engine = new suffice2d.Engine({
    subSteps: 120, 
    targetFPS: 90,
  });
  const fontSize = 12;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `normal ${fontSize}px Verdana`;

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
    const bodiesSize = 20;
    const arrayBodies = [];
    const revoluteJoint = new suffice2d.Constraints.revoluteJoint(engine, {
      selfCollision: false
    });

    for (let i = 0; i < 4; ++i) {
      const x = canvasWidth * 0.5;
      const y = bodiesSize * i + canvasHeight * 0.3;
      const body = new suffice2d.RigidBodies.capsule(
        x,
        y,
        bodiesSize,
        bodiesSize * 5,
        {
          wireframe: false,
          restitution: 0.4,
          staticFriction: 0.3,
          kineticFriction: 0.1,
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
        // anchorA.y += prev.radius;
        // anchorB.y -= body.radius;
        revoluteJoint.addJoint(prev, body, anchorA, anchorB, {
          stiffness: 0.5
        });
      }
    }
  }

  init();

  function render(ctx, dt) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    engine.world.forEach(body => body.render(ctx));
    engine.mouse.render(ctx);

    ctx.fillStyle = 'white';
    ctx.fillText(`
      ${~~(1000 / dt)} FPS 
      ${engine.subSteps} Sub Steps
    `, canvasWidth * 0.5, fontSize * 2);
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
