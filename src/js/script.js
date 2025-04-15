import * as Physics from './physics/index.js';

onload = function main() {
  const targetFPS = 60;
  const timeInterval = 1000 / targetFPS;
  let timeAccumulator = 0;
  let lastTimeStamp = performance.now();
  let deltaTime = 0;

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  let canvasWidth = (canvas.width = innerWidth);
  let canvasHeight = (canvas.height = innerHeight);

  const mouse = new Physics.Vec2(canvasWidth / 2, canvasHeight / 2);
  const bodySize = 40;

  let wireframe = false;
  let showGrid = false;
  let renderDebug = false;
  let restitution = 0.9;
  let subSteps = 4;
  let gravity = 9.8;
  const engine = new Physics.Engine({
    subSteps,
    gravity,
    removeOffBound: true,
    bound: {
      x: -bodySize,
      y: -bodySize,
      width: canvasWidth + bodySize,
      height: canvasHeight + bodySize,
      scale: canvasWidth > canvasHeight ? bodySize * 2 : bodySize
    }
  });

  const shapeTypeBtn = document.getElementById('shape-type');
  const shapeTypes = ['circle', 'pill', 'rectangle', 'polygon'];
  let shapeTypeIndex = 0;
  let shapeType = shapeTypes[shapeTypeIndex];

  const restartBtn = document.getElementById('restart');
  const debugBtn = document.getElementById('debug');

  function clamp(value, min = 0, max = 1) {
    return value > max ? max : value < min ? min : value;
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
   * Event Listeners
   */
  canvas.addEventListener('mousedown', event => {
    event.preventDefault();
    handleMouseDown(event.offsetX, event.offsetY);
  });

  canvas.addEventListener('mouseup', event => {
    event.preventDefault();
    handleMouseUp();
  });

  canvas.addEventListener(
    'mousemove',
    throttle(event => {
      event.preventDefault();
      handleMouseMove(event.offsetX, event.offsetY);
    }, 4000 / targetFPS)
  );

  canvas.addEventListener('touchstart', event => {
    event.preventDefault();
    handleMouseDown(event.touches[0].clientX, event.touches[0].clientY);
  });

  canvas.addEventListener('touchend', event => {
    event.preventDefault();
    handleMouseUp();
  });

  canvas.addEventListener(
    'touchmove',
    throttle(event => {
      event.preventDefault();
      handleMouseMove(event.touches[0].clientX, event.touches[0].clientY);
    }, 4000 / targetFPS)
  );

  shapeTypeBtn.addEventListener('click', event => {
    handleShapeTypeBtn();
  });

  restartBtn.addEventListener('click', event => {
    handleRestartButton();
  });

  debugBtn.addEventListener('click', event => {
    handleDebugButton();
  });

  /**
   * Event Handlers
   */
  function handleMouseDown(eventX, eventY) {
    mouse.set(eventX, eventY);

    const position = new Physics.Vec2(
      clamp(mouse.x, bodySize, canvasWidth - bodySize),
      clamp(mouse.y, bodySize, canvasHeight - bodySize)
    );
    const option = {
      wireframe,
      restitution
    };

    switch (shapeType) {
      case 'circle': {
        const body = new Physics.Bodies.circle(
          position.x,
          position.y,
          bodySize * 0.5,
          option
        );

        engine.world.addBody(body);
        break;
      }
      case 'pill': {
        const body = new Physics.Bodies.pill(
          position.x,
          position.y,
          bodySize * 0.4,
          bodySize * 0.6,
          option
        );

        engine.world.addBody(body);
        break;
      }
      case 'polygon': {
        const vertices = [];
        const edgeCount = Math.floor(Math.random() * (9 - 3) + 3);

        for (let i = 0; i < edgeCount; ++i) {
          const angle = (i * Math.PI * 2) / edgeCount;
          const radius = bodySize * 0.65;

          vertices.push(
            new Physics.Vec2(
              position.x + radius * Math.cos(angle),
              position.y + radius * Math.sin(angle)
            )
          );
        }

        const body = new Physics.Bodies.polygon(vertices, option);

        engine.world.addBody(body);
        break;
      }

      case 'rectangle': {
        const body = new Physics.Bodies.rectangle(
          position.x,
          position.y,
          bodySize - 10,
          bodySize + 10,
          option
        );

        engine.world.addBody(body);
        break;
      }
    }
  }

  function handleMouseMove(eventX, eventY) {
    mouse.set(eventX, eventY);

    const position = new Physics.Vec2(
      clamp(mouse.x, bodySize, canvasWidth - bodySize),
      clamp(mouse.y, bodySize, canvasHeight - bodySize)
    );
    const option = {
      wireframe,
      restitution
    };

    switch (shapeType) {
      case 'circle': {
        const body = new Physics.Bodies.circle(
          position.x,
          position.y,
          bodySize * 0.5,
          option
        );

        engine.world.addBody(body);
        break;
      }
      case 'pill': {
        const body = new Physics.Bodies.pill(
          position.x,
          position.y,
          bodySize * 0.4,
          bodySize * 0.6,
          option
        );

        engine.world.addBody(body);
        break;
      }
      case 'polygon': {
        const vertices = [];
        const edgeCount = Math.floor(Math.random() * (9 - 3) + 3);

        for (let i = 0; i < edgeCount; ++i) {
          const angle = (i * Math.PI * 2) / edgeCount;
          const radius = bodySize * 0.65;

          vertices.push(
            new Physics.Vec2(
              position.x + radius * Math.cos(angle),
              position.y + radius * Math.sin(angle)
            )
          );
        }

        const body = new Physics.Bodies.polygon(vertices, option);

        engine.world.addBody(body);
        break;
      }
      case 'rectangle': {
        const body = new Physics.Bodies.rectangle(
          position.x,
          position.y,
          bodySize - 10,
          bodySize + 10,
          option
        );

        engine.world.addBody(body);
        break;
      }
    }
  }

  function handleMouseUp() {
    //
  }

  function handleShapeTypeBtn() {
    shapeTypeIndex++;
    shapeType = shapeTypes[shapeTypeIndex % shapeTypes.length];
    shapeTypeBtn.innerText = shapeType + ' +';
  }

  function handleRestartButton() {
    init();
  }

  function handleDebugButton() {
    showGrid = !showGrid;
    renderDebug = !renderDebug;

    engine.world.collections.forEach(body => {
      wireframe = renderDebug ? true : false;
      body.wireframe = wireframe;
    });
  }

  function init() {
    engine.world.empty();
    shapeTypeIndex = 0;
    shapeType = shapeTypes[shapeTypeIndex];
    shapeTypeBtn.innerText = shapeType + ' +';
    wireframe = false;
    showGrid = false;
    renderDebug = false;

    const ground = new Physics.Bodies.rectangle(
      canvasWidth * 0.45,
      canvasHeight * 0.9,
      50,
      canvasWidth * 0.6,
      {
        wireframe,
        isStatic: true,
        rotation: false,
        restitution
      }
    );
    const obstacle1 = new Physics.Bodies.pill(
      canvasWidth * 0.2,
      canvasHeight * 0.5,
      20,
      canvasWidth < canvasHeight ? canvasWidth * 0.5 : canvasHeight * 0.5,
      {
        wireframe,
        isStatic: true,
        rotation: true,
        restitution
      }
    );
    const obstacle2 = new Physics.Bodies.rectangle(
      canvasWidth * 0.9,
      canvasHeight * 0.5,
      canvasWidth * 0.5,
      100,
      {
        wireframe,
        isStatic: true,
        rotation: false,
        restitution
      }
    );

    ground.rotate(Math.PI * 0.5);
    obstacle1.rotate(Math.PI * 0.5);
    obstacle2.rotate(Math.PI / 1.2);

    engine.world.addBodies([ground, obstacle1, obstacle2]);
  }

  init();

  function renderSimulation(ctx) {
    const fontSize = 12;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (showGrid) engine.renderGrid(ctx);

    engine.world.collections.forEach(body => {
      body.render(ctx);
      if (renderDebug) body.renderDebug(ctx);
    });

    ctx.fillStyle = 'white';
    ctx.font = `normal ${fontSize}px Arial`;
    ctx.fillText(
      `
        ${Math.round(1000 / deltaTime)} FPS 
        ${engine.world.collections.length} Rigid Bodies 
        ${subSteps} Sub Steps
      `,
      fontSize,
      fontSize * 2
    );
    ctx.fillText(
      `
        > Beriamir -- beriamirdev@gmail.com
      `,
      fontSize,
      fontSize * 3.5
    );
    ctx.fillText(
      `
        > Suffice2D Physics Engine 
      `,
      fontSize,
      fontSize * 5
    );
  }

  function update(timeStamp) {
    deltaTime = timeStamp - lastTimeStamp;
    lastTimeStamp = timeStamp;
    timeAccumulator += deltaTime;

    if (timeAccumulator > timeInterval) {
      timeAccumulator = 0;

      renderSimulation(ctx);
      engine.run(deltaTime);
    }

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
};
