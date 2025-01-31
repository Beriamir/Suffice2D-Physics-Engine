import { Vec2, Composite, Engine, Bodies } from './physics/index.js'

onload = function main() {
  const canvas = document.getElementById('canvas')

  const ctx = canvas.getContext('2d')
  let canvasWidth = innerWidth
  let canvasHeight = innerHeight
  const pixelRatio = devicePixelRatio || 1
  const targetFPS = 60
  const timeInterval = 1000 / targetFPS
  let timeAccumulator = 0
  const mouse = { x: canvasWidth / 2, y: canvasHeight / 2 }

  const minSize = 30
  const maxSize = 40
  let wireframe = true
  const restitution = 0.9
  const subSteps = 4
  const engine = new Engine({
    wireframe,
    subSteps,
    gravity: 9.81,
    grid: {
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      scale: canvasWidth > canvasHeight ? maxSize * 2 : maxSize
    }
  })

  // Set canvas resolution
  canvas.width = canvasWidth * pixelRatio
  canvas.height = canvasHeight * pixelRatio
  canvas.style.width = canvasWidth + 'px'
  canvas.style.height = canvasHeight + 'px'
  ctx.scale(pixelRatio, pixelRatio)

  function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value))
  }

  function throttle(callback, delay) {
    let lastTime = 0
    return (...args) => {
      const now = performance.now()
      if (now - lastTime > delay) {
        callback(...args)
        lastTime = now
      }
    }
  }

  canvas.addEventListener('touchstart', event => {
    event.preventDefault()
    handleMouseDown(event.touches[0].clientX, event.touches[0].clientY)
  })

  canvas.addEventListener(
    'touchmove',
    throttle(event => {
      event.preventDefault()
      handleMouseMove(event.touches[0].clientX, event.touches[0].clientY)
    }, 1000 / 30)
  )

  canvas.addEventListener('mousedown', event => {
    event.preventDefault()
    handleMouseDown(event.offsetX, event.offsetY)
  })

  canvas.addEventListener(
    'mousemove',
    throttle(event => {
      event.preventDefault()
      handleMouseMove(event.offsetX, event.offsetY)
    }, 1000 / 30)
  )

  function handleMouseDown(eventX, eventY) {
    mouse.x = eventX
    mouse.y = eventY

    const randomSize = Math.random() * (maxSize - minSize) + minSize
    const x = clamp(mouse.x, randomSize, canvasWidth - randomSize)
    const y = clamp(mouse.y, randomSize, canvasHeight - randomSize)
    const option = {
      wireframe,
      restitution
    }
    const body = new Bodies.rectangle(x, y, randomSize, randomSize, option)

    Composite.add(engine, body)
  }

  function handleMouseMove(eventX, eventY) {
    mouse.x = eventX
    mouse.y = eventY

    let body = null
    const randomSize = Math.random() * (maxSize - minSize) + minSize
    const x = clamp(mouse.x, randomSize, canvasWidth - randomSize)
    const y = clamp(mouse.y, randomSize, canvasHeight - randomSize)
    const vertices = []
    const edgeCount = Math.floor(Math.random() * (8 - 5) + 5)
    for (let i = 0; i < edgeCount; i++) {
      const angle = (i * Math.PI * 2) / edgeCount
      const radius = Math.random() * (minSize - 10) + (maxSize - 10)

      vertices.push({
        x: x + radius * 0.7 * Math.cos(angle),
        y: y + radius * 0.7 * Math.sin(angle)
      })
    }
    const option = {
      wireframe,
      restitution,
      velocity: new Vec2().zero()
    }

    if (Math.random() - 0.5 < 0) {
      body = new Bodies.circle(x, y, randomSize * 0.6, option)
    } else {
      if (Math.random() - 0.5 < 0) {
        body = new Bodies.pill(x, y, randomSize * 0.4, randomSize, option)
      } else {
        body = new Bodies.polygon(vertices, option)
      }
    }

    Composite.add(engine, body)
  }

  function init() {
    // Create static bodies
    const ground = new Bodies.rectangle(
      canvasWidth * 0.45,
      canvasHeight * 0.9,
      canvasWidth * 0.6,
      100,
      {
        isStatic: true,
        wireframe,
        rotation: false,
        color: '#8a8a8a'
      }
    )
    const rotatingObstacle1 = new Bodies.pill(
      canvasWidth * 0.2,
      canvasHeight * 0.5,
      20,
      canvasWidth < canvasHeight ? canvasWidth * 0.4 : canvasHeight * 0.4,
      {
        isStatic: true,
        wireframe,
        rotation: true,
        color: '#8a8a8a'
      }
    )
    const bigwall = new Bodies.rectangle(
      canvasWidth * 0.9,
      canvasHeight * 0.5,
      canvasWidth * 0.5,
      100,
      {
        isStatic: true,
        wireframe,
        rotation: false,
        color: '#8a8a8a'
      }
    )

    rotatingObstacle1.rotate(Math.PI * 0.5)
    bigwall.rotate(50)

    Composite.addMany(engine, [ground, rotatingObstacle1, bigwall])
  }

  function spawner() {
    let body = null
    const x = clamp(canvasWidth * 0.8, maxSize, canvasWidth - maxSize)
    const y = clamp(0, 100, canvasHeight - maxSize)
    const vertices = []
    const edgeCount = Math.floor(Math.random() * (16 - 3) + 3)

    for (let i = 0; i < edgeCount; i++) {
      const angle = (i * Math.PI * 2) / edgeCount

      vertices.push({
        x: x + maxSize * 0.7 * Math.cos(angle),
        y: y + maxSize * 0.7 * Math.sin(angle)
      })
    }
    const option = {
      wireframe,
      restitution
    }

    if (Math.random() - 0.5 < 0) {
      body = new Bodies.circle(x, y, maxSize * 0.5, option)
    } else {
      if (Math.random() - 0.5 < 0) {
        body = new Bodies.pill(x, y, maxSize * 0.35, maxSize, option)
      } else {
        body = new Bodies.polygon(vertices, option)
      }
    }

    Composite.add(engine, body)

    setTimeout(function () {
      spawner()
    }, 800)
  }

  // spawner();

  function renderSimulation(ctx) {
    const fontSize = 12
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    // engine.renderGrid(ctx)
    // engine.renderBounds(ctx);

    engine.world.forEach(body => body.render(ctx))

    ctx.fillStyle = 'white'
    ctx.font = 'normal 12px Arial'
    ctx.fillText(
      `${Math.round(1000 / update.deltaTime || 0)} fps`,
      fontSize,
      fontSize * 2
    )
    ctx.fillText(`${engine.world.length} bodies`, fontSize, fontSize * 3)
    ctx.fillText(`${subSteps} subSteps`, fontSize, fontSize * 4)
  }

  function update(timeStamp) {
    update.deltaTime = timeStamp - update.lastTimeStamp || 0
    update.lastTimeStamp = timeStamp
    timeAccumulator += update.deltaTime

    if (timeAccumulator > timeInterval) {
      timeAccumulator = 0

      renderSimulation(ctx)
      engine.run(update.deltaTime, ctx)
      engine.removeOffBound(0, 0, canvasWidth, canvasHeight)
    }

    requestAnimationFrame(update)
  }

  init()
  requestAnimationFrame(update)
}
