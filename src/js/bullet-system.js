import * as suffice2d from './suffice2d/index.js';

onload = function main() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  let canvasWidth = (canvas.width = innerWidth);
  let canvasHeight = (canvas.height = innerHeight);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const grabForce = 2;
  const wireframe = true;

  const bulletRestitution = 0.4;
  const bulletRadius = 10;
  const bulletDensity = null;

  const engine = new suffice2d.Engine({
    gravity: 9.81,
    subSteps: 4,
    removeOffBound: true,
    bound: {
      scale: bulletRadius * 4
    }
  });

  const mouse = new suffice2d.Mouse(canvasWidth / 2, canvasHeight / 2);

  canvas.addEventListener('touchstart', function (event) {
    mouse.setPosition(event.touches[0].clientX, event.touches[0].clientY);

    engine.world.collections.forEach(body => {
      if (body.bound.contains(mouse.position)) {
        mouse.grabBody(body);

        return null;
      }
    });

    spawnFastBodies();
  });

  canvas.addEventListener('touchmove', function (event) {
    mouse.setPosition(event.touches[0].clientX, event.touches[0].clientY);
    mouse.moveBody(grabForce);
    spawnFastBodies();
  });

  canvas.addEventListener('touchend', function (event) {
    mouse.dropBody();
  });

  function init() {
    const minWidth = 5;
    const minHeight = 5;
    const option = {
      isStatic: true,
      rotation: false,
      wireframe
    };

    const staticBodies = {
      // Left Wall
      0: new suffice2d.Bodies.rectangle(
        -(minWidth / 2),
        canvasHeight / 2,
        minWidth,
        canvasHeight,
        option
      ),
      // Right Wall
      1: new suffice2d.Bodies.rectangle(
        canvasWidth + minWidth / 2,
        canvasHeight / 2,
        minWidth,
        canvasHeight,
        option
      ),
      // Ceiling 1
      2: new suffice2d.Bodies.rectangle(
        canvasWidth / 2,
        -(minHeight / 2),
        canvasWidth,
        minHeight,
        option
      ),
      // Ceiling 2
      3: new suffice2d.Bodies.rectangle(
        canvasWidth / 2,
        -(minHeight / 2) + canvasHeight * 0.3,
        canvasWidth - bulletRadius * 4,
        bulletRadius,
        option
      ),
      length: 4
    };

    // staticBodies[3].rotate(Math.PI * 0.5);

    engine.world.addBodies(Array.from(staticBodies));
  }

  init();

  function spawnFastBodies() {
    const radius = bulletRadius;
    const speed = 10;
    const body = new suffice2d.Bodies.circle(
      canvasWidth * 0.5,
      canvasHeight - radius,
      radius,
      // radius * 2,
      {
        density: bulletDensity,
        wireframe,
        restitution: bulletRestitution
      }
    );
    const direction = suffice2d.Vec2.subtract(
      mouse.position,
      body.position
    ).normalize();
    const angle = Math.atan2(direction.y, direction.x);

    body.linearVelocity.add(direction.scale(speed));
    body.rotate(angle + Math.PI * 0.5);

    engine.world.addBody(body);
  }

  function render(ctx, dt) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    // engine.renderGrid(ctx);
    engine.world.collections.forEach(body => {
      body.render(ctx)
      // body.renderDebug(ctx)
    });
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
      canvasHeight - fontSize * 2
    );
  }

  function update(dt) {
    render(ctx, dt);
    engine.run(dt);
  }

  engine.animator.start(update);
};
