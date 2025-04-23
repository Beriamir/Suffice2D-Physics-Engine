import * as Physics from './physics/index.js';

let currentFPS = 0; // 1000 / deltaTime
const targetFPS = 60;
let canvasWidth = innerWidth;
let canvasHeight = innerHeight;
const mouse = new Physics.Vec2(canvasWidth / 2, canvasHeight / 2);

const bodySize = 40;
let wireframe = true;
let restitution = 0.9;
let subSteps = 4;
let gravity = 9.81;
let renderGrid = true;

const engine = new Physics.Engine({
  targetFPS,
  subSteps,
  gravity,
  removeOffBound: false,
  bound: {
    x: -bodySize * 4,
    y: -bodySize * 4,
    width: canvasWidth + bodySize * 4,
    height: canvasHeight + bodySize * 4,
    scale: canvasWidth > canvasHeight ? bodySize * 2 : bodySize
  }
});
const world = engine.world;
const animator = engine.animator;

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
  const ctx = canvas.getContext('2d');

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  /**
   * Initialize
   */
  function init() {
    const ground = new Physics.Bodies.rectangle(
      canvasWidth * 0.5,
      canvasHeight * 0.95,
      50,
      canvasWidth * 0.7,
      {
        wireframe,
        isStatic: true,
        rotation: false,
        restitution
      }
    );

    const obstacle1 = new Physics.Bodies.rectangle(
      canvasWidth * -0.15,
      canvasHeight * 0.4,
      canvasWidth,
      50,
      {
        wireframe,
        isStatic: true,
        rotation: false,
        restitution
      }
    );
    const obstacle2 = new Physics.Bodies.rectangle(
      canvasWidth * 1.15,
      canvasHeight * 0.4,
      canvasWidth,
      50,
      {
        wireframe,
        isStatic: true,
        rotation: false,
        restitution
      }
    );

    ground.rotate(Math.PI * 0.5);
    obstacle1.rotate(Math.PI / -1.1);
    obstacle2.rotate(Math.PI / 1.1);

    world.addBodies([ground, obstacle1, obstacle2]);
  }

  init();

  function spawn(position, delay = 4000) {
    setTimeout(() => {
      spawn(position, delay);
    }, delay);

    const circle = new Physics.Bodies.circle(position.x, position.y, bodySize * 0.5, {
      wireframe,
      restitution,
      density: 1500
    });

    world.addBody(circle);
  }

  spawn(new Physics.Vec2(canvasWidth * -0.15, canvasHeight * 0.3), 1000 * 0.3);
  spawn(new Physics.Vec2(canvasWidth * 1.15, canvasHeight * 0.3), 1000 * 0.3);

  /**
   * Render
   */
  function renderSimulation(ctx, deltaTime) {
    const fontSize = 12;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    if (renderGrid) engine.renderGrid(ctx);
    world.collections.forEach(body => {
      body.render(ctx);
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

    world.collections.forEach(body => {
      if (body.bound.min.y > canvasHeight) {
        world.removeBody(body);
      }
    });
  }

  animator.start(update);
});
