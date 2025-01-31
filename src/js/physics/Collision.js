import { Vec2 } from './Vec2.js'

export class Collision {
  static _edgesInDirection(vertices, direction) {
    const n = vertices.length
    let maxDistance = -Infinity
    let edges = null

    vertices.forEach((point, i) => {
      const distance = point.dot(direction)

      if (distance > maxDistance) {
        maxDistance = distance
        edges = [vertices[(i - 1 + n) % n], point, vertices[(i + 1) % n]]
      }
    })

    return edges
  }

  static _projectPoints(points, radius, axis) {
    let min = Infinity
    let max = -Infinity

    points.forEach(point => {
      const projection = point.dot(axis)

      min = Math.min(projection, min)
      max = Math.max(projection, max)
    })

    return { min: min - radius, max: max + radius }
  }

  static _projectPolygon(vertices, axis) {
    let min = Infinity
    let max = -Infinity

    vertices.forEach(point => {
      const projection = point.dot(axis)

      min = Math.min(projection, min)
      max = Math.max(projection, max)
    })

    return { min, max }
  }

  static _closestPointOfVertices(vertices, targetPoint) {
    let index = -1
    let minDistanceSq = Infinity

    vertices.forEach((point, i) => {
      const distanceSq = Vec2.distanceSq(point, targetPoint)

      if (distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq
        index = i
      }
    })

    return vertices[index]
  }

  static _pointInLineSegment(startPoint, endPoint, targetPoint) {
    const ab = Vec2.subtract(endPoint, startPoint)
    const ap = Vec2.subtract(targetPoint, startPoint)
    const abLengthSq = ab.magnitudeSq()
    const projection = ap.dot(ab) / abLengthSq
    const contactPoint = Vec2.add(startPoint, ab.scale(projection))

    if (projection < 0) {
      contactPoint.copy(startPoint)
    } else if (projection > 1) {
      contactPoint.copy(endPoint)
    }

    const distanceSq = Vec2.distanceSq(targetPoint, contactPoint)

    return { contactPoint, distanceSq }
  }

  // Circle To Circle
  static detectCircleToCircle(bodyA, bodyB) {
    const direction = Vec2.subtract(bodyB.position, bodyA.position)
    const distanceSq = direction.magnitudeSq()
    const radii = bodyA.radius + bodyB.radius

    if (distanceSq == 0 || distanceSq >= radii * radii) {
      return {
        collision: false,
        normal: null,
        overlapDepth: 0,
        contactPoints: null
      }
    }

    const distance = Math.sqrt(distanceSq)
    const normal = direction.scale(1 / distance)
    const overlapDepth = radii - distance

    return {
      collision: true,
      normal,
      overlapDepth,
      contactPoints: [
        Vec2.add(bodyA.position, Vec2.scale(normal, bodyA.radius))
      ],
      edgeA: true,
      edgeB: true
    }
  }

  // Circle To Polygon
  static detectCircleToRectangle(bodyA, bodyB) {
    const normal = new Vec2()
    let minOverlapDepth = Infinity

    const direction = Vec2.subtract(bodyB.position, bodyA.position)
    const edges = this._edgesInDirection(bodyB.vertices, Vec2.negate(direction))
    const closestPoint = this._closestPointOfVertices(edges, bodyA.position)
    const axes = [
      Vec2.subtract(closestPoint, bodyA.position).normalize(),
      Vec2.subtract(edges[1], edges[0]).perp().normalize(),
      Vec2.subtract(edges[2], edges[1]).perp().normalize()
    ]

    for (const axis of axes) {
      const projA = this._projectPoints([bodyA.position], bodyA.radius, axis)
      const projB = this._projectPolygon(bodyB.vertices, axis)

      if (projA.min > projB.max || projB.min > projA.max) {
        return {
          collision: false,
          normal: null,
          overlapDepth: 0,
          contactPoints: null
        }
      }

      const axisOverlapDepth = Math.min(
        projA.max - projB.min,
        projB.max - projA.min
      )

      if (axisOverlapDepth < minOverlapDepth) {
        minOverlapDepth = axisOverlapDepth
        normal.copy(axis)
      }

      if (direction.dot(normal) < 0) normal.negate()
    }

    // Supporting points
    let minDistanceSq = Infinity
    let closestContactPoint = null

    for (let i = 0; i < edges.length - 1; ++i) {
      const currPoint = edges[i]
      const nextPoint = edges[(i + 1) % edges.length]

      const { contactPoint, distanceSq } = this._pointInLineSegment(
        currPoint,
        nextPoint,
        bodyA.position
      )

      if (distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq
        closestContactPoint = contactPoint
      }
    }

    return {
      collision: true,
      normal,
      overlapDepth: minOverlapDepth,
      contactPoints: [closestContactPoint],
      edgeA: true,
      edgeB: edges
    }
  }

  // Polygon To Polygon
  static detectPolygonToPolygon(bodyA, bodyB) {
    const normal = new Vec2()
    let minOverlapDepth = Infinity
    const direction = Vec2.subtract(bodyB.position, bodyA.position)
    const edgeA = this._edgesInDirection(bodyA.vertices, direction)
    const edgeB = this._edgesInDirection(bodyB.vertices, Vec2.negate(direction))

    const axes = [
      Vec2.subtract(edgeA[1], edgeA[0]).perp().normalize(),
      Vec2.subtract(edgeA[2], edgeA[1]).perp().normalize(),
      Vec2.subtract(edgeB[1], edgeB[0]).perp().normalize(),
      Vec2.subtract(edgeB[2], edgeB[1]).perp().normalize()
    ]

    for (const axis of axes) {
      const projA = this._projectPolygon(bodyA.vertices, axis)
      const projB = this._projectPolygon(bodyB.vertices, axis)

      if (projA.min > projB.max || projB.min > projA.max) {
        return {
          collision: false,
          normal: null,
          overlapDepth: 0,
          contactPoints: null
        }
      }

      const axisOverlapDepth = Math.min(
        projA.max - projB.min,
        projB.max - projA.min
      )

      if (axisOverlapDepth < minOverlapDepth) {
        minOverlapDepth = axisOverlapDepth
        normal.copy(axis)
      }

      if (direction.dot(normal) < 0) normal.negate()
    }

    // Supporting points
    const contactPoint1 = new Vec2()
    const contactPoint2 = new Vec2()
    let contactCounts = 0
    let minDistanceSq = Infinity

    const findContactPoint = (points, vertices) => {
      points.forEach(point => {
        for (let i = 0; i < vertices.length - 1; ++i) {
          const currPoint = vertices[i]
          const nextPoint = vertices[(i + 1) % vertices.length]

          const { contactPoint, distanceSq } = this._pointInLineSegment(
            currPoint,
            nextPoint,
            point
          )

          if (Math.abs(distanceSq - minDistanceSq) <= 5e-4) {
            if (
              !contactPoint.equal(contactPoint1) &&
              !contactPoint.equal(contactPoint2)
            ) {
              minDistanceSq = distanceSq
              contactPoint2.copy(contactPoint)
              contactCounts = 2
            }
          } else if (distanceSq < minDistanceSq) {
            minDistanceSq = distanceSq
            contactPoint1.copy(contactPoint)
            contactCounts = 1
          }
        }
      })
    }

    findContactPoint(bodyA.vertices, edgeB)
    findContactPoint(bodyB.vertices, edgeA)

    const contactPoints = []

    if (contactCounts == 1) {
      contactPoints.push(contactPoint1)
    } else if (contactCounts == 2) {
      contactPoints.push(contactPoint1, contactPoint2)
    }

    const edgeDirectionA = Vec2.subtract(contactPoint1, bodyA.position)
    const edgeDirectionB = Vec2.subtract(contactPoint1, bodyB.position)

    const finalEdgeA = this._edgesInDirection(bodyA.vertices, edgeDirectionA)
    const finalEdgeB = this._edgesInDirection(bodyB.vertices, edgeDirectionB)

    return {
      collision: true,
      normal,
      overlapDepth: minOverlapDepth,
      contactPoints,
      edgeA: finalEdgeA,
      edgeB: finalEdgeB
    }
  }

  // Polygon To Pill
  static detectPolygonToPill(bodyA, bodyB) {
    const normal = new Vec2()
    let minOverlapDepth = Infinity

    const direction = Vec2.subtract(bodyB.position, bodyA.position)
    const edges = this._edgesInDirection(bodyA.vertices, direction)
    const pillSegment = Vec2.subtract(bodyB.startPoint, bodyB.endPoint)
    const closestPoint = this._closestPointOfVertices(edges, bodyB.position)
    const { contactPoint: pointInPillSegment } = this._pointInLineSegment(
      bodyB.startPoint,
      bodyB.endPoint,
      closestPoint
    )

    const axes = [
      Vec2.subtract(pointInPillSegment, closestPoint).normalize(),
      pillSegment.perp().normalize(),
      Vec2.subtract(edges[1], edges[0]).perp().normalize(),
      Vec2.subtract(edges[2], edges[1]).perp().normalize()
    ]

    for (const axis of axes) {
      const projA = this._projectPolygon(bodyA.vertices, axis)
      const projB = this._projectPoints(
        [bodyB.startPoint, bodyB.endPoint],
        bodyB.radius,
        axis
      )

      if (projA.min > projB.max || projB.min > projA.max) {
        return {
          collision: false,
          normal: null,
          overlapDepth: 0,
          contactPoints: null
        }
      }

      const axisOverlapDepth = Math.min(
        projA.max - projB.min,
        projB.max - projA.min
      )

      if (axisOverlapDepth < minOverlapDepth) {
        minOverlapDepth = axisOverlapDepth
        normal.copy(axis)
      }

      if (direction.dot(normal) < 0) normal.negate()
    }

    // Supporting points
    const contactPoint1 = new Vec2()
    const contactPoint2 = new Vec2()
    let contactCounts = 0
    let minDistanceSq = Infinity

    const findContactPoint = (points, vertices) => {
      points.forEach(point => {
        for (let i = 0; i < vertices.length - 1; ++i) {
          const currPoint = vertices[i]
          const nextPoint = vertices[(i + 1) % vertices.length]

          const { contactPoint, distanceSq } = this._pointInLineSegment(
            currPoint,
            nextPoint,
            point
          )

          if (Math.abs(distanceSq - minDistanceSq) <= 5e-4) {
            if (
              !contactPoint.equal(contactPoint1) &&
              !contactPoint.equal(contactPoint2)
            ) {
              minDistanceSq = distanceSq
              contactPoint2.copy(contactPoint)
              contactCounts = 2
            }
          } else if (distanceSq < minDistanceSq) {
            minDistanceSq = distanceSq
            contactPoint1.copy(contactPoint)
            contactCounts = 1
          }
        }
      })
    }

    findContactPoint(bodyA.vertices, [bodyB.startPoint, bodyB.endPoint])

    if (contactCounts == 1) {
      contactPoint1.add(Vec2.scale(normal, -bodyB.radius))
    } else if (contactCounts == 2) {
      contactPoint1.add(Vec2.scale(normal, -bodyB.radius))
      contactPoint2.add(Vec2.scale(normal, -bodyB.radius))
    }

    findContactPoint([bodyB.startPoint, bodyB.endPoint], edges)

    const contactPoints = []

    if (contactCounts == 1) {
      contactPoints.push(contactPoint1)
    } else if (contactCounts == 2) {
      contactPoints.push(contactPoint1, contactPoint2)
    }

    const edgeDirectionA = Vec2.subtract(contactPoint1, bodyA.position)
    const finalEdgeA = this._edgesInDirection(bodyA.vertices, edgeDirectionA)

    return {
      collision: true,
      normal,
      overlapDepth: minOverlapDepth,
      contactPoints,
      edgeA: finalEdgeA,
      edgeB: pointInPillSegment
    }
  }

  // Pill To Pill
  static detectPillToPill(bodyA, bodyB) {
    let normal = new Vec2()
    let minOverlapDepth = Infinity

    const { contactPoint: pointA } = this._pointInLineSegment(
      bodyA.startPoint,
      bodyA.endPoint,
      bodyB.position
    )
    const { contactPoint: pointB } = this._pointInLineSegment(
      bodyB.startPoint,
      bodyB.endPoint,
      bodyA.position
    )
    const direction = Vec2.subtract(pointB, pointA)

    const axes = [
      direction.normalize(),
      Vec2.subtract(bodyA.startPoint, bodyA.endPoint).perp().normalize(),
      Vec2.subtract(bodyB.startPoint, bodyB.endPoint).perp().normalize()
    ]

    for (const axis of axes) {
      const projA = this._projectPoints(
        [bodyA.startPoint, bodyA.endPoint],
        bodyA.radius,
        axis
      )
      const projB = this._projectPoints(
        [bodyB.startPoint, bodyB.endPoint],
        bodyB.radius,
        axis
      )

      if (projA.min > projB.max || projB.min > projA.max) {
        return {
          collision: false,
          normal: null,
          overlapDepth: 0,
          contactPoints: null
        }
      }

      const axisOverlapDepth = Math.min(
        projA.max - projB.min,
        projB.max - projA.min
      )

      if (axisOverlapDepth < minOverlapDepth) {
        minOverlapDepth = axisOverlapDepth
        normal.copy(axis)
      }

      if (direction.dot(normal) < 0) normal.negate()
    }

    // Supporting points
    const contactPoint1 = new Vec2()
    const contactPoint2 = new Vec2()
    let contactCounts = 0
    let minDistanceSq = Infinity

    const findContactPoint = (points, vertices, radius) => {
      points.forEach(point => {
        const currPoint = vertices[0]
        const nextPoint = vertices[1]

        const { contactPoint, distanceSq } = this._pointInLineSegment(
          currPoint,
          nextPoint,
          point
        )

        if (Math.abs(distanceSq - minDistanceSq) <= 5e-4) {
          if (
            !contactPoint.equal(contactPoint1) &&
            !contactPoint.equal(contactPoint2)
          ) {
            minDistanceSq = distanceSq
            contactPoint2.copy(contactPoint.add(Vec2.scale(normal, radius)))
            contactCounts = 2
          }
        } else if (distanceSq < minDistanceSq) {
          minDistanceSq = distanceSq
          contactPoint1.copy(contactPoint.add(Vec2.scale(normal, radius)))
          contactCounts = 1
        }
      })
    }

    const verticesA = [bodyA.startPoint, bodyA.endPoint]
    const verticesB = [bodyB.startPoint, bodyB.endPoint]

    findContactPoint(verticesA, verticesB, -bodyB.radius)
    findContactPoint(verticesB, verticesA, bodyA.radius)

    const contactPoints = []

    if (contactCounts == 1) {
      contactPoints.push(contactPoint1)
    } else if (contactCounts == 2) {
      contactPoints.push(contactPoint1, contactPoint2)
    }

    return {
      collision: true,
      normal,
      overlapDepth: minOverlapDepth,
      contactPoints,
      edgeA: pointA,
      edgeB: pointB
    }
  }

  // Circle To Pill
  static detectCircleToPill(bodyA, bodyB) {
    const { contactPoint: pointB } = this._pointInLineSegment(
      bodyB.startPoint,
      bodyB.endPoint,
      bodyA.position
    )

    const direction = Vec2.subtract(pointB, bodyA.position)
    const distanceSq = direction.magnitudeSq()
    const radii = bodyA.radius + bodyB.radius

    if (distanceSq == 0 || distanceSq >= radii * radii) {
      return {
        collision: false,
        normal: null,
        overlapDepth: 0,
        contactPoints: null
      }
    }

    const distance = Math.sqrt(distanceSq)
    const normal = direction.scale(1 / distance)
    const overlapDepth = radii - distance

    const contactPoint = Vec2.add(
      bodyA.position,
      Vec2.scale(normal, bodyA.radius)
    )

    return {
      collision: true,
      normal,
      overlapDepth,
      contactPoints: [contactPoint],
      edgeA: true,
      edgeB: pointB
    }
  }
}
