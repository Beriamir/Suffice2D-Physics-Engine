import * as suffice2d from './suffice2d/index.js';

onload = function main() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  let canvasWidth = (canvas.width = innerWidth);
  let canvasHeight = (canvas.height = innerHeight);
  const fontSize = 14;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `normal ${fontSize}px Arial`;

  const engine = new suffice2d.Engine({
    gravity: 0.0,
    subSteps: 1
  });
  const wireframe = true;
  const restitution = 0.0;
  const isRenderGrid = false;
  const isRenderDebug = true;
  const grabForce = 0.01;

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

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      engine.pause();
    } else engine.play();
  });

  function init() {
    const size = 150;

    engine.world.addBody(
      new suffice2d.RigidBodies.rectangle(
        canvasWidth / 2,
        canvasHeight / 4,
        size,
        size,
        {
          wireframe,
          restitution,
        }
      )
    );
    engine.world.addBody(
      new suffice2d.RigidBodies.rectangle(
        canvasWidth / 2,
        canvasHeight / 2,
        size,
        size,
        {
          wireframe,
          restitution,
          isSensor: true,
          isStatic: true,
          fixedRot: true,
          rotation: Math.PI * 1.25
        }
      )
    );
  }

  init();

  function render(ctx, dt) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    if (isRenderGrid) engine.renderGrid(ctx);
    engine.world.forEach(body => {
      body.render(ctx);
      if (isRenderDebug) {
        body.renderDebug(ctx);
      }
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

  engine.event.on('collisionStart', ({ bodyA, bodyB }) => {
    // console.log('start');
  });
  engine.event.on('collisionEnd', ({ bodyA, bodyB }) => {
    // console.log('end');
  });
  engine.event.on('collisionActive', ({ bodyA, bodyB }) => {
    // console.log('active');
  });

  function update(dt) {
    render(ctx, dt);
    engine.run(dt, ctx);
    mouse.constrainBody(grabForce);
  }

  engine.start(update);
};
