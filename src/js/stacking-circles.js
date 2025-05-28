import * as suffice2d from './suffice2d/index.js';

onload = function main() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  let canvasWidth = innerWidth;
  let canvasHeight = innerHeight;

  const maxSize = 50;
  const minSize = 40;

  let isRenderGrid = false;
  let isRenderDebug = false;
  let wireframe = true;
  let restitution = 0.4;
  let subSteps = 4;
  const engine = new suffice2d.Engine({
    subSteps,
    gravity: 9.81,
    removeOffBound: true
  });

  // Set canvas resolution
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  ctx.font = 'normal 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  function throttle(callback, delay) {
    let lastTime = 0;
    return (...args) => {
      const now = performance.now();
      if (now - lastTime > delay) {
        callback(...args);
        lastTime = now;
      }
    };
  }

  canvas.addEventListener('touchstart', event => {
    event.preventDefault();
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

    if (!engine.mouse.selectedBody) {
      handleMouse();
    }
  });

  canvas.addEventListener(
    'touchmove',
    throttle(event => {
      event.preventDefault();
      engine.mouse.setPosition(
        event.touches[0].clientX,
        event.touches[0].clientY
      );

      if (!engine.mouse.selectedBody) {
        handleMouse();
      }
    }, 1000 / 30)
  );

  canvas.addEventListener('touchend', event => {
    event.preventDefault();
    engine.mouse.drop();
  });

  canvas.addEventListener('mousedown', event => {
    event.preventDefault();
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

    if (!engine.mouse.selectedBody) {
      handleMouse();
    }
  });

  canvas.addEventListener(
    'mousemove',
    throttle(event => {
      event.preventDefault();
      engine.mouse.setPosition(event.offsetX, event.offsetY);

      if (!engine.mouse.selectedBody) {
        handleMouse();
      }
    }, 5000)
  );

  canvas.addEventListener('mouseup', event => {
    event.preventDefault();
    engine.mouse.drop();
  });

  function handleMouse() {
    const size = Math.random() * (maxSize - minSize) + minSize;
    const x = clamp(engine.mouse.position.x, size, canvasWidth - size);
    const y = clamp(engine.mouse.position.y, size, canvasHeight - size);
    const option = {
      wireframe,
      restitution
    };
    const circle = new suffice2d.RigidBodies.circle(x, y, size * 0.5, option);
    const rect = new suffice2d.RigidBodies.rectangle(x, y, size, size, option);

    engine.world.addBodies([circle]);
  }

  function init() {
    // Create static bodies (Capsules)
    const radius = 20;
    const option = {
      isStatic: true,
      fixedRot: true,
      wireframe
    };
    const walls = {
      // GROUND
      0: new suffice2d.RigidBodies.capsule(
        canvasWidth * 0.5,
        canvasHeight,
        radius,
        canvasWidth,
        {
          rotation: -Math.PI * 0.5,
          ...option
        }
      ),
      // Left
      1: new suffice2d.RigidBodies.capsule(
        0,
        canvasHeight * 0.5,
        radius,
        canvasHeight,
        option
      ),
      // Right
      2: new suffice2d.RigidBodies.capsule(
        canvasWidth,
        canvasHeight * 0.5,
        radius,
        canvasHeight,
        option
      ),
      length: 3
    };

    engine.world.addBodies(Array.from(walls));
  }

  init();

  function renderSimulation(ctx, dt) {
    const fontSize = 12;

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
        ${engine.world.collections.length} Bodies
        ${subSteps} Sub Steps
      `,
      canvasWidth * 0.5,
      fontSize * 2
    );
  }

  function update(dt) {
    renderSimulation(ctx, dt);
    engine.run(dt);
    engine.mouse.constrain(dt);
  }

  engine.start(update);
};
