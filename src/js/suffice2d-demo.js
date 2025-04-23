import * as Physics from './physics/index.js';

let currentFPS = 0; // 1000 / deltaTime
const targetFPS = 60;
let canvasWidth = innerWidth;
let canvasHeight = innerHeight;
const mouse = new Physics.Vec2(canvasWidth / 2, canvasHeight / 2);

let wireframe = false;
let showGrid = false;
let renderDebug = false;
let restitution = 0.9;
let subSteps = 4;
let gravity = 9.81;
const bodySize = 40;

const engine = new Physics.Engine({
  targetFPS,
  subSteps,
  gravity,
  velocityDamp: 0.999,
  removeOffBound: true,
  bound: {
    x: -bodySize,
    y: -bodySize,
    width: canvasWidth + bodySize,
    height: canvasHeight + bodySize,
    scale: bodySize
  }
});
const world = engine.world;
const animator = engine.animator;

const shapeTypes = ['circle', 'capsule', 'rectangle', 'polygon'];
let shapeTypeIndex = 0;
let shapeType = shapeTypes[shapeTypeIndex];

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

document.addEventListener('DOMContentLoaded', function () {
  const canvas = document.getElementById('canvas');
  const shapeTypeBtn = document.getElementById('shape-type');
  const restartBtn = document.getElementById('restart');
  const debugBtn = document.getElementById('debug');
  const btns = document.querySelectorAll('.btn');
  const ctx = canvas.getContext('2d');

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  btns.forEach(btn => {
    btn.style.visibility = 'visible';
  });

  /**
   * Initialize
   */
  function init() {
    world.empty();
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
        rotation: false
      }
    );
    const obstacle1 = new Physics.Bodies.capsule(
      canvasWidth * 0.2,
      canvasHeight * 0.5,
      20,
      canvasWidth < canvasHeight ? canvasWidth * 0.5 : canvasHeight * 0.5,
      {
        wireframe,
        isStatic: true,
        rotation: true
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
        rotation: false
      }
    );

    ground.rotate(Math.PI * 0.5);
    obstacle1.rotate(Math.PI * 0.5);
    obstacle2.rotate(Math.PI / 1.2);

    world.addBodies([ground, obstacle1, obstacle2]);
  }

  init();

  /**
   * Render
   */
  function renderSimulation(ctx, deltaTime) {
    const fontSize = 12;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    if (showGrid) engine.renderGrid(ctx);

    world.collections.forEach(body => {
      body.render(ctx);
      if (renderDebug) body.renderDebug(ctx);
    });

    ctx.fillStyle = 'white';
    ctx.font = `normal ${fontSize}px Arial`;
    ctx.fillText(
      `
        ${currentFPS} FPS 
        ${world.collections.length} Rigid Bodies 
        ${subSteps} Sub Steps
      `,
      canvasWidth * 0.5,
      fontSize * 2
    );
    ctx.fillText(
      `
        > Suffice2D Physics Engine 
      `,
      canvasWidth * 0.5,
      fontSize * 3.5
    );
  }

  /**
   * Update
   */
  function update(deltaTime) {
    renderSimulation(ctx);
    engine.run(deltaTime);
    currentFPS = Math.round(1000 / deltaTime);
  }

  animator.start(update);

  /**
   *
   *
   *
   *
   *
   *
   *
   *
   *
   * Event Listeners
   */
  canvas?.addEventListener('mousedown', event => {
    event.preventDefault();
    handleMouseDown(event.offsetX, event.offsetY);
  });

  canvas?.addEventListener('mouseup', event => {
    event.preventDefault();
    handleMouseUp();
  });

  canvas?.addEventListener(
    'mousemove',
    throttle(event => {
      event.preventDefault();
      handleMouseMove(event.offsetX, event.offsetY);
    }, 60)
  );

  canvas?.addEventListener('touchstart', event => {
    event.preventDefault();
    handleMouseDown(event.touches[0].clientX, event.touches[0].clientY);
  });

  canvas?.addEventListener('touchend', event => {
    event.preventDefault();
    handleMouseUp();
  });

  canvas?.addEventListener(
    'touchmove',
    throttle(event => {
      event.preventDefault();
      handleMouseMove(event.touches[0].clientX, event.touches[0].clientY);
    }, 60)
  );

  shapeTypeBtn?.addEventListener('click', handleShapeTypeBtn);

  restartBtn?.addEventListener('click', handleRestartButton);

  debugBtn?.addEventListener('click', handleDebugButton);

  /**
   *
   *
   *
   *
   *
   *
   *
   *
   *
   * Event Handlers
   */
  function handleMouseDown(eventX, eventY) {
    handleMouseMove(eventX, eventY);
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

        world.addBody(body);
        break;
      }
      case 'capsule': {
        const body = new Physics.Bodies.capsule(
          position.x,
          position.y,
          bodySize * 0.5,
          bodySize * 0.5,
          option
        );

        world.addBody(body);
        break;
      }
      case 'polygon': {
        const vertices = [];
        const edgeCount = Math.floor(Math.random() * (9 - 3) + 3);

        for (let i = 0; i < edgeCount; ++i) {
          const angle = (i * Math.PI * 2) / edgeCount;
          const radius = bodySize * 0.7;

          vertices.push(
            new Physics.Vec2(
              position.x + radius * Math.cos(angle),
              position.y + radius * Math.sin(angle)
            )
          );
        }

        const body = new Physics.Bodies.polygon(vertices, option);

        world.addBody(body);
        break;
      }
      case 'rectangle': {
        const body = new Physics.Bodies.rectangle(
          position.x,
          position.y,
          bodySize * 0.9,
          bodySize * 1.1,
          option
        );

        world.addBody(body);
        break;
      }
    }
  }

  function handleMouseUp() {
    mouse.set(canvasWidth / 2, canvasHeight / 2);
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
});
