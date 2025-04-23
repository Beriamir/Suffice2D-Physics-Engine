import * as Physics from './physics/index.js';

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
  let restitution = 0.9;
  let subSteps = 4;
  const engine = new Physics.Engine({
    subSteps,
    gravity: 9.81,
    targetFPS: 60,
    removeOffBound: true,
    bound: {
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      scale: maxSize * 2
    }
  });
  const world = engine.world;
  const animator = engine.animator;

  const mouse = new Physics.Vec2(canvasWidth / 2, canvasHeight / 2);

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
    handleMouse(event.touches[0].clientX, event.touches[0].clientY);
  });

  canvas.addEventListener(
    'touchmove',
    throttle(event => {
      event.preventDefault();
      handleMouse(event.touches[0].clientX, event.touches[0].clientY);
    }, 1000 / 30)
  );

  canvas.addEventListener('mousedown', event => {
    event.preventDefault();
    handleMouse(event.offsetX, event.offsetY);
  });

  canvas.addEventListener(
    'mousemove',
    throttle(event => {
      event.preventDefault();
      handleMouse(event.offsetX, event.offsetY);
    }, 5000)
  );

  function handleMouse(eventX, eventY) {
    mouse.set(eventX, eventY);

    const size = Math.random() * (maxSize - minSize) + minSize;
    const x = clamp(mouse.x, size, canvasWidth - size);
    const y = clamp(mouse.y, size, canvasHeight - size);
    const option = {
      wireframe,
      restitution
    };
    const body = new Physics.Bodies.circle(x, y, size, option);

    world.addBody(body);
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
      0: new Physics.Bodies.capsule(
        canvasWidth * 0.5,
        canvasHeight - radius * 2,
        radius,
        canvasWidth - radius * 4,
        option
      ),
      // Left
      1: new Physics.Bodies.capsule(
        radius * 2,
        canvasHeight * 0.5,
        radius,
        canvasHeight - radius * 4,
        option
      ),
      // Right
      2: new Physics.Bodies.capsule(
        canvasWidth - radius * 2,
        canvasHeight * 0.5,
        radius,
        canvasHeight - radius * 4,
        option
      ),
      length: 3
    };
    const highMassBall = new Physics.Bodies.circle(
      canvasWidth * 0.5,
      canvasHeight * 0.2,
      50,
      {
        wireframe,
        restitution
      }
    );

    walls[0].rotate(-Math.PI / 2); // Ground

    world.addBodies(Array.from(walls));
    world.addBody(highMassBall);
  }

  init();

  function renderSimulation(ctx, dt) {
    const fontSize = 12;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    if (isRenderGrid) engine.renderGrid(ctx);
    world.collections.forEach(body => {
      body.render(ctx);
      if (isRenderDebug) body.renderDebug(ctx);
    });

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

  animator.start(update);
};
