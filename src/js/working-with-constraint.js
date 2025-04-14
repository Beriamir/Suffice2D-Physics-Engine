import * as Physics from "./physics/index.js";

onload = function main() {
  const targetFPS = 60;
  const timeInterval = 1000 / targetFPS;
  let timeAccumulator = 0;

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  let canvasWidth = innerWidth;
  let canvasHeight = innerHeight;

  const maxSize = 30;
  const minSize = 20;

  const engine = new Physics.Engine({
    solverIterations: 4,
    gravity: 9.8,
    removeOffBound: false,
    bound: {
      x: -maxSize,
      y: -maxSize,
      width: canvasWidth + maxSize,
      height: canvasHeight + maxSize,
      scale: canvasWidth > canvasHeight ? maxSize * 2 : maxSize
    }
  });

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  /**
   * User Interaction
   */
  canvas.addEventListener("touchstart", event => {
    event.preventDefault();
    handleMouseDown(event.touches[0].clientX, event.touches[0].clientY);
  });

  canvas.addEventListener("touchend", event => {
    event.preventDefault();
    handleMouseUp(event.offsetX, event.offsetY);
  });

  canvas.addEventListener("touchmove", event => {
    event.preventDefault();
    handleMouseMove(event.touches[0].clientX, event.touches[0].clientY);
  });

  function handleMouseDown(x, y) {
    //
  }

  function handleMouseMove(x, y) {
    //
  }

  function handleMouseUp(x, y) {
    //
  }

  function init() {
    const wallsOption = {
      wireframe: false,
      isStatic: true,
      rotation: false,
      restitution: 1,
      color: "#ffffff50"
    };
    const wallDown = new Physics.Bodies.rectangle(
      canvasWidth / 2,
      canvasHeight,
      canvasWidth,
      20,
      wallsOption
    );
    const wallTop = new Physics.Bodies.rectangle(
      canvasWidth / 2,
      0,
      canvasWidth,
      20,
      wallsOption
    );
    const wallLeft = new Physics.Bodies.rectangle(
      0,
      canvasHeight / 2,
      20,
      canvasHeight,
      wallsOption
    );
    const wallRight = new Physics.Bodies.rectangle(
      canvasWidth,
      canvasHeight / 2,
      20,
      canvasHeight,
      wallsOption
    );

    const rectBody = new Physics.Bodies.rectangle(
      canvasWidth * 0.4,
      canvasHeight * 0.9,
      100,
      50,
      {
        wireframe: false,
        restitution: 0.9
      }
    );

    engine.world.addBodies([wallDown, wallTop, wallLeft, wallRight]);
    engine.world.addBody(rectBody);

    // Generate Circles
    const circlesSize = 30;
    const circlesWidth = canvasWidth * 0.4;
    const circlesHeight = canvasHeight * 0.4;
    const circlesX = circlesSize * 2;
    const circlesY = circlesSize * 2;

    for (let i = circlesX; i < circlesWidth; i += circlesSize) {
      for (let j = circlesY; j < circlesHeight; j += circlesSize) {
        const circle = new Physics.Bodies.circle(i, j, circlesSize / 2, {
          wireframe: false,
          restitution: 0.9
        });

        engine.world.addBody(circle);
      }
    }
  }

  init();

  function renderSimulation(ctx) {
    const fontSize = 12;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    engine.world.collections.forEach(body => {
      body.render(ctx);
      // body.renderContacts(ctx);
    });

    ctx.fillStyle = "white";
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
      `${engine.solverIterations} solver iterations`,
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
    }

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
};
