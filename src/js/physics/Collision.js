import { Vector2 } from './Vector2.js';

export class Collision {
  static _getAxes(vertices) {
    const axes = [];
    for (let i = 0; i < vertices.length; i++) {
      const startPoint = vertices[i];
      const endPoint = vertices[(i + 1) % vertices.length];
      const edge = Vector2.subtract(endPoint, startPoint);
      const axis = edge.perp().normalize();
      axes.push(axis);
    }
    return axes;
  }

  static _projectPoints(points, radius, axis) {
    let min = Infinity;
    let max = -min;

    for (const point of points) {
      const projection = point.dot(axis);

      if (projection - radius < min) min = projection - radius;
      if (projection + radius > max) max = projection + radius;
    }
    return { min, max };
  }

  static _projectPolygon(vertices, axis) {
    let min = Infinity;
    let max = -min;

    for (const point of vertices) {
      const projection = point.dot(axis);

      if (projection < min) min = projection;
      if (projection > max) max = projection;
    }

    return { min, max };
  }

  static _closestPointIndexOfVertices(vertices, targetPoint) {
    let index = -1;
    let minDistanceSq = Infinity;

    for (let i = 0; i < vertices.length; i++) {
      const distanceSq = Vector2.distance(vertices[i], targetPoint);

      if (distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq;
        index = i;
      }
    }

    return index;
  }

  static _pointInLineSegment(startPoint, endPoint, targetPoint) {
    const ab = Vector2.subtract(endPoint, startPoint);
    const ap = Vector2.subtract(targetPoint, startPoint);
    const abLengthSq = ab.magnitudeSq();
    const projection = ap.dot(ab) / abLengthSq;
    const contactPoint = Vector2.add(startPoint, ab.scale(projection));

    if (projection < 0) {
      contactPoint.copy(startPoint);
    } else if (projection > 1) {
      contactPoint.copy(endPoint);
    }

    const distanceSq = Vector2.distanceSq(targetPoint, contactPoint);

    return { contactPoint, distanceSq };
  }

  // Circle To Circle
  static detectCircleToCircle(bodyA, bodyB) {
    const direction = Vector2.subtract(bodyB.position, bodyA.position);
    const distanceSq = direction.magnitudeSq();
    const radii = bodyA.radius + bodyB.radius;

    if (distanceSq === 0 || distanceSq >= radii * radii) {
      return {
        collision: false,
        normal: null,
        overlapDepth: 0
      };
    }

    const distance = Math.sqrt(distanceSq);
    const normal = direction.scale(1 / distance);
    const overlapDepth = (radii - distance) * 0.5;

    return {
      collision: true,
      normal,
      overlapDepth
    };
  }

  static supportsCircleToCircle(bodyA, normal) {
    const contactPoint1 = Vector2.add(
      bodyA.position,
      Vector2.scale(normal, bodyA.radius)
    ).add(normal.perp(), -2);
    const contactPoint2 = Vector2.add(
      bodyA.position,
      Vector2.scale(normal, bodyA.radius)
    ).add(normal.perp(), 2);

    return [contactPoint1, contactPoint2];
  }

  // Circle To Polygon
  static detectCircleToRectangle(bodyA, bodyB) {
    let normal = new Vector2();
    let minOverlapDepth = Infinity;

    const axes = this._getAxes(bodyB.vertices);
    const closestPointIndex = this._closestPointIndexOfVertices(
      bodyB.vertices,
      bodyA.position
    );
    const circleToClosestPointAxis = Vector2.subtract(
      bodyB.vertices[closestPointIndex],
      bodyA.position
    ).normalize();

    for (const axis of [circleToClosestPointAxis, ...axes]) {
      const projA = this._projectPoints([bodyA.position], bodyA.radius, axis);
      const projB = this._projectPolygon(bodyB.vertices, axis);

      if (projA.min > projB.max || projB.min > projA.max) {
        return {
          collision: false,
          normal: null,
          overlapDepth: 0
        };
      }

      const axisOverlapDepth = Math.min(
        projA.max - projB.min,
        projB.max - projA.min
      );

      if (axisOverlapDepth < minOverlapDepth) {
        minOverlapDepth = axisOverlapDepth;
        normal.copy(axis);
      }

      const direction = Vector2.subtract(bodyB.position, bodyA.position);

      if (direction.dot(normal) < 0) normal.negate();
    }

    return {
      collision: true,
      normal,
      overlapDepth: minOverlapDepth * 0.5
    };
  }

  static supportsCircleToRectangle(targetPoint, vertices, normal) {
    let minDistanceSq = Infinity;
    let closestContactPoint = null;

    for (let i = 0; i < vertices.length; i++) {
      const startPoint = vertices[i];
      const endPoint = vertices[(i + 1) % vertices.length];

      const { contactPoint, distanceSq } = this._pointInLineSegment(
        startPoint,
        endPoint,
        targetPoint
      );

      if (distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq;
        closestContactPoint = contactPoint;
      }
    }

    return [
      Vector2.add(closestContactPoint, Vector2.scale(normal.perp(), -2)),
      Vector2.add(closestContactPoint, Vector2.scale(normal.perp(), 2))
    ];
  }

  // Polygon To Polygon
  static detectPolygonToPolygon(bodyA, bodyB) {
    let normal = new Vector2();
    let minOverlapDepth = Infinity;

    const axesA = this._getAxes(bodyA.vertices);
    const axesB = this._getAxes(bodyB.vertices);

    for (const axis of [...axesA, ...axesB]) {
      const projA = this._projectPolygon(bodyA.vertices, axis);
      const projB = this._projectPolygon(bodyB.vertices, axis);

      if (projA.min > projB.max || projB.min > projA.max) {
        return {
          collision: false,
          normal: null,
          overlapDepth: 0
        };
      }

      const axisOverlapDepth = Math.min(
        projA.max - projB.min,
        projB.max - projA.min
      );

      if (axisOverlapDepth < minOverlapDepth) {
        minOverlapDepth = axisOverlapDepth;
        normal.copy(axis);
      }

      const direction = Vector2.subtract(bodyB.position, bodyA.position);

      if (direction.dot(normal) < 0) normal.negate();
    }

    return {
      collision: true,
      normal,
      overlapDepth: minOverlapDepth * 0.5
    };
  }

  static supportsPolygonToPolygon(bodyA, bodyB) {
    const contactPoint1 = new Vector2(Infinity, Infinity);
    const contactPoint2 = new Vector2(Infinity, Infinity);
    let contactCounts = 0;
    let minDistanceSq = Infinity;

    const findContactPoint = (points, vertices) => {
      for (let i = 0; i < points.length; i++) {
        const targetPoint = points[i];

        for (let j = 0; j < vertices.length; j++) {
          const startPoint = vertices[j];
          const endPoint = vertices[(j + 1) % vertices.length];

          const { contactPoint, distanceSq } = this._pointInLineSegment(
            startPoint,
            endPoint,
            targetPoint
          );

          if (Math.abs(distanceSq - minDistanceSq) <= 5e-4) {
            if (
              !contactPoint.equal(contactPoint1) &&
              !contactPoint.equal(contactPoint2)
            ) {
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
      }
    };

    findContactPoint(bodyA.vertices, bodyB.vertices);
    findContactPoint(bodyB.vertices, bodyA.vertices);

    const contactPoints = [];

    if (contactCounts === 1) {
      contactPoints.push(contactPoint1);
    } else if (contactCounts === 2) {
      contactPoints.push(contactPoint1, contactPoint2);
    }

    return contactPoints;
  }

  // Polygon To Pill
  static detectPolygonToPill(bodyA, bodyB) {
    const normal = new Vector2();
    let minOverlapDepth = Infinity;

    const axesA = this._getAxes(bodyA.vertices);
    const axisB = Vector2.subtract(
      bodyB.startPoint,
      bodyB.endPoint
    ).normalize();
    const axisBPerp = Vector2.subtract(bodyB.startPoint, bodyB.endPoint)
      .perp()
      .normalize();

    for (const axis of [...axesA, axisB, axisBPerp]) {
      const projA = this._projectPolygon(bodyA.vertices, axis);
      const projB = this._projectPoints(
        [bodyB.startPoint, bodyB.endPoint],
        bodyB.radius,
        axis
      );

      if (projA.min > projB.max || projB.min > projA.max) {
        return {
          collision: false,
          normal: null,
          overlapDepth: 0
        };
      }

      const axisOverlapDepth = Math.min(
        projA.max - projB.min,
        projB.max - projA.min
      );

      if (axisOverlapDepth < minOverlapDepth) {
        minOverlapDepth = axisOverlapDepth;
        normal.copy(axis);
      }

      const direction = Vector2.subtract(bodyB.position, bodyA.position);

      if (direction.dot(normal) < 0) normal.negate();
    }

    return {
      collision: true,
      normal,
      overlapDepth: minOverlapDepth * 0.5
    };
  }

  static supportsPolygonToPill(bodyA, bodyB, normal) {
    const contactPoint1 = new Vector2(Infinity, Infinity);
    const contactPoint2 = new Vector2(Infinity, Infinity);
    let contactCounts = 0;
    let minDistanceSq = Infinity;

    const findContactPoint = (points, vertices) => {
      for (let i = 0; i < points.length; i++) {
        const targetPoint = points[i];

        for (let j = 0; j < vertices.length; j++) {
          const startPoint = vertices[j];
          const endPoint = vertices[(j + 1) % vertices.length];

          const { contactPoint, distanceSq } = this._pointInLineSegment(
            startPoint,
            endPoint,
            targetPoint
          );

          if (Math.abs(distanceSq - minDistanceSq) <= 5e-4) {
            if (
              !contactPoint.equal(contactPoint1) &&
              !contactPoint.equal(contactPoint2)
            ) {
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
      }
    };

    findContactPoint(bodyA.vertices, [bodyB.startPoint, bodyB.endPoint]);

    const direction1 = Vector2.subtract(bodyA.position, contactPoint1);
    const direction2 = Vector2.subtract(bodyA.position, contactPoint2);

    if (direction1.dot(normal) < 0) {
      contactPoint1.add(Vector2.scale(normal, -bodyB.radius));
    } else {
      contactPoint1.add(Vector2.scale(normal, bodyB.radius));
    }

    if (direction2.dot(normal) < 0) {
      contactPoint2.add(Vector2.scale(normal, -bodyB.radius));
    } else {
      contactPoint2.add(Vector2.scale(normal, bodyB.radius));
    }

    findContactPoint([bodyB.startPoint, bodyB.endPoint], bodyA.vertices);

    const contactPoints = [];

    if (contactCounts === 1) {
      contactPoints.push(contactPoint1);
    } else if (contactCounts === 2) {
      contactPoints.push(contactPoint1, contactPoint2);
    }

    return contactPoints;
  }

  // Pill To Pill
  static detectPillToPill(bodyA, bodyB) {
    let normal = new Vector2();
    let minOverlapDepth = Infinity;

    const { contactPoint: pointA } = this._pointInLineSegment(
      bodyA.startPoint,
      bodyA.endPoint,
      bodyB.position
    );
    const { contactPoint: pointB } = this._pointInLineSegment(
      bodyB.startPoint,
      bodyB.endPoint,
      bodyA.position
    );

    const axis0 = Vector2.subtract(pointB, pointA).normalize();
    const axis1 = Vector2.subtract(bodyA.startPoint, bodyA.endPoint)
      .perp()
      .normalize();
    const axis2 = Vector2.subtract(bodyB.startPoint, bodyB.endPoint)
      .perp()
      .normalize();

    for (const axis of [axis0, axis1, axis2]) {
      const projA = this._projectPoints(
        [bodyA.startPoint, bodyA.endPoint],
        bodyA.radius,
        axis
      );
      const projB = this._projectPoints(
        [bodyB.startPoint, bodyB.endPoint],
        bodyB.radius,
        axis
      );

      if (projA.min > projB.max || projB.min > projA.max) {
        return {
          collision: false,
          normal: null,
          overlapDepth: 0
        };
      }

      const axisOverlapDepth = Math.min(
        projA.max - projB.min,
        projB.max - projA.min
      );

      if (axisOverlapDepth < minOverlapDepth) {
        minOverlapDepth = axisOverlapDepth;
        normal.copy(axis);
      }

      if (axis0.dot(normal) < 0) normal.negate();
    }

    return {
      collision: true,
      normal,
      overlapDepth: minOverlapDepth * 0.5
    };
  }

  static supportsPillToPill(bodyA, bodyB, normal) {
    const contactPoint1 = new Vector2(Infinity, Infinity);
    const contactPoint2 = new Vector2(Infinity, Infinity);
    let contactCounts = 0;
    let minDistanceSq = Infinity;

    const findContactPoint = (points, vertices) => {
      for (let i = 0; i < points.length; i++) {
        const targetPoint = points[i];

        for (let j = 0; j < vertices.length; j++) {
          const startPoint = vertices[j];
          const endPoint = vertices[(j + 1) % vertices.length];

          const { contactPoint, distanceSq } = this._pointInLineSegment(
            startPoint,
            endPoint,
            targetPoint
          );

          if (Math.abs(distanceSq - minDistanceSq) <= 5e-4) {
            if (
              !contactPoint.equal(contactPoint1) &&
              !contactPoint.equal(contactPoint2)
            ) {
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
      }
    };

    const verticesA = [bodyA.startPoint, bodyA.endPoint];
    const verticesB = [bodyB.startPoint, bodyB.endPoint];

    findContactPoint(verticesA, verticesB);
    findContactPoint(verticesB, verticesA);

    const { contactPoint: pointA } = this._pointInLineSegment(
      bodyA.startPoint,
      bodyA.endPoint,
      bodyB.position
    );

    if (contactCounts === 1) {
      return [contactPoint1, pointA];
    } else if (contactCounts === 2) {
      return [contactPoint1, contactPoint2, pointA];
    }
  }

  // Circle To Pill
  static detectCircleToPill(bodyA, bodyB) {
    const { contactPoint: pointB } = this._pointInLineSegment(
      bodyB.startPoint,
      bodyB.endPoint,
      bodyA.position
    );

    const direction = Vector2.subtract(pointB, bodyA.position);
    const distanceSq = direction.magnitudeSq();
    const radii = bodyA.radius + bodyB.radius;

    if (distanceSq === 0 || distanceSq >= radii * radii) {
      return {
        collision: false,
        normal: null,
        overlapDepth: 0
      };
    }

    const distance = Math.sqrt(distanceSq);
    const normal = direction.scale(1 / distance);
    const overlapDepth = (radii - distance) * 0.5;

    return {
      collision: true,
      normal,
      overlapDepth
    };
  }

  static supportsCircleToPill(bodyA, normal) {
    const contactPoint1 = Vector2.add(
      bodyA.position,
      Vector2.scale(normal, bodyA.radius)
    ).add(normal.perp(), -2);
    const contactPoint2 = Vector2.add(
      bodyA.position,
      Vector2.scale(normal, bodyA.radius)
    ).add(normal.perp(), 2);

    return [contactPoint1, contactPoint2];
  }
}
