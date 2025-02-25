import * as Physics from './physics/index.js';

onload = function main() {
  const Engine = Physics.Engine;
  const Bodies = Physics.Bodies;

  const targetFPS = 60;
  const timeInterval = 1000 / targetFPS;
  let timeAccumulator = 0;

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  let canvasWidth = innerWidth;
  let canvasHeight = innerHeight;
  const pixelRatio = 1 || devicePixelRatio;

  const mouse = { x: canvasWidth / 2, y: canvasHeight / 2 };
  let selectedBody = null;
  const maxSize = 40;
  const minSize = 30;
  let wireframe = true;
  const restitution = 0.0;
  const solverIterations = 4;
  const engine = new Engine({
    wireframe,
    solverIterations,
    gravity: 9.81,
    bound: {
      x: -maxSize,
      y: -maxSize,
      width: canvasWidth + maxSize,
      height: canvasHeight + maxSize,
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

  /**
   * User Interaction
   */
  canvas.addEventListener('touchstart', event => {
    event.preventDefault();
    handleMouseDown(event.touches[0].clientX, event.touches[0].clientY);
  });

  canvas.addEventListener('touchend', event => {
    event.preventDefault();
    handleMouseUp(event.offsetX, event.offsetY);
  });

  canvas.addEventListener(
    'touchmove',
    throttle(event => {
      event.preventDefault();
      handleMouseMove(event.touches[0].clientX, event.touches[0].clientY);
    }, 1000 / 30)
  );

  canvas.addEventListener('mousedown', event => {
    event.preventDefault();
    handleMouseDown(event.offsetX, event.offsetY);
  });

  canvas.addEventListener('mouseup', event => {
    event.preventDefault();
    handleMouseUp(event.offsetX, event.offsetY);
  });

  canvas.addEventListener(
    'mousemove',
    throttle(event => {
      event.preventDefault();
      handleMouseMove(event.offsetX, event.offsetY);
    }, 5000)
  );

  function handleMouseDown(eventX, eventY) {
    mouse.x = eventX;
    mouse.y = eventY;

    for (let i = 0; i < engine.world.collections.length; i++) {
      const body = engine.world.collections[i];

      if (body.bound.contains(mouse)) {
        selectedBody = body;
        return;
      }
    }

    const randomSize = Math.random() * (maxSize - minSize) + minSize;
    const x = clamp(mouse.x, randomSize, canvasWidth - randomSize);
    const y = clamp(mouse.y, randomSize, canvasHeight - randomSize);
    const option = {
      wireframe,
      restitution,
      color: '#c3945c'
    };
    const body = new Bodies.rectangle(x, y, maxSize, maxSize, option);

    engine.world.addBody(body);
  }

  function handleMouseMove(eventX, eventY) {
    mouse.x = eventX;
    mouse.y = eventY;

    if (selectedBody) {
      const offset = {
        x: mouse.x - selectedBody.position.x,
        y: mouse.y - selectedBody.position.y
      };
      selectedBody.translate(offset);
      if (!selectedBody.isStatic) selectedBody.linearVelocity.add(offset, 0.01);
      return;
    }

    let body = null;
    const randomSize = Math.random() * (maxSize - minSize) + minSize;
    const x = clamp(mouse.x, randomSize, canvasWidth - randomSize);
    const y = clamp(mouse.y, randomSize, canvasHeight - randomSize);
    const vertices = [];
    const edgeCount = Math.floor(Math.random() * (8 - 6) + 6);
    for (let i = 0; i < edgeCount; i++) {
      const angle = (i * Math.PI * 2) / edgeCount;

      const radius =
        edgeCount < 9
          ? Math.random() * (minSize - 10) + (maxSize - 10)
          : randomSize;

      vertices.push({
        x: x + radius * 0.7 * Math.cos(angle),
        y: y + radius * 0.7 * Math.sin(angle)
      });
    }
    const option = {
      wireframe,
      restitution
    };

    if (Math.random() - 0.5 < 0) {
      option.color = '#eb8014';
      body = new Bodies.circle(x, y, randomSize * 0.6, option);
    } else {
      if (Math.random() - 0.5 < 0) {
        option.color = '#2086b3';
        body = new Bodies.pill(
          x,
          y,
          randomSize * 0.4,
          randomSize * 0.8,
          option
        );
      } else {
        option.color = '#898989';
        body = new Bodies.polygon(vertices, option);
      }
    }

    engine.world.addBody(body);
  }

  function handleMouseUp() {
    selectedBody = null;
  }

  let rotatingObstacle1 = null;

  function init() {
    // Create static bodies
    const color = '#4e3546';
    const ground = new Bodies.rectangle(
      canvasWidth * 0.45,
      canvasHeight * 0.9,
      canvasWidth * 0.6,
      100,
      {
        isStatic: true,
        wireframe,
        rotation: false,
        color
      }
    );
    rotatingObstacle1 = new Bodies.pill(
      canvasWidth * 0.2,
      canvasHeight * 0.5,
      20,
      canvasWidth < canvasHeight ? canvasWidth * 0.5 : canvasHeight * 0.5,
      {
        isStatic: true,
        wireframe,
        rotation: true,
        color
      }
    );
    const bigwall = new Bodies.rectangle(
      canvasWidth * 0.9,
      canvasHeight * 0.5,
      canvasWidth * 0.5,
      100,
      {
        isStatic: true,
        wireframe,
        rotation: false,
        color
      }
    );

    rotatingObstacle1.rotate(Math.PI * 0.5);
    bigwall.rotate(-Math.PI / 8);
    // bigwall.roundCorner(20);

    engine.world.addBodies([ground, rotatingObstacle1, bigwall]);
  }

  init();

  function spawner() {
    let body = null;
    const randomSize = Math.random() * (maxSize - minSize) + minSize;
    const x = clamp(canvasWidth * 0.25, maxSize, canvasWidth - maxSize);
    const y = clamp(canvasHeight * 0.35, 0, canvasHeight - maxSize);
    const vertices = [];
    const edgeCount = Math.floor(Math.random() * (20 - 12) + 12);

    for (let i = 0; i < edgeCount; i++) {
      const angle = (i * Math.PI * 2) / edgeCount;

      vertices.push({
        x: x + randomSize * 0.7 * Math.cos(angle),
        y: y + randomSize * 0.7 * Math.sin(angle)
      });
    }

    const option = {
      wireframe,
      restitution
    };

    if (false && Math.random() - 0.5 < 0) {
      body = new Bodies.circle(x, y, maxSize * 0.5, option);
    } else {
      if (false && Math.random() - 0.5 < 0) {
        body = new Bodies.pill(x, y, maxSize * 0.35, maxSize * 0.8, option);
      } else {
        body = new Bodies.polygon(vertices, option);
      }
    }

    engine.world.addBody(body);

    setTimeout(() => {
      spawner();
    }, 1000);
  }

  // spawner();

  function renderSimulation(ctx) {
    const fontSize = 12;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    // engine.renderGrid(ctx);

    engine.world.collections.forEach(body => {
      // body.bound.render(ctx);
      body.render(ctx);
      // body.renderContacts(ctx);
    });

    ctx.fillStyle = 'white';
    ctx.font = `normal ${fontSize}px Arial`;
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
    ctx.fillText(
      `${solverIterations} solver iterations`,
      fontSize,
      fontSize * 4
    );
  }

  function update(timeStamp) {
    update.deltaTime = timeStamp - update.lastTimeStamp || 0;
    update.lastTimeStamp = timeStamp;
    timeAccumulator += update.deltaTime;

    if (timeAccumulator > timeInterval) {
      timeAccumulator = 0;

      renderSimulation(ctx);
      engine.run(update.deltaTime);
      // rotatingObstacle1.angularVelocity = 0.005
    }

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
};
