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

  const minSize = 20;
  const maxSize = 25;
  let wireframe = true;
  const restitution = 0.9;
  const subSteps = 4;
  const engine = new Engine({
    subSteps,
    gravity: 9.81,
    boundary: {
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
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
    const body = new Bodies.circle(x, y, randomSize, option);

    engine.world.addBody(body);
  }

  function generatePyramid() {
    const boxSize = 40;
    const iterations = 8;
    const offset = canvasHeight * 0.864 - iterations * boxSize;

    for (let i = 0; i < iterations; i++) {
      for (let j = iterations; j >= iterations - i; j--) {
        const x = boxSize * i + j * (boxSize / 2);
        const y = boxSize * j;
        const box = new Bodies.rectangle(
          x + boxSize,
          y + offset,
          boxSize,
          boxSize,
          {
            wireframe
          }
        );

        engine.world.addBody(box);
      }
    }
  }

  function init() {
    // Create static bodies
    const ground = new Bodies.capsule(
      canvasWidth * 0.5,
      canvasHeight * 0.9,
      10,
      canvasWidth * 4,
      {
        isStatic: true,
        wireframe: false,
        rotation: false,
        color: '#6b6b6b5f'
      }
    );

    ground.rotate(-Math.PI / 2);
    engine.world.addBody(ground);

    generatePyramid();
  }

  init();

  function renderSimulation(ctx) {
    const fontSize = 12;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

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
    ctx.fillText(`${subSteps} subSteps`, fontSize, fontSize * 4);
  }

  function update(timeStamp) {
    update.deltaTime = timeStamp - update.lastTimeStamp || 0;
    update.lastTimeStamp = timeStamp;
    timeAccumulator += update.deltaTime;

    if (timeAccumulator > timeInterval) {
      timeAccumulator = 0;

      renderSimulation(ctx);
      engine.run(update.deltaTime);
    }

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
};
