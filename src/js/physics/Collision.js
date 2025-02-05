import { Vec2 } from './Vec2.js'

export class Collision {
  /**
   * Given a non closing `edges`,
   * the method will take the point found in each edge
   * closest to the `targetPoint`.
   * @method _getClosestContactPointInEdges
   * @param {Array []} edges
   * @param {Vec2} targetPoint
   */
  static _getClosestContactPointInEdges(edges, targetPoint) {
    let minDistanceSq = Infinity
    const closestPoint = new Vec2()
    const n = edges.length

    for (let i = 0; i < n - 1; ++i) {
      const currPoint = edges[i]
      const nextPoint = edges[(i + 1) % n]

      const { contactPoint, distanceSq } = this._getPointInLineSegment(
        currPoint,
        nextPoint,
        targetPoint
      )

      if (distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq
        closestPoint.copy(contactPoint)
      }
    }

    return closestPoint
  }

  /**
   * The method will find the farthest point from a set of `vertices`
   * to a given `direction` then saves it along with it's previous and next
   * point as the found edges in that direction.
   * @method _getVerticesEdgesInDirection
   * @param {Array []} vertices
   * @param {Vec2} direction
   */
  static _getVerticesEdgesInDirection(vertices, direction) {
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

  /**
   * The method is use to project a point with a given `radius`.
   * Usefull for bodies like circles or capsules (pill - swept circle).
   * @method _projectPointsWithRadius
   * @param {Array []} points
   * @param {Number} radius
   * @param {Vec2} axis
   */
  static _projectPointsWithRadius(points, radius, axis) {
    let min = Infinity
    let max = -Infinity

    points.forEach(point => {
      const projection = point.dot(axis)

      min = Math.min(projection, min)
      max = Math.max(projection, max)
    })

    return { min: min - radius, max: max + radius }
  }

  /**
   * The method projects a set of `vertices` (points) into a given `axis`
   * to find the min and max projection.
   * @method _projectVertices
   * @param {Array []} vertices
   * @param {Vec2} axis
   */
  static _projectVertices(vertices, axis) {
    let min = Infinity
    let max = -Infinity

    vertices.forEach(point => {
      const projection = point.dot(axis)

      if (projection < min) min = projection
      if (projection > max) max = projection
    })

    return { min, max }
  }

  /**
   * Finds the closest point of `vertices` to the `targetPoint`.
   * @method _getVerticesClosestPoint
   * @param {Array []} vertices
   * @param {Vec2} targetPoint
   */
  static _getVerticesClosestPoint(vertices, targetPoint) {
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

  /**
   * The method will take the point found in the line `startPoint` and `endPoint`
   * closest to the `targetPoint`.
   * @method _getPointInLineSegment
   * @param {Vec2} startPoint
   * @param {Vec2} endPoint
   * @param {Vec2} targetPoint
   */
  static _getPointInLineSegment(startPoint, endPoint, targetPoint) {
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

  /**
   * Perform the collision detection between two circles.
   * @method detectCircleToCircle 'Better'
   * @param {Circle Body} bodyA
   * @param {Circle Body} bodyB
   */
  static detectCircleToCircle(bodyA, bodyB) {
    const direction = Vec2.subtract(bodyB.position, bodyA.position)
    const distanceSq = direction.magnitudeSq()
    const radii = bodyA.radius + bodyB.radius

    if (distanceSq == 0 || distanceSq > radii * radii)
      return { collision: null }

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
      edgeA: true, // This is use to visualize the contact edge. See Engine._drawArcEdge
      edgeB: true // This is use to visualize the contact edge. See Engine._drawArcEdge
    }
  }

  /**
   * Perform the collision detection between a circle and a rectangle (polygon).
   * @method detectCircleToRectangle 'Fine'
   * @param {Circle Body} bodyA
   * @param {(Polygon || Rectangle) Body} bodyB
   */
  static detectCircleToRectangle(bodyA, bodyB) {
    const normal = new Vec2()
    let overlapDepth = Infinity
    const direction = Vec2.subtract(bodyB.position, bodyA.position)
    const edges = this._getVerticesEdgesInDirection(
      bodyB.vertices,
      Vec2.negate(direction)
    )
    const closestPoint = this._getVerticesClosestPoint(edges, bodyA.position)
    const axes = [
      Vec2.subtract(closestPoint, bodyA.position),
      Vec2.subtract(edges[1], edges[0]).perp(),
      Vec2.subtract(edges[2], edges[1]).perp()
    ]

    for (const axis of axes) {
      axis.normalize()

      const projA = this._projectPointsWithRadius(
        [bodyA.position],
        bodyA.radius,
        axis
      )
      const projB = this._projectVertices(bodyB.vertices, axis)

      if (projA.min > projB.max || projB.min > projA.max)
        return { collision: null }

      const axisOverlapDepth = Math.min(
        projA.max - projB.min,
        projB.max - projA.min
      )

      if (axisOverlapDepth < overlapDepth) {
        overlapDepth = axisOverlapDepth
        normal.copy(axis)
      }

      if (direction.dot(normal) < 0) normal.negate()
    }

    // Supporting points
    let minDistanceSq = Infinity
    const minContactPoint = new Vec2()
    const n = edges.length

    for (let i = 0; i < n - 1; ++i) {
      const currPoint = edges[i]
      const nextPoint = edges[(i + 1) % n]

      const { contactPoint, distanceSq } = this._getPointInLineSegment(
        currPoint,
        nextPoint,
        bodyA.position
      )

      if (distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq
        minContactPoint.copy(contactPoint)
      }
    }

    return {
      collision: true,
      normal,
      overlapDepth,
      contactPoints: [minContactPoint],
      edgeA: true, // This is use to visualize the contact edge. See Engine._drawArcEdge
      edgeB: edges // This is use to visualize the contact edge. See Engine._drawEdge
    }
  }

  /**
   * Perform the collision detection between two polygons.
   * @method detectPolygonToPolygon 'Fine'
   * @param {(Polygon || Rectangle) Body} bodyA
   * @param {(Polygon || Rectangle) Body} bodyB
   */
  static detectPolygonToPolygon(bodyA, bodyB) {
    const normal = new Vec2()
    let overlapDepth = Infinity
    const direction = Vec2.subtract(bodyB.position, bodyA.position)
    let edgeA = this._getVerticesEdgesInDirection(bodyA.vertices, direction)
    let edgeB = this._getVerticesEdgesInDirection(
      bodyB.vertices,
      Vec2.negate(direction)
    )

    const closestContactToA = this._getClosestContactPointInEdges(
      edgeB,
      bodyA.position
    )
    const closestContactToB = this._getClosestContactPointInEdges(
      edgeA,
      bodyB.position
    )

    const directionA = Vec2.subtract(closestContactToA, bodyA.position)
    const directionB = Vec2.subtract(closestContactToB, bodyB.position)

    edgeA = this._getVerticesEdgesInDirection(bodyA.vertices, directionA)
    edgeB = this._getVerticesEdgesInDirection(bodyB.vertices, directionB)

    const axes = [
      Vec2.subtract(edgeA[1], edgeA[0]).perp(),
      Vec2.subtract(edgeA[2], edgeA[1]).perp(),
      Vec2.subtract(edgeB[1], edgeB[0]).perp(),
      Vec2.subtract(edgeB[2], edgeB[1]).perp()
    ]

    for (const axis of axes) {
      axis.normalize()

      const projA = this._projectVertices(bodyA.vertices, axis)
      const projB = this._projectVertices(bodyB.vertices, axis)

      if (projA.min > projB.max || projB.min > projA.max)
        return { collision: null }

      const axisOverlapDepth = Math.min(
        projA.max - projB.min,
        projB.max - projA.min
      )

      if (axisOverlapDepth < overlapDepth) {
        overlapDepth = axisOverlapDepth
        normal.copy(axis)
      }

      if (direction.dot(normal) < 0) normal.negate()
    }

    // Supporting points
    const contactPoints = []
    const contactPoint1 = new Vec2()
    const contactPoint2 = new Vec2()
    let contactCounts = 0
    let minDistanceSq = Infinity

    function _scanPointsOfContact(points, vertices) {
      let n = vertices.length

      points.forEach(point => {
        for (let i = 0; i < n - 1; ++i) {
          const currPoint = vertices[i]
          const nextPoint = vertices[i + 1]

          const { contactPoint, distanceSq } = Collision._getPointInLineSegment(
            currPoint,
            nextPoint,
            point
          )

          if (Math.abs(distanceSq - minDistanceSq) <= 5e-4) {
            if (!contactPoint.equal(contactPoint1)) {
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

    _scanPointsOfContact(edgeA, edgeB)
    _scanPointsOfContact(edgeB, edgeA)

    if (contactCounts == 1) {
      contactPoints.push(contactPoint1)
    } else if (contactCounts == 2) {
      contactPoints.push(contactPoint1, contactPoint2)
    }

    return {
      collision: true,
      normal,
      overlapDepth,
      contactPoints,
      edgeA: edgeA, // This is use to visualize the contact edge. See Engine._drawEdge
      edgeB: edgeB // This is use to visualize the contact edge. See Engine._drawEdge
    }
  }

  /**
   * Perform the collision detection between a rectangle (polygon)
   * and a capsule (pill - swept circle).
   * @method detectPolygonToPill 'Fine'
   * @param {(Polygon || Rectangle) Body} bodyA
   * @param {Pill Body} bodyB
   */
  static detectPolygonToPill(bodyA, bodyB) {
    const normal = new Vec2()
    let overlapDepth = Infinity
    const direction = Vec2.subtract(bodyB.position, bodyA.position)
    let edgeA = this._getVerticesEdgesInDirection(bodyA.vertices, direction)
    let edgeB = [bodyB.startPoint, bodyB.endPoint]

    const closestContactToA = this._getClosestContactPointInEdges(
      edgeB,
      bodyA.position
    )
    const newDirectionA = Vec2.subtract(closestContactToA, bodyA.position)

    edgeA = this._getVerticesEdgesInDirection(bodyA.vertices, newDirectionA)

    const closestPointOfA = this._getVerticesClosestPoint(
      bodyA.vertices,
      bodyB.position
    )
    const { contactPoint: contactPointInB } = this._getPointInLineSegment(
      edgeB[0],
      edgeB[1],
      closestPointOfA
    )

    const axes = [
      Vec2.subtract(contactPointInB, closestPointOfA),
      Vec2.subtract(edgeB[1], edgeB[0]).perp(),
      Vec2.subtract(edgeA[1], edgeA[0]).perp(),
      Vec2.subtract(edgeA[2], edgeA[1]).perp()
    ]

    for (const axis of axes) {
      axis.normalize()

      const projA = this._projectVertices(bodyA.vertices, axis)
      const projB = this._projectPointsWithRadius(
        [bodyB.startPoint, bodyB.endPoint],
        bodyB.radius,
        axis
      )

      if (projA.min > projB.max || projB.min > projA.max)
        return { collision: null }

      const axisOverlapDepth = Math.min(
        projA.max - projB.min,
        projB.max - projA.min
      )

      if (axisOverlapDepth < overlapDepth) {
        overlapDepth = axisOverlapDepth
        normal.copy(axis)
      }

      if (direction.dot(normal) < 0) normal.negate()
    }

    // Supporting points
    const contactPoints = []
    const contactPoint1 = new Vec2()
    const contactPoint2 = new Vec2()
    let contactCounts = 0
    let minDistanceSq = Infinity

    function _scanPointsOfContact(points, vertices) {
      const n = vertices.length

      points.forEach(point => {
        for (let i = 0; i < n - 1; ++i) {
          const currPoint = vertices[i]
          const nextPoint = vertices[(i + 1) % n]

          const { contactPoint, distanceSq } = Collision._getPointInLineSegment(
            currPoint,
            nextPoint,
            point
          )

          if (Math.abs(distanceSq - minDistanceSq) <= 5e-4) {
            if (!contactPoint.equal(contactPoint1)) {
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

    _scanPointsOfContact(edgeA, edgeB)

    if (contactCounts == 1) {
      contactPoint1.add(Vec2.scale(normal, -bodyB.radius))
    } else if (contactCounts == 2) {
      contactPoint1.add(Vec2.scale(normal, -bodyB.radius))
      contactPoint2.add(Vec2.scale(normal, -bodyB.radius))
    }

    _scanPointsOfContact(edgeB, edgeA)

    if (contactCounts == 1) {
      contactPoints.push(contactPoint1)
    } else if (contactCounts == 2) {
      contactPoints.push(contactPoint1, contactPoint2)
    }

    return {
      collision: true,
      normal,
      overlapDepth,
      contactPoints,
      edgeA: edgeA, // This is use to visualize the contact edge. See Engine._drawEdge
      edgeB: contactPointInB // This is use to visualize the contact edge. See Engine._drawPillEdge
    }
  }

  /**
   * Perform the collision detection between two capsules (pills - swept circles)
   * @method detectPillToPill Debug: finding contactPoints is not properly implemented.
   * @param {Pill Body} bodyA
   * @param {Pill Body} bodyB
   */
  static detectPillToPill(bodyA, bodyB) {
    const normal = new Vec2()
    let overlapDepth = Infinity
    const edgeA = [bodyA.startPoint, bodyA.endPoint]
    const edgeB = [bodyB.startPoint, bodyB.endPoint]

    const { contactPoint: contactPointInA } = this._getPointInLineSegment(
      edgeA[0],
      edgeA[1],
      bodyB.position
    )
    const { contactPoint: contactPointInB } = this._getPointInLineSegment(
      edgeB[0],
      edgeB[1],
      bodyA.position
    )

    const direction = Vec2.subtract(contactPointInB, contactPointInA)
    const axes = [
      direction,
      Vec2.subtract(edgeA[1], edgeA[0]).perp(),
      Vec2.subtract(edgeB[1], edgeB[0]).perp()
    ]

    for (const axis of axes) {
      axis.normalize()

      const projA = this._projectPointsWithRadius(edgeA, bodyA.radius, axis)
      const projB = this._projectPointsWithRadius(edgeB, bodyB.radius, axis)

      if (projA.min > projB.max || projB.min > projA.max)
        return { collision: null }

      const axisOverlapDepth = Math.min(
        projA.max - projB.min,
        projB.max - projA.min
      )

      if (axisOverlapDepth < overlapDepth) {
        overlapDepth = axisOverlapDepth
        normal.copy(axis)
      }

      if (direction.dot(normal) < 0) normal.negate()
    }

    // Supporting points
    const contactPoints = []
    const contactPoint1 = new Vec2()
    const contactPoint2 = new Vec2()
    let contactCounts = 0
    let minDistanceSq = Infinity

    function _scanPointsOfContact(points, edge, radius) {
      points.forEach(point => {
        const currPoint = edge[0]
        const nextPoint = edge[1]

        const { contactPoint, distanceSq } = Collision._getPointInLineSegment(
          currPoint,
          nextPoint,
          point
        )

        if (Math.abs(distanceSq - minDistanceSq) < 5e-4) {
          if (!contactPoint.equal(contactPoint1)) {
            contactPoint2.copy(contactPoint.add(normal, radius))
            contactCounts = 2
          }
        } else if (distanceSq < minDistanceSq) {
          minDistanceSq = distanceSq
          contactPoint1.copy(contactPoint.add(normal, radius))
          contactCounts = 1
        }
      })
    }

    _scanPointsOfContact(edgeA, edgeB, -bodyB.radius)
    _scanPointsOfContact(edgeB, edgeA, bodyA.radius)

    if (contactCounts == 1) {
      contactPoints.push(contactPoint1)
    } else if (contactCounts == 2) {
      contactPoints.push(contactPoint1, contactPoint2)
    }

    return {
      collision: true,
      normal,
      overlapDepth,
      contactPoints,
      edgeA: contactPointInA, // This is use to visualize the contact edge. See Engine._drawPillEdge
      edgeB: contactPointInB // This is use to visualize the contact edge. See Engine._drawPillEdge
    }
  }

  /**
   * Perform the collision detection between a circle
   * and a capsule (pill - swept circle).
   * @method detectCircleToPill 'Fine'
   * @param {Circle Body} bodyA
   * @param {Pill Body} bodyB
   */
  static detectCircleToPill(bodyA, bodyB) {
    const edgeB = [bodyB.startPoint, bodyB.endPoint]
    const { contactPoint: contactPointInB } = this._getPointInLineSegment(
      edgeB[0],
      edgeB[1],
      bodyA.position
    )

    const direction = Vec2.subtract(contactPointInB, bodyA.position)
    const distanceSq = direction.magnitudeSq()
    const radii = bodyA.radius + bodyB.radius

    if (distanceSq == 0 || distanceSq > radii * radii)
      return { collision: null }

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
      edgeA: true, // This is use to visualize the contact edge. See Engine._drawArcEdge
      edgeB: contactPointInB // This is use to visualize the contact edge. See Engine._drawPillEdge
    }
  }
}
