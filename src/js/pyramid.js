import * as suffice2d from './suffice2d/index.js';

onload = function main() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  let canvasWidth = innerWidth;
  let canvasHeight = innerHeight;
  const pixelRatio = 1; // devicePixelRatio || 1
  const targetFPS = 60;
  const timeInterval = 1000 / targetFPS;
  let timeAccumulator = 0;
  
  const minSize = 20;
  const maxSize = 25;
  let wireframe = true;
  const restitution = 0.9;
  const subSteps = 4;
  const engine = new suffice2d.Engine({
    subSteps,
    gravity: 9.81,
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
    engine.mouse.setPosition(eventX, eventY);

    const randomSize = Math.random() * (maxSize - minSize) + minSize;
    const x = clamp(engine.mouse.position.x, randomSize, canvasWidth - randomSize);
    const y = clamp(engine.mouse.position.y, randomSize, canvasHeight - randomSize);
    const option = {
      wireframe,
      restitution
    };
    const body = new suffice2d.RigidBodies.circle(x, y, randomSize, option);

    engine.world.addBody(body);
  }

  function generatePyramid() {
    const boxSize = 40;
    const iterations = 10;
    const offset = canvasHeight * 0.864 - iterations * boxSize;

    for (let i = 0; i < iterations; i++) {
      for (let j = iterations; j >= iterations - i; j--) {
        const x = boxSize * i + j * (boxSize / 2);
        const y = boxSize * j;
        const box = new suffice2d.RigidBodies.rectangle(
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
    const ground = new suffice2d.RigidBodies.capsule(
      canvasWidth * 0.5,
      canvasHeight * 0.9,
      10,
      canvasWidth * 2,
      {
        isStatic: true,
        fixedRot: true,
        wireframe,
        color: '#6b6b6b5f'
      }
    );

    ground.rotate(-Math.PI / 2);
    engine.world.addBody(ground);

    generatePyramid();
  }

  init();

  function renderSimulation(ctx, dt) {
    const fontSize = 12;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    engine.world.forEach(body => body.render(ctx));

    ctx.fillStyle = 'white';
    ctx.font = 'normal 12px Arial';
    ctx.fillText(
      `${Math.round(1000 / dt)} fps`,
      fontSize,
      fontSize * 2
    );
    ctx.fillText(
      `${engine.world.count} bodies`,
      fontSize,
      fontSize * 3
    );
    ctx.fillText(`${engine.subSteps} subSteps`, fontSize, fontSize * 4);
  }

  function update(dt) {
      renderSimulation(ctx, dt);
      engine.run(dt);
  }
  
  engine.start(update);
};
