import { Vec2 } from './Vec2.js'
import { SpatialGrid } from './SpatialGrid.js'
import { Bounds } from './Bounds.js'
import { Composite } from './Composite.js'
import { Collision } from './Collision.js'
import { Resolver } from './Resolver.js'

export class Engine {
  constructor(option = {}) {
    this.world = []
    this.gravity = {
      x: 0,
      y: option.gravity || (typeof option.gravity !== 'number' && 9.81) || 0
    }

    if (!option.grid) option.grid = {}
    this.grid = new SpatialGrid(
      option.grid.x || 0,
      option.grid.y || 0,
      option.grid.width || innerWidth,
      option.grid.height || innerHeight,
      option.grid.scale || 40
    )
    this.subSteps = option.subSteps || 4
    this.wireframe =
      option.wireframe == undefined
        ? true
        : typeof option.wireframe != 'boolean'
        ? true
        : option.wireframe
  }

  renderGrid(ctx) {
    this.grid.render(ctx)
  }

  renderBounds(ctx) {
    ctx.strokeStyle = '#e08728'
    this.world.forEach(body => {
      const { min, width, height } = Bounds.getBound(body)

      ctx.strokeRect(min.x, min.y, width, height)
    })
  }

  removeOffBound(boundX, boundY, boundW, boundH) {
    this.world.forEach(body => {
      const { min, max, width, height } = body.getBound()

      if (
        min.x < boundX - width ||
        min.y < boundY - height ||
        max.x > boundW + width ||
        max.y > boundH + height
      ) {
        Composite.remove(this, body)
      }
    })
  }

  run(deltaTime = 1000 / 60, ctx = null) {
    deltaTime /= this.subSteps

    for (let subStep = 1; subStep <= this.subSteps; ++subStep) {
      for (let i = 0; i < this.world.length; ++i) {
        const bodyA = this.world[i]
        let boundA = bodyA.getBound()
        const acceleration = Vec2.scale(this.gravity, bodyA.inverseMass)

        bodyA.velocity.add(acceleration, deltaTime)
        bodyA.position.add(bodyA.velocity, deltaTime)
        bodyA.updateVertices()

        if (bodyA.rotation) bodyA.rotate(bodyA.angularVelocity * deltaTime)

        if (subStep == this.subSteps) {
          this.grid.updateData(bodyA)

          if (
            boundA.min.x < this.grid.bounds[0][0] - boundA.width ||
            boundA.min.y < this.grid.bounds[0][1] - boundA.height ||
            boundA.max.x > this.grid.bounds[1][0] + boundA.width ||
            boundA.max.y > this.grid.bounds[1][1] + boundA.height
          ) {
            this.grid.removeData(bodyA)
          }
        }

        const nearby = this.grid.queryNearby(bodyA)

        for (const bodyB of nearby) {
          boundA = bodyA.getBound()
          const boundB = bodyB.getBound()

          if (!Bounds.overlaps(boundA, boundB)) {
            continue
          } else {
            const manifold = this._detectCollision(bodyA, bodyB)

            if (manifold) {
              if (subStep == 1 && ctx) {
                const color = this.wireframe ? 'orange' : '#ffffffc0'

                ctx.strokeStyle = color
                if (bodyA.label == 'rectangle' || bodyA.label == 'polygon') {
                  this._drawEdge(ctx, manifold.edgeA)
                } else if (bodyA.label == 'circle') {
                  this._drawArcEdge(ctx, bodyA, manifold.contactPoints[0])
                } else if (bodyA.label == 'pill') {
                  this._drawPillEdge(
                    ctx,
                    bodyA,
                    manifold.edgeA,
                    manifold.contactPoints[0]
                  )
                }

                if (bodyB.label == 'rectangle' || bodyB.label == 'polygon') {
                  this._drawEdge(ctx, manifold.edgeB)
                } else if (bodyB.label == 'circle') {
                  this._drawArcEdge(ctx, bodyB, manifold.contactPoints[0])
                } else if (bodyB.label == 'pill') {
                  this._drawPillEdge(
                    ctx,
                    bodyB,
                    manifold.edgeB,
                    manifold.contactPoints[0]
                  )
                }

                this._drawAxis(ctx, bodyA, manifold.normal, color)
                this._drawAxis(ctx, bodyB, manifold.normal, color)
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

  _drawContacts(ctx, contactPoints, color) {
    const radius = 2

    for (const point of contactPoints) {
      ctx.beginPath()
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
    }
    if (this.wireframe) {
      ctx.fillStyle = color
      ctx.fill()
    } else {
      ctx.fillStyle = 'red'
      ctx.fill()
      ctx.strokeStyle = color
      ctx.stroke()
    }
  }

  _drawAxis(ctx, body, axis, color) {
    const length =
      body.width < body.height
        ? body.width * 0.25
        : body.height < body.width
        ? body.height * 0.25
        : body.radius
        ? body.radius * 0.5
        : 10
    const end = Vec2.add(body.position, Vec2.scale(axis, length))

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

      if (cross > 0) {
        edge = [body.vertices[1], body.vertices[2]]
      } else {
        edge = [body.vertices[0], body.vertices[3]]
      }

      ctx.beginPath()
      ctx.moveTo(edge[0].x, edge[0].y)
      ctx.lineTo(edge[1].x, edge[1].y)
      ctx.stroke()

      return null
    }

    if (
      Vec2.distanceSq(contactPoint, body.startPoint) <
      Vec2.distanceSq(contactPoint, body.endPoint)
    ) {
      const startDirP1 = Vec2.subtract(body.vertices[0], body.startPoint)
      const endDirP1 = Vec2.subtract(body.vertices[1], body.startPoint)
      const startAngleP1 = Math.atan2(startDirP1.y, startDirP1.x)
      const endAngleP1 = Math.atan2(endDirP1.y, endDirP1.x)

      // const direction = Vec2.subtract(contactPoint, body.startPoint);
      // const angle = Math.atan2(direction.y, direction.x);

      ctx.beginPath()
      ctx.arc(
        body.startPoint.x,
        body.startPoint.y,
        body.radius,
        startAngleP1,
        endAngleP1
        // Math.max(angle - Math.PI * 0.25, startAngleP1),
        // Math.min(angle + Math.PI * 0.25, endAngleP1)
      )
      ctx.stroke()
    } else {
      const startDirP2 = Vec2.subtract(body.vertices[2], body.endPoint)
      const endDirP2 = Vec2.subtract(body.vertices[3], body.endPoint)
      const startAngleP2 = Math.atan2(startDirP2.y, startDirP2.x)
      const endAngleP2 = Math.atan2(endDirP2.y, endDirP2.x)

      // const direction = Vec2.subtract(contactPoint, body.endPoint);
      // const angle = Math.atan2(direction.y, direction.x);

      ctx.beginPath()
      ctx.arc(
        body.endPoint.x,
        body.endPoint.y,
        body.radius,
        startAngleP2,
        endAngleP2
        // Math.max(angle - Math.PI * 0.25, startAngleP2),
        // Math.min(angle + Math.PI * 0.25, endAngleP2)
      )
      ctx.stroke()
    }
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
