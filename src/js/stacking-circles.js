import * as suffice2d from './suffice2d/index.js';

onload = function main() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  let canvasWidth = innerWidth;
  let canvasHeight = innerHeight;

  const maxSize = 25;
  const minSize = 20;

  let isRenderGrid = false;
  let isRenderDebug = false;
  let wireframe = true;
  let restitution = 0.0;
  let subSteps = 4;
  const engine = new suffice2d.Engine({
    subSteps,
    gravity: 9.81,
    removeOffBound: true,
    bound: {
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      scale: maxSize * 2
    }
  });

  const mouse = new suffice2d.Mouse(canvasWidth / 2, canvasHeight / 2);

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

    mouse.setPosition(event.touches[0].clientX, event.touches[0].clientY);
    engine.world.collections.forEach(body => {
      if (body.bound.contains(mouse.position)) {
        mouse.grabBody(body);
        return null;
      }
    });

    if (!mouse.selectedBody) {
      handleMouse();
    }
  });

  canvas.addEventListener(
    'touchmove',
    throttle(event => {
      event.preventDefault();

      mouse.setPosition(event.touches[0].clientX, event.touches[0].clientY);
      mouse.moveBody(2);

      if (!mouse.selectedBody) {
        handleMouse();
      }
    }, 1000 / 30)
  );

  canvas.addEventListener('touchend', event => {
    event.preventDefault();

    mouse.dropBody();
  });

  canvas.addEventListener('mousedown', event => {
    event.preventDefault();
    mouse.setPosition(event.offsetX, event.offsetY);
    engine.world.collections.forEach(body => {
      if (body.bound.contains(mouse.position)) {
        mouse.grabBody(body);
        return null;
      }
    });

    if (!mouse.selectedBody) {
      handleMouse();
    }
  });

  canvas.addEventListener(
    'mousemove',
    throttle(event => {
      event.preventDefault();
      mouse.setPosition(event.offsetX, event.offsetY);
      mouse.moveBody(2);

      if (!mouse.selectedBody) {
        handleMouse();
      }
    }, 5000)
  );

  canvas.addEventListener('mouseup', event => {
    event.preventDefault();

    mouse.dropBody();
  });

  function handleMouse() {
    const size = Math.random() * (maxSize - minSize) + minSize;
    const x = clamp(mouse.position.x, size, canvasWidth - size);
    const y = clamp(mouse.position.y, size, canvasHeight - size);
    const option = {
      wireframe,
      restitution
    };
    const body = new suffice2d.Bodies.circle(x, y, size, option);

    engine.world.addBody(body);
  }

  function init() {
    // Create static bodies (Capsules)
    const radius = maxSize * 0.5;
    const option = {
      isStatic: true,
      rotation: false,
      wireframe
    };
    const walls = {
      // GROUND
      0: new suffice2d.Bodies.capsule(
        canvasWidth * 0.5,
        canvasHeight - radius * 2,
        radius,
        canvasWidth - radius * 4,
        option
      ),
      // Left
      1: new suffice2d.Bodies.capsule(
        radius * 2,
        canvasHeight * 0.5,
        radius,
        canvasHeight - radius * 4,
        option
      ),
      // Right
      2: new suffice2d.Bodies.capsule(
        canvasWidth - radius * 2,
        canvasHeight * 0.5,
        radius,
        canvasHeight - radius * 4,
        option
      ),
      length: 3
    };

    walls[0].rotate(-Math.PI / 2); // Ground

    engine.world.addBodies(Array.from(walls));
  }

  init();

  function renderSimulation(ctx, dt) {
    const fontSize = 12;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    if (isRenderGrid) engine.renderGrid(ctx);
    engine.world.collections.forEach(body => {
      body.render(ctx);
      if (isRenderDebug) body.renderDebug(ctx);
    });

    mouse.renderGrab(ctx);

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
  }

  engine.animator.start(update);
};
