import * as Physics from './physics/index.js';

onload = function main() {
  const Engine = Physics.Engine;
  const Bodies = Physics.Bodies;

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  let canvasWidth = innerWidth;
  let canvasHeight = innerHeight;
  const pixelRatio = 1; // devicePixelRatio || 1
  const targetFPS = 60;
  const timeInterval = 1000 / targetFPS;
  let timeAccumulator = 0;
  const mouse = { x: canvasWidth / 2, y: canvasHeight / 2 };

  const minSize = 40;
  const maxSize = 50;
  let wireframe = true;
  const restitution = 0.9;
  const solverIterations = 4;
  const engine = new Engine({
    wireframe,
    solverIterations,
    gravity: 9.81,
    bound: {
      x: -maxSize * 2,
      y: -maxSize * 2,
      width: canvasWidth + maxSize * 2,
      height: canvasHeight + maxSize * 2,
      scale: canvasWidth > canvasHeight ? maxSize * 2 : maxSize
    },
    removeOffBound: true
  });

  // Set canvas resolution
  canvas.width = canvasWidth * pixelRatio;
  canvas.height = canvasHeight * pixelRatio;
  canvas.style.width = canvasWidth + 'px';
  canvas.style.height = canvasHeight + 'px';
  ctx.scale(pixelRatio, pixelRatio);

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
    mouse.x = eventX;
    mouse.y = eventY;

    const randomSize = Math.random() * (maxSize - minSize) + minSize;
    const x = clamp(mouse.x, randomSize, canvasWidth - randomSize);
    const y = clamp(mouse.y, randomSize, canvasHeight - randomSize);
    const option = {
      wireframe,
      restitution
    };
    const body = new Bodies.rectangle(x, y, randomSize, randomSize, option);

    engine.world.addBody(body);
  }

  let spinnerLeft = null;
  let spinnerRight = null;

  function init() {
    // Create static bodies
    const color = '#6b6b6b5f';
    let spacing = 80;
    let width = 10;
    let height = canvasHeight * 0.6;
    const ground = new Bodies.pill(
      canvasWidth * 0.5,
      canvasHeight - spacing * 0.5,
      width,
      canvasWidth - spacing,
      {
        isStatic: true,
        wireframe,
        rotation: false,
        color: color,
        restitution
      }
    );
    const leftWall = new Bodies.pill(
      spacing * 0.5,
      canvasHeight * 0.7,
      width,
      height - spacing,
      {
        isStatic: true,
        wireframe,
        rotation: false,
        color: color,
        restitution
      }
    );
    const rightWall = new Bodies.pill(
      canvasWidth - spacing * 0.5,
      canvasHeight * 0.7,
      width,
      height - spacing,
      {
        isStatic: true,
        wireframe,
        rotation: false,
        color: color,
        restitution
      }
    );
    const upperWall = new Bodies.pill(
      canvasWidth * 0.5,
      spacing * 0.5,
      width,
      canvasHeight - spacing,
      {
        isStatic: true,
        wireframe,
        rotation: false,
        color: color,
        restitution
      }
    );

    spinnerLeft = new Bodies.pill(
      canvasWidth * 0.3,
      canvasHeight * 0.5,
      width,
      width + spacing * 3,
      {
        isStatic: true,
        wireframe,
        rotation: true,
        color: color,
        restitution
      }
    );

    spinnerRight = new Bodies.pill(
      canvasWidth * 0.7,
      canvasHeight * 0.8,
      width,
      width + spacing * 3,
      {
        isStatic: true,
        wireframe,
        rotation: true,
        color: color,
        restitution
      }
    );

    ground.rotate(-Math.PI / 2);
    upperWall.rotate(-Math.PI / 2);

    engine.world.addBodies([leftWall, rightWall, ground]);
  }

  init();

  function renderSimulation(ctx) {
    const fontSize = 12;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // engine.renderGrid(ctx);

    engine.world.collections.forEach(body => body.render(ctx));

    ctx.fillStyle = 'white';
    ctx.font = 'normal 12px Arial';
    ctx.fillText(
      `${Math.round(1000 / update.deltaTime || 0)} fps`,
      fontSize,
      fontSize * 2
    );
    ctx.fillText(
      `${engine.world.collections.length} bodies`,
      fontSize,
      fontSize * 3
    );
    ctx.fillText(`${solverIterations} subSteps`, fontSize, fontSize * 4);
  }

  function update(timeStamp) {
    update.deltaTime = timeStamp - update.lastTimeStamp || 0;
    update.lastTimeStamp = timeStamp;
    timeAccumulator += update.deltaTime;

    if (timeAccumulator > timeInterval) {
      timeAccumulator = 0;

      renderSimulation(ctx);
      engine.run(update.deltaTime);

      spinnerLeft.angularVelocity = 0.005;
      spinnerRight.angularVelocity = 0.02;
    }

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
};
