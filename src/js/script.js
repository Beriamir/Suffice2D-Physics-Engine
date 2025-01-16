import { Composite, Engine, Bodies } from './physics/index.js';

onload = function main() {
  const canvas = document.getElementById('canvas');

  const ctx = canvas.getContext('2d');
  let canvasWidth = 400;
  let canvasHeight = 700;
  const pixelRatio = Math.ceil(devicePixelRatio) || 1;
  const targetFPS = 60;
  const timeInterval = 1000 / targetFPS;
  let timeAccumulator = 0;
  const mouse = { x: canvasWidth / 2, y: canvasHeight / 2 };

  const minSize = 30;
  const maxSize = 40;
  let wireframe = false;
  const restitution = 1;
  const engine = new Engine({
    subSteps: 4,
    grid: {
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      scale: maxSize
    }
  });

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

  function createStaticBodies() {
    const groundProps = {
      x: canvasWidth * 0.5,
      y: canvasHeight * 0.9,
      width: canvasWidth * 0.8,
      height: 50,
      option: {
        isStatic: true,
        wireframe
      }
    };

    const ground = new Bodies.rectangle(
      groundProps.x,
      groundProps.y,
      groundProps.width,
      groundProps.height,
      groundProps.option
    );

    Composite.add(engine, ground);
  }

  canvas.addEventListener('touchstart', event => {
    mouse.x = event.touches[0].clientX;
    mouse.y = event.touches[0].clientY;

    const width = clamp(Math.random() * maxSize, minSize, maxSize);
    const height = clamp(Math.random() * maxSize, minSize, maxSize);
    const x = clamp(mouse.x, width, canvasWidth - width);
    const y = clamp(mouse.y, height, canvasHeight - height);
    const option = {
      wireframe,
      restitution
    };
    const rectangle = new Bodies.rectangle(x, y, width, height, option);

    Composite.add(engine, rectangle);
  });

  canvas.addEventListener(
    'touchmove',
    throttle(event => {
      mouse.x = event.touches[0].clientX;
      mouse.y = event.touches[0].clientY;

      if (Math.random() - 0.5 < 0) {
        const radius = clamp(Math.random() * maxSize, minSize, maxSize) * 0.5;
        const x = clamp(mouse.x, radius, canvasWidth - radius);
        const y = clamp(mouse.y, radius, canvasHeight - radius);
        const option = {
          wireframe,
          restitution
        };
        const circle = new Bodies.circle(x, y, radius, option);

        Composite.add(engine, circle);
      } else {
        if (Math.random() - 0.5 < 0) {
          const radius = clamp(Math.random() * maxSize, minSize, maxSize) / 3;
          const height = clamp(Math.random() * maxSize, minSize, maxSize);
          const x = clamp(mouse.x, radius, canvasWidth - radius);
          const y = clamp(mouse.y, height, canvasHeight - height);
          const option = {
            wireframe,
            restitution
          };
          const pill = new Bodies.pill(x, y, radius, height, option);

          Composite.add(engine, pill);
        } else {
          const radius = clamp(Math.random() * maxSize, minSize, maxSize) / 1.5;
          const x = clamp(mouse.x, radius, canvasWidth - radius);
          const y = clamp(mouse.y, radius, canvasHeight - radius);
          const sides = Math.floor(Math.random() * 8);

          if (sides === 4) return;

          const option = {
            wireframe,
            restitution
          };
          const polygon = new Bodies.polygon(x, y, radius, sides, option);

          Composite.add(engine, polygon);
        }
      }
    }, 1000 / 30)
  );

  // Set canvas resolution
  canvas.width = canvasWidth * pixelRatio;
  canvas.height = canvasHeight * pixelRatio;
  canvas.style.width = canvasWidth + 'px';
  canvas.style.height = canvasHeight + 'px';
  ctx.scale(pixelRatio, pixelRatio);

  function init() {
    createStaticBodies();
  }

  function renderSimulation(ctx) {
    const fontSize = 12;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    // engine.renderGrid(ctx);
    // engine.renderBounds(ctx);
    engine.render(ctx);

    ctx.fillStyle = 'white';
    ctx.font = 'normal 12px Arial';
    ctx.fillText(
      `${Math.round(1000 / update.deltaTime || 0)} fps`,
      fontSize,
      fontSize * 2
    );
    ctx.fillText(`${engine.world.length} bodies`, fontSize, fontSize * 3);
  }

  function update(timeStamp) {
    update.deltaTime = timeStamp - update.lastTimeStamp || 0;
    update.lastTimeStamp = timeStamp;
    timeAccumulator += update.deltaTime;

    if (timeAccumulator > timeInterval) {
      timeAccumulator = 0;

      renderSimulation(ctx);
      engine.run(update.deltaTime);

      // Remove offcanvas bodies from the engine
      engine.world.forEach(body => {
        const { min, max, width, height } = body.getBound();

        if (
          min[0] < -width ||
          min[1] < -height ||
          max[0] > canvasWidth + width ||
          max[1] > canvasHeight + height
        ) {
          Composite.remove(engine, body);
        }
      });
    }

    requestAnimationFrame(update);
  }

  init();
  requestAnimationFrame(update);
};
