import { Vec2 } from './Vec2.js';

export class Collision {
  static _getClosestContactPointInEdges(edges, targetPoint) {
    let minDistanceSq = Infinity;
    const closestPoint = new Vec2();
    const n = edges.length;

    for (let i = 0; i < n - 1; ++i) {
      const currPoint = edges[i];
      const nextPoint = edges[i + 1];
      const { contactPoint, distanceSq } = this._getPointInLineSegment(
        currPoint,
        nextPoint,
        targetPoint
      );

      if (distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq;
        closestPoint.copy(contactPoint);
      }
    }

    return closestPoint;
  }

  static _getVerticesEdgesInDirection(vertices, direction) {
    const n = vertices.length;
    let maxDistance = -Infinity;
    let maxIndex = -1;

    for (let i = 0; i < n; ++i) {
      const distance = vertices[i].dot(direction);

      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    return [
      vertices[(maxIndex - 1 + n) % n],
      vertices[maxIndex],
      vertices[(maxIndex + 1) % n]
    ];
  }

  static _projectPointsWithRadius(points, radius, axis) {
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < points.length; ++i) {
      const projection = points[i].dot(axis);

      if (projection < min) min = projection;
      if (projection > max) max = projection;
    }

    return { min: min - radius, max: max + radius };
  }

  static _projectVertices(vertices, axis) {
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < vertices.length; ++i) {
      const projection = vertices[i].dot(axis);

      if (projection < min) min = projection;
      if (projection > max) max = projection;
    }

    return { min, max };
  }

  static _getVerticesClosestPoint(vertices, targetPoint) {
    let minDistanceSq = Infinity;
    let minIndex = -1;

    for (let i = 0; i < vertices.length; ++i) {
      const distanceSq = Vec2.distanceSq(vertices[i], targetPoint);

      if (distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq;
        minIndex = i;
      }
    }

    return vertices[minIndex];
  }

  static _getPointInLineSegment(startPoint, endPoint, targetPoint) {
    const ab = Vec2.subtract(endPoint, startPoint);
    const ap = Vec2.subtract(targetPoint, startPoint);
    const abLengthSq = ab.magnitudeSq();
    const projection = ap.dot(ab) / abLengthSq;
    const contactPoint = ab.scale(projection).add(startPoint);

    if (projection < 0) {
      contactPoint.copy(startPoint);
    } else if (projection > 1) {
      contactPoint.copy(endPoint);
    }

    const distanceSq = Vec2.distanceSq(targetPoint, contactPoint);

    return { contactPoint, distanceSq };
  }

  static detectCircleToCircle(bodyA, bodyB) {
    const direction = Vec2.subtract(bodyB.position, bodyA.position);
    const distanceSq = direction.magnitudeSq();
    const radii = bodyA.radius + bodyB.radius;

    if (distanceSq == 0 || distanceSq > radii ** 2) return { collision: null };

    const distance = Math.sqrt(distanceSq);
    const normal = direction.scale(1 / distance);
    const overlapDepth = radii - distance;
    const contactPoint = Vec2.scale(normal, bodyA.radius).add(bodyA.position);

    bodyA.contactPoints.push(contactPoint);

    return {
      collision: true,
      normal,
      overlapDepth,
      contactPoints: [contactPoint]
    };
  }

  static detectCircleToRectangle(bodyA, bodyB) {
    const normal = new Vec2();
    let overlapDepth = Infinity;
    const direction = Vec2.subtract(bodyB.position, bodyA.position);
    const edges = this._getVerticesEdgesInDirection(
      bodyB.vertices,
      Vec2.negate(direction)
    );
    const closestPoint = this._getVerticesClosestPoint(edges, bodyA.position);
    const axes = [
      Vec2.subtract(closestPoint, bodyA.position),
      Vec2.subtract(edges[1], edges[0]).perp(),
      Vec2.subtract(edges[2], edges[1]).perp()
    ];

    for (const axis of axes) {
      axis.normalize();

      const projA = this._projectPointsWithRadius(
        [bodyA.position],
        bodyA.radius,
        axis
      );
      const projB = this._projectVertices(bodyB.vertices, axis);

      if (projA.min > projB.max || projB.min > projA.max)
        return { collision: null };

      const axisOverlapDepth = Math.min(
        projA.max - projB.min,
        projB.max - projA.min
      );

      if (axisOverlapDepth < overlapDepth) {
        overlapDepth = axisOverlapDepth;
        normal.copy(axis);
      }
    }

    if (direction.dot(normal) < 0) normal.negate();

    // Contact Points
    let minDistanceSq = Infinity;
    const minContactPoint = new Vec2();
    const n = edges.length;

    for (let i = 0; i < n - 1; ++i) {
      const currPoint = edges[i];
      const nextPoint = edges[(i + 1) % n];

      const { contactPoint, distanceSq } = this._getPointInLineSegment(
        currPoint,
        nextPoint,
        bodyA.position
      );

      if (distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq;
        minContactPoint.copy(contactPoint);
      }
    }

    bodyA.contactPoints.push(minContactPoint);
    bodyA.edges.push(edges);

    return {
      collision: true,
      normal,
      overlapDepth,
      contactPoints: [minContactPoint]
    };
  }

  static detectPolygonToPolygon(bodyA, bodyB) {
    const normal = new Vec2();
    let overlapDepth = Infinity;
    const direction = Vec2.subtract(bodyB.position, bodyA.position);
    let edgeA = this._getVerticesEdgesInDirection(bodyA.vertices, direction);
    let edgeB = this._getVerticesEdgesInDirection(
      bodyB.vertices,
      Vec2.negate(direction)
    );
    const closestContactToA = this._getClosestContactPointInEdges(
      edgeB,
      bodyA.position
    );
    const closestContactToB = this._getClosestContactPointInEdges(
      edgeA,
      bodyB.position
    );
    const directionA = Vec2.subtract(closestContactToA, bodyA.position);
    const directionB = Vec2.subtract(closestContactToB, bodyB.position);

    edgeA = this._getVerticesEdgesInDirection(bodyA.vertices, directionA);
    edgeB = this._getVerticesEdgesInDirection(bodyB.vertices, directionB);

    const axes = [
      Vec2.subtract(edgeA[1], edgeA[0]).perp(),
      Vec2.subtract(edgeA[2], edgeA[1]).perp(),
      Vec2.subtract(edgeB[1], edgeB[0]).perp(),
      Vec2.subtract(edgeB[2], edgeB[1]).perp()
    ];

    for (const axis of axes) {
      axis.normalize();

      const projA = this._projectVertices(bodyA.vertices, axis);
      const projB = this._projectVertices(bodyB.vertices, axis);

      if (projA.min > projB.max || projB.min > projA.max)
        return { collision: null };

      const axisOverlapDepth = Math.min(
        projA.max - projB.min,
        projB.max - projA.min
      );

      if (axisOverlapDepth < overlapDepth) {
        overlapDepth = axisOverlapDepth;
        normal.copy(axis);
      }
    }

    if (direction.dot(normal) < 0) normal.negate();

    // Contact Points
    const contactPoints = [];
    const contactPoint1 = new Vec2();
    const contactPoint2 = new Vec2();
    let contactCounts = 0;
    let minDistanceSq = Infinity;

    function _checkForContactPoints(points, vertices) {
      let n = vertices.length;

      points.forEach(point => {
        for (let i = 0; i < n - 1; ++i) {
          const currPoint = vertices[i];
          const nextPoint = vertices[i + 1];
          const { contactPoint, distanceSq } = Collision._getPointInLineSegment(
            currPoint,
            nextPoint,
            point
          );

          if (Math.abs(distanceSq - minDistanceSq) < 1e-6) {
            if (!contactPoint.equal(contactPoint1)) {
              minDistanceSq = distanceSq;
              contactPoint2.copy(contactPoint);
              contactCounts = 2;
            }
          } else if (distanceSq < minDistanceSq) {
            minDistanceSq = distanceSq;
            contactPoint1.copy(contactPoint);
            contactCounts = 1;
          }
        }
      });
    }

    _checkForContactPoints(edgeA, edgeB);
    _checkForContactPoints(edgeB, edgeA);

    if (contactCounts == 1) {
      contactPoints.push(contactPoint1);
      bodyA.contactPoints.push(contactPoint1);
    } else if (contactCounts == 2) {
      contactPoints.push(contactPoint1, contactPoint2);
      bodyA.contactPoints.push(contactPoint1, contactPoint2);
    }

    bodyA.edges.push(edgeA, edgeB);

    return {
      collision: true,
      normal,
      overlapDepth,
      contactPoints
    };
  }

  static detectPolygonToPill(bodyA, bodyB) {
    const normal = new Vec2();
    let overlapDepth = Infinity;
    const direction = Vec2.subtract(bodyB.position, bodyA.position);
    let edgeA = this._getVerticesEdgesInDirection(bodyA.vertices, direction);
    let edgeB = [bodyB.startPoint, bodyB.endPoint];
    const closestContactToA = this._getClosestContactPointInEdges(
      edgeB,
      bodyA.position
    );
    const newDirectionA = Vec2.subtract(closestContactToA, bodyA.position);

    edgeA = this._getVerticesEdgesInDirection(bodyA.vertices, newDirectionA);

    const closestPointOfA = this._getVerticesClosestPoint(
      bodyA.vertices,
      bodyB.position
    );
    const { contactPoint: contactPointInB } = this._getPointInLineSegment(
      edgeB[0],
      edgeB[1],
      closestPointOfA
    );

    const axes = [
      Vec2.subtract(contactPointInB, closestPointOfA),
      Vec2.subtract(edgeA[1], edgeA[0]).perp(),
      Vec2.subtract(edgeA[2], edgeA[1]).perp(),
      Vec2.subtract(edgeB[1], edgeB[0]).perp()
    ];

    for (const axis of axes) {
      axis.normalize();

      const projA = this._projectVertices(bodyA.vertices, axis);
      const projB = this._projectPointsWithRadius(
        [bodyB.startPoint, bodyB.endPoint],
        bodyB.radius,
        axis
      );

      if (projA.min > projB.max || projB.min > projA.max)
        return { collision: null };

      const axisOverlapDepth = Math.min(
        projA.max - projB.min,
        projB.max - projA.min
      );

      if (axisOverlapDepth < overlapDepth) {
        overlapDepth = axisOverlapDepth;
        normal.copy(axis);
      }
    }

    if (direction.dot(normal) < 0) normal.negate();

    // Contact Points
    const contactPoints = [];
    const contactPoint1 = new Vec2();
    const contactPoint2 = new Vec2();
    let contactCounts = 0;
    let minDistanceSq = Infinity;

    function _checkForContactPoints(points, vertices) {
      const n = vertices.length;

      points.forEach(point => {
        for (let i = 0; i < n - 1; ++i) {
          const currPoint = vertices[i];
          const nextPoint = vertices[(i + 1) % n];

          const { contactPoint, distanceSq } = Collision._getPointInLineSegment(
            currPoint,
            nextPoint,
            point
          );

          if (Math.abs(distanceSq - minDistanceSq) <= 5e-4) {
            if (!contactPoint.equal(contactPoint1)) {
              contactPoint2.copy(contactPoint);
              contactCounts = 2;
            }
          } else if (distanceSq < minDistanceSq) {
            minDistanceSq = distanceSq;
            contactPoint1.copy(contactPoint);
            contactCounts = 1;
          }
        }
      });
    }

    _checkForContactPoints(edgeA, edgeB);

    if (contactCounts == 1) {
      contactPoint1.add(Vec2.scale(normal, -bodyB.radius));
    } else if (contactCounts == 2) {
      contactPoint1.add(Vec2.scale(normal, -bodyB.radius));
      contactPoint2.add(Vec2.scale(normal, -bodyB.radius));
    }

    _checkForContactPoints(edgeB, edgeA);

    if (contactCounts == 1) {
      contactPoints.push(contactPoint1);
      bodyA.contactPoints.push(contactPoint1);
      bodyB.contactPoints.push(contactPoint1);
    } else if (contactCounts == 2) {
      contactPoints.push(contactPoint1, contactPoint2);
      bodyA.contactPoints.push(contactPoint1, contactPoint2);
      bodyB.contactPoints.push(contactPoint1, contactPoint2);
    }

    bodyA.edges.push(edgeA);

    return {
      collision: true,
      normal,
      overlapDepth,
      contactPoints
    };
  }

  static detectPillToPill(bodyA, bodyB) {
    const normal = new Vec2();
    let overlapDepth = Infinity;
    const edgeA = [bodyA.startPoint, bodyA.endPoint];
    const edgeB = [bodyB.startPoint, bodyB.endPoint];
    const { contactPoint: contactPointInA } = this._getPointInLineSegment(
      edgeA[0],
      edgeA[1],
      bodyB.position
    );
    const { contactPoint: contactPointInB } = this._getPointInLineSegment(
      edgeB[0],
      edgeB[1],
      bodyA.position
    );
    // const closestToA = this._closestVertexfrom(edgeA, edgeB);
    // const closestToB = this._closestVertexfrom(edgeB, edgeA);

    const direction = Vec2.subtract(contactPointInB, contactPointInA);
    const axes = [
      direction,
      Vec2.subtract(edgeA[1], edgeA[0]).perp(),
      Vec2.subtract(edgeB[1], edgeB[0]).perp()
    ];

    for (const axis of axes) {
      axis.normalize();

      const projA = this._projectPointsWithRadius(edgeA, bodyA.radius, axis);
      const projB = this._projectPointsWithRadius(edgeB, bodyB.radius, axis);

      if (projA.min > projB.max || projB.min > projA.max)
        return { collision: null };

      const axisOverlapDepth = Math.min(
        projA.max - projB.min,
        projB.max - projA.min
      );

      if (axisOverlapDepth < overlapDepth) {
        overlapDepth = axisOverlapDepth;
        normal.copy(axis);
      }
    }

    if (direction.dot(normal) < 0) normal.negate();

    // Contact Points
    const contactPoints = [];
    const contactPoint1 = new Vec2();
    const contactPoint2 = new Vec2();
    let contactCounts = 0;
    let minDistanceSq = Infinity;

    function _checkForContactPoints(points, edge, radius) {
      points.forEach(point => {
        const currPoint = edge[0];
        const nextPoint = edge[1];

        const { contactPoint, distanceSq } = Collision._getPointInLineSegment(
          currPoint,
          nextPoint,
          point
        );

        if (Math.abs(distanceSq - minDistanceSq) < 5e-4) {
          if (!contactPoint.equal(contactPoint1)) {
            contactPoint2.copy(contactPoint.add(normal, radius));
            contactCounts = 2;
          }
        } else if (distanceSq < minDistanceSq) {
          minDistanceSq = distanceSq;
          contactPoint1.copy(contactPoint.add(normal, radius));
          contactCounts = 1;
        }
      });
    }

    _checkForContactPoints(edgeA, edgeB, -bodyB.radius);
    _checkForContactPoints(edgeB, edgeA, bodyA.radius);

    if (contactCounts == 1) {
      contactPoints.push(contactPoint1);
      bodyA.contactPoints.push(contactPoint1);
    } else if (contactCounts == 2) {
      contactPoints.push(contactPoint1, contactPoint2);
      bodyA.contactPoints.push(contactPoint1, contactPoint2);
    }

    return {
      collision: true,
      normal,
      overlapDepth,
      contactPoints
    };
  }

  static detectCircleToPill(bodyA, bodyB) {
    const edgeB = [bodyB.startPoint, bodyB.endPoint];
    const { contactPoint: pointB } = this._getPointInLineSegment(
      edgeB[0],
      edgeB[1],
      bodyA.position
    );

    const direction = Vec2.subtract(pointB, bodyA.position);
    const distanceSq = direction.magnitudeSq();
    const radii = bodyA.radius + bodyB.radius;

    if (distanceSq == 0 || distanceSq > radii * radii)
      return { collision: null };

    const distance = Math.sqrt(distanceSq);
    const normal = direction.scale(1 / distance);
    const overlapDepth = radii - distance;
    const contactPoint = Vec2.scale(normal, bodyA.radius).add(bodyA.position);

    bodyA.contactPoints.push(contactPoint);
    bodyB.contactPoints.push(contactPoint);

    return {
      collision: true,
      normal,
      overlapDepth,
      contactPoints: [contactPoint]
    };
  }
}
