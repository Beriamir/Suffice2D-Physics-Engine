import * as Physics from "./physics/index.js";

function main() {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const canvasWidth = 400;
  const canvasHeight = 300;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const wireframe = false;

  const playerSpawnLoc = new Physics.Vec2(100, canvasHeight / 2);
  let playerJumpForce = -0.5;
  let isPlayerOnGround = false;

  let obstacleForce = -0.1;
  let obstacleForceScalar = 0.0001;

  let isGameOver = false;
  let score = 0;

  const player = new Physics.Bodies.pill(
    playerSpawnLoc.x,
    playerSpawnLoc.y,
    15,
    25,
    {
      color: "#0871ff",
      wireframe,
      density: 600,
      restitution: 0,
      rotation: true
    }
  );

  player.jump = function (force) {
    if (isPlayerOnGround && !isGameOver) {
      this.linearVelocity.y = force;
    }
  };

  player.collide = function (body) {
    if (this.label == "pill" && body.label == "rectangle") {
      const { collision: isCollided } = Physics.Collision.detectPolygonToPill(
        body,
        this
      );

      return isCollided;
    }
  };

  player.isOffBound = function (x, y, width, height) {
    return (
      this.bound.min.x < x ||
      this.bound.min.y < y ||
      this.bound.max.x > width ||
      this.bound.max.y > height
    );
  };

  player.destroy = function () {
    this.isAlive = false;
    this.color = "#ffffff50";
  };

  player.spawn = function () {
    this.isAlive = true;
    this.position.copy(playerSpawnLoc);
  };

  const ground = new Physics.Bodies.rectangle(
    canvasWidth / 2,
    canvasHeight,
    canvasWidth + 100,
    50,
    { color: "#c0c0c0", wireframe, rotation: false, isStatic: true }
  );

  const obstacles = [];

  const engine = new Physics.Engine({
    gravity: 9.81,
    bound: {
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      scale: 40
    },
    removeOffBound: true
  });

  engine.world.addBodies([player, ground]);

  function obstacleSpawner() {
    const spawnInterval = Math.random() * 2000 + 1000;
    const obstacle = new Physics.Bodies.rectangle(
      canvasWidth,
      canvasHeight - 50,
      Math.random() * 10 + 25,
      Math.random() * 10 + 40,
      {
        color: "#f45858",
        restitution: 1,
        wireframe,
        rotation: false
      }
    );

    obstacles.push(obstacle);
    engine.world.addBody(obstacle);

    setTimeout(() => {
      if (!isGameOver) obstacleSpawner();
    }, spawnInterval);
  }

  setTimeout(() => {
    if (!isGameOver) obstacleSpawner();
  }, 2000);

  function increaseScore() {
    score += 1;

    setTimeout(() => {
      if (!isGameOver) increaseScore();
    }, 500);
  }

  increaseScore();

  function gameLoop() {
    // Renders
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ground.render(ctx);
    player.render(ctx);
    obstacles.forEach(obstacle => {
      obstacle.render(ctx);
    });

    if (isGameOver) {
      ctx.fillStyle = "white";
      ctx.font = "20px Consolas";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText("Game Over!", canvasWidth * 0.5, canvasHeight * 0.4);
      ctx.font = "16px Consolas";
      ctx.fillText("Score: " + score, canvasWidth * 0.5, canvasHeight * 0.5);
    } else {
      ctx.fillStyle = "white";
      ctx.font = "12px Consolas";
      ctx.textBaseline = "middle";
      ctx.textAlign = "start";
      ctx.fillText("Score: " + score, 12, 12);
    }

    // Game Logic
    obstacles.forEach(obstacle => {
      if (player.collide(obstacle)) {
        isGameOver = true;
        player.destroy();
        obstacle.color = "red";
        player.restitution = 0.9;
      }

      if (!isGameOver) {
        obstacle.linearVelocity.x = obstacleForce;
      }
    });

    if (player.position.x != playerSpawnLoc.x) {
      isGameOver = true;
      player.destroy();
      player.restitution = 0.9;
    }

    if (player.collide(ground)) {
      isPlayerOnGround = true;
    } else isPlayerOnGround = false;

    obstacleForce -= obstacleForceScalar;
    engine.run();

    requestAnimationFrame(gameLoop);
  }

  gameLoop();

  window.addEventListener("touchstart", event => {
    player.jump(playerJumpForce);
  });
}

main();
