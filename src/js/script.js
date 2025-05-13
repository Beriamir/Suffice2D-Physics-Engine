import * as suffice2d from './suffice2d/index.js';

onload = function main() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  let canvasWidth = (canvas.width = innerWidth);
  let canvasHeight = (canvas.height = innerHeight);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const engine = new suffice2d.Engine({
    gravity: 0.0,
    subSteps: 4
  });
  const wireframe = false;
  const restitution = 0.4;
  const circleRadius = 30;
  const grabForce = 2;
  const density = null;
  const initialCount = 20;

  const mouse = new suffice2d.Mouse(canvasWidth / 2, canvasHeight / 2);

  canvas.addEventListener('touchstart', function (event) {
    mouse.setPosition(event.touches[0].clientX, event.touches[0].clientY);

    engine.world.collections.forEach(body => {
      if (body.bound.contains(mouse.position)) {
        mouse.grabBody(body);

        return null;
      }
    });
  });

  canvas.addEventListener('touchmove', function (event) {
    mouse.setPosition(event.touches[0].clientX, event.touches[0].clientY);
    mouse.moveBody(grabForce);
  });

  canvas.addEventListener('touchend', function (event) {
    mouse.dropBody();
  });

  function init() {
    const minWidth = 50;
    const minHeight = 50;

    const staticBodies = {
      // Ground
      0: new suffice2d.Bodies.rectangle(
        canvasWidth / 2,
        canvasHeight + minHeight / 2,
        canvasWidth,
        minHeight,
        {
          isStatic: true,
          rotation: false,
          wireframe
        }
      ),
      // Left Wall
      1: new suffice2d.Bodies.rectangle(
        -(minWidth / 2),
        canvasHeight / 2,
        50,
        canvasHeight,
        {
          isStatic: true,
          rotation: false,
          wireframe
        }
      ),
      // Right Wall
      2: new suffice2d.Bodies.rectangle(
        canvasWidth + minWidth / 2,
        canvasHeight / 2,
        50,
        canvasHeight,
        {
          isStatic: true,
          rotation: false,
          wireframe
        }
      ),
      // Ceiling
      3: new suffice2d.Bodies.rectangle(
        canvasWidth / 2,
        -(minHeight / 2),
        canvasWidth,
        50,
        {
          isStatic: true,
          rotation: false,
          wireframe
        }
      ),
      length: 4
    };

    engine.world.addBodies(Array.from(staticBodies));

    const option = {
      wireframe,
      restitution,
      density
    };

    for (let i = 0; i < 10; i++) {
      const radius = circleRadius;
      const x = Math.max(
        radius,
        Math.min(canvasWidth - radius, Math.random() * canvasWidth)
      );
      const y = Math.max(
        radius,
        Math.min(canvasHeight - radius, Math.random() * canvasHeight)
      );

      engine.world.addBodies([
        new suffice2d.Bodies.capsule(x, y, radius, radius, option),
        new suffice2d.Bodies.rectangle(x, y, radius * 2, radius * 2, option)
      ]);
    }

    for (let i = 0; i < initialCount; i++) {
      const radius = circleRadius;
      const x = Math.max(
        radius,
        Math.min(canvasWidth - radius, Math.random() * canvasWidth)
      );
      const y = Math.max(
        radius,
        Math.min(canvasHeight - radius, Math.random() * canvasHeight)
      );

      engine.world.addBody(new suffice2d.Bodies.circle(x, y, radius, option));
    }
  }

  init();

  function render(ctx, dt) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    engine.world.collections.forEach(body => body.render(ctx));
    mouse.renderGrab(ctx);

    const fontSize = 12;

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

  function update(dt) {
    render(ctx, dt);
    engine.run(dt, ctx);
  }

  engine.animator.start(update);
};
