import { Vec2 } from './Vec2.js'
import { SpatialGrid } from './SpatialGrid.js'
import { Bnd2 } from './Bnd2.js'
import { Composite } from './Composite.js'
import { Collision } from './Collision.js'
import { Resolver } from './Resolver.js'

export class Engine {
  constructor(option = {}) {
    this.world = []

    if (option.gravity && typeof option.gravity != 'number') {
      option.gravity = 9.81
      console.warn(`Engine's gravity must be of type 'number'`)
    } else if (option.gravity == undefined) option.gravity = 9.81

    this.gravity = {
      x: 0,
      y: option.gravity
    }

    option.boundary = option.boundary == undefined ? {} : option.boundary

    if (option.boundary && typeof option.boundary != 'object') {
      console.warn(
        `
          Engine.grid must be of type object!
          { 
            x: Number, // Default 0
            y: Number, // Default 0
            width: Number, // Default innerWidth
            height: Number, // Default innerHeight
            scale: Number, // Default 40
          }
        `
      )
      option.boundary = {}
    }

    this.grid = new SpatialGrid(
      option.boundary.x || 0,
      option.boundary.y || 0,
      option.boundary.width || innerWidth,
      option.boundary.height || innerHeight,
      option.boundary.scale || 40
    )
    this.wireframe =
      option.wireframe == undefined
        ? true
        : option.wireframe && typeof option.wireframe != 'boolean'
        ? true
        : option.wireframe
    this.subSteps =
      option.subSteps == undefined
        ? 4
        : option.subSteps && typeof option.subSteps != 'number'
        ? 4
        : option.subSteps
    this.removeOffBound =
      option.removeOffBound == undefined
        ? false
        : option.removeOffBound && typeof option.removeOffBound != 'boolean'
        ? false
        : option.removeOffBound
  }

  renderGrid(ctx) {
    this.grid.render(ctx)
  }

  renderBounds(ctx) {
    ctx.strokeStyle = '#e08728'
    this.world.forEach(body => {
      const { min, width, height } = Bnd2.getBound(body)

      ctx.strokeRect(min.x, min.y, width, height)
    })
  }

  removeOffBound(body, boundX, boundY, boundW, boundH) {
    const { min, max, width, height } = Bnd2.getBound(body)

    if (
      min.x < boundX - width ||
      min.y < boundY - height ||
      max.x > boundW + width ||
      max.y > boundH + height
    )
      Composite.remove(this, body)
  }

  run(deltaTime = 1000 / 60, ctx = null) {
    deltaTime /= this.subSteps

    for (let subStep = 1; subStep <= this.subSteps; ++subStep) {
      for (let i = 0; i < this.world.length; ++i) {
        const bodyA = this.world[i]
        let boundA = Bnd2.getBound(bodyA)
        const acceleration = Vec2.scale(this.gravity, bodyA.inverseMass)

        bodyA.velocity.add(acceleration, deltaTime)
        bodyA.position.add(bodyA.velocity, deltaTime)
        bodyA.updateVertices()

        if (bodyA.rotation) bodyA.rotate(bodyA.angularVelocity * deltaTime)

        if (subStep == 1) {
          const color = this.wireframe ? '#fdaa4a' : '#ffffffc0'
          ctx && this._drawVelocity(ctx, bodyA, color)
          this.grid.updateData(bodyA)

          if (
            boundA.min.x < this.grid.bound[0] - boundA.width ||
            boundA.min.y < this.grid.bound[1] - boundA.height ||
            boundA.max.x > this.grid.bound[2] + boundA.width ||
            boundA.max.y > this.grid.bound[3] + boundA.height
          ) {
            this.grid.removeData(bodyA)

            if (this.removeOffBound) {
              const last = this.world.length - 1

              this.world[i] = this.world[last]
              this.world[last] = bodyA
              this.world.pop()

              continue
            }
          }
        }

        const nearby = this.grid.queryNearby(bodyA)

        for (const bodyB of nearby) {
          boundA = Bnd2.getBound(bodyA)
          const boundB = Bnd2.getBound(bodyB)

          if (!Bnd2.overlaps(boundA, boundB)) continue
          else {
            const manifold = this._detectCollision(bodyA, bodyB)

            if (manifold) {
              if (subStep == 1 && ctx) {
                const color = this.wireframe ? '#eb3f3f' : '#ffffffc0'

                ctx.strokeStyle = color
                switch (bodyA.label) {
                  case 'rectangle':
                  case 'polygon':
                    this._drawEdge(ctx, manifold.edgeA)
                    break

                  case 'circle':
                    this._drawArcEdge(ctx, bodyA, manifold.contactPoints[0])
                    break

                  case 'pill':
                    this._drawPillEdge(
                      ctx,
                      bodyA,
                      manifold.edgeA,
                      manifold.contactPoints[0]
                    )
                    break
                }

                this._drawContacts(ctx, manifold.contactPoints, color)
              }

              Resolver.resolveCollision(
                bodyA,
                bodyB,
                manifold.normal,
                manifold.overlapDepth,
                manifold.contactPoints
              )
            }
          }
        }
      }
    }
  }

  _drawContacts(ctx, contactPoints, color) {
    const radius = 2

    for (const point of contactPoints) {
      ctx.beginPath()
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
    }

    if (this.wireframe) {
      ctx.fillStyle = '#eb3f3f'
      ctx.fill()
    } else {
      ctx.fillStyle = 'red'
      ctx.fill()
      ctx.strokeStyle = color
      ctx.stroke()
    }
  }

  _drawVelocity(ctx, body, color) {
    const length = 100
    const end = Vec2.add(body.position, Vec2.scale(body.velocity, length))

    ctx.beginPath()
    ctx.moveTo(body.position.x, body.position.y)
    ctx.lineTo(end.x, end.y)

    ctx.strokeStyle = color
    ctx.stroke()
  }

  _drawEdge(ctx, edge) {
    ctx.beginPath()
    ctx.moveTo(edge[0].x, edge[0].y)
    for (let i = 1; i < edge.length; ++i) {
      ctx.lineTo(edge[i].x, edge[i].y)
    }
    ctx.stroke()
  }

  _drawArcEdge(ctx, body, contactPoint) {
    const direction = Vec2.subtract(contactPoint, body.position)
    const angle = Math.atan2(direction.y, direction.x)

    ctx.beginPath()
    ctx.arc(
      body.position.x,
      body.position.y,
      body.radius,
      angle - Math.PI * 0.25,
      angle + Math.PI * 0.25
    )
    ctx.stroke()
  }

  _drawPillEdge(ctx, body, bodyPoint, contactPoint) {
    if (!bodyPoint.equal(body.startPoint) && !bodyPoint.equal(body.endPoint)) {
      const toEnd = Vec2.subtract(body.endPoint, body.startPoint)
      const toContact = Vec2.subtract(contactPoint, body.startPoint)
      const cross = toContact.cross(toEnd)
      let edge = null

      cross > 0
        ? (edge = [body.vertices[1], body.vertices[2]])
        : (edge = [body.vertices[0], body.vertices[3]])

      ctx.beginPath()
      ctx.moveTo(edge[0].x, edge[0].y)
      ctx.lineTo(edge[1].x, edge[1].y)
      ctx.stroke()

      return null
    }

    const startDir = Vec2.subtract(body.vertices[0], body.startPoint)
    const endDir = Vec2.subtract(body.vertices[1], body.startPoint)
    const startAngle = Math.atan2(startDir.y, startDir.x)
    const endAngle = Math.atan2(endDir.y, endDir.x)

    ctx.beginPath()
    if (
      Vec2.distanceSq(contactPoint, body.startPoint) <
      Vec2.distanceSq(contactPoint, body.endPoint)
    )
      ctx.arc(
        body.startPoint.x,
        body.startPoint.y,
        body.radius,
        startAngle,
        endAngle
      )
    else
      ctx.arc(
        body.endPoint.x,
        body.endPoint.y,
        body.radius,
        endAngle,
        startAngle
      )
    ctx.stroke()
  }

  _getCollisionType(labelA, labelB) {
    if (labelA == 'circle' && labelB == 'circle') return 'circle-circle'

    if (labelA == 'circle' && (labelB == 'rectangle' || labelB == 'polygon'))
      return 'circle-rectangle-polygon'

    if (
      (labelA == 'rectangle' || labelA == 'polygon') &&
      (labelB == 'rectangle' || labelB == 'polygon')
    )
      return 'rectangle-polygon'

    if ((labelA == 'rectangle' || labelA == 'polygon') && labelB == 'pill')
      return 'polygon-pill'

    if (labelA == 'circle' && labelB == 'pill') return 'circle-pill'

    if (labelA == 'pill' && labelB == 'pill') return 'pill-pill'

    return 'unknown'
  }

  _detectCollision(bodyA, bodyB) {
    let manifold = null
    const collisionType = this._getCollisionType(bodyA.label, bodyB.label)

    switch (collisionType) {
      case 'circle-circle': {
        const { collision, normal, overlapDepth, contactPoints, edgeA, edgeB } =
          Collision.detectCircleToCircle(bodyA, bodyB)
        if (collision)
          manifold = { normal, overlapDepth, contactPoints, edgeA, edgeB }
        break
      }

      case 'circle-rectangle-polygon': {
        const { collision, normal, overlapDepth, contactPoints, edgeA, edgeB } =
          Collision.detectCircleToRectangle(bodyA, bodyB)
        if (collision)
          manifold = { normal, overlapDepth, contactPoints, edgeA, edgeB }
        break
      }

      case 'rectangle-polygon': {
        const { collision, normal, overlapDepth, contactPoints, edgeA, edgeB } =
          Collision.detectPolygonToPolygon(bodyA, bodyB)
        if (collision)
          manifold = { normal, overlapDepth, contactPoints, edgeA, edgeB }
        break
      }

      case 'polygon-pill': {
        const { collision, normal, overlapDepth, contactPoints, edgeA, edgeB } =
          Collision.detectPolygonToPill(bodyA, bodyB)
        if (collision)
          manifold = { normal, overlapDepth, contactPoints, edgeA, edgeB }
        break
      }

      case 'circle-pill': {
        const { collision, normal, overlapDepth, contactPoints, edgeA, edgeB } =
          Collision.detectCircleToPill(bodyA, bodyB)
        if (collision)
          manifold = { normal, overlapDepth, contactPoints, edgeA, edgeB }
        break
      }

      case 'pill-pill': {
        const { collision, normal, overlapDepth, contactPoints, edgeA, edgeB } =
          Collision.detectPillToPill(bodyA, bodyB)
        if (collision)
          manifold = { normal, overlapDepth, contactPoints, edgeA, edgeB }
        break
      }
    }

    return manifold
  }
}
