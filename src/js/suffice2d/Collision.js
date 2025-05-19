import { Vec2 } from './Vec2.js';

export class Collision {
  static _clamp(value, min = 0, max = 1) {
    return value > max ? max : value < min ? min : value;
  }

  static getCollisionType(labelA, labelB) {
    if (labelA == 'circle' && labelB == 'circle') {
      return 'circle-circle';
    }

    if (labelA == 'circle' && (labelB == 'rectangle' || labelB == 'polygon')) {
      return 'circle-polygon';
    }

    if (
      (labelA == 'rectangle' || labelA == 'polygon') &&
      (labelB == 'rectangle' || labelB == 'polygon')
    ) {
      return 'polygon-polygon';
    }

    if ((labelA == 'rectangle' || labelA == 'polygon') && labelB == 'capsule') {
      return 'polygon-capsule';
    }

    if (labelA == 'circle' && labelB == 'capsule') return 'circle-capsule';

    if (labelA == 'capsule' && labelB == 'capsule') return 'capsule-capsule';

    return 'unknown';
  }

  static _getClosestPoint(targetPoint, vertices) {
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

  static _getContactPoint(targetPoint, vertices) {
    let minDistanceSq = Infinity;
    const closestPoint = new Vec2();
    const n = vertices.length;

    for (let i = 0; i < n - 1; ++i) {
      const currPoint = vertices[i];
      const nextPoint = vertices[i + 1];
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

  static _getEdge(direction, vertices, center) {
    let bestDot = -Infinity;
    const edge = [];
    const n = vertices.length;

    for (let i = 0; i < n; ++i) {
      const vertexA = vertices[i];
      const c = Vec2.subtract(vertexA, center);
      const dot = direction.dot(vertexA);
      const cross = direction.cross(c);

      if (dot > bestDot) {
        bestDot = dot;
        edge[0] = vertexA;
        edge[1] = cross > 0 ? vertices[(i - 1 + n) % n] : vertices[(i + 1) % n];
      }
    }

    return edge;
  }

  static _getAxes(vertices) {
    const axes = [];
    const n = vertices.length;

    for (let i = 0; i < n; ++i) {
      const vertexA = vertices[i];
      const vertexB = vertices[i + 1 > n - 1 ? 0 : i + 1];
      const edgeNormal = Vec2.subtract(vertexB, vertexA).perp();

      axes.push(edgeNormal);
    }

    return axes;
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

    const directionA = Vec2.subtract(bodyB.position, bodyA.position);
    const directionB = Vec2.subtract(bodyA.position, bodyB.position);
    const edgeB = this._getEdge(directionB, bodyB.vertices, bodyB.position);
    const closestPoint = this._getClosestPoint(bodyA.position, edgeB);

    const axisA = Vec2.subtract(closestPoint, bodyA.position);
    const axesB = this._getAxes(bodyB.vertices);

    axesB.splice(0, 0, axisA);

    for (const axis of axesB) {
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

    if (directionA.dot(normal) < 0) normal.negate();

    const { contactPoint } = this._getPointInLineSegment(
      edgeB[0],
      edgeB[1],
      bodyA.position
    );

    bodyA.contactPoints.push(contactPoint);
    bodyA.edges.push(edgeB);

    return {
      collision: true,
      normal,
      overlapDepth,
      contactPoints: [contactPoint]
    };
  }

  static detectPolygonToPolygon(bodyA, bodyB) {
    const normal = new Vec2();
    let overlap = Infinity;

    const directionA = Vec2.subtract(bodyB.position, bodyA.position);
    const directionB = Vec2.subtract(bodyA.position, bodyB.position);
    let edgeA = this._getEdge(directionA, bodyA.vertices, bodyA.position);
    let edgeB = this._getEdge(directionB, bodyB.vertices, bodyB.position);

    const contactPointInA = this._getContactPoint(bodyB.position, edgeA);
    const contactPointInB = this._getContactPoint(bodyA.position, edgeB);

    directionA.copy(Vec2.subtract(contactPointInB, bodyA.position));
    directionB.copy(Vec2.subtract(contactPointInA, bodyB.position));
    edgeA = this._getEdge(directionA, bodyA.vertices, bodyA.position);
    edgeB = this._getEdge(directionB, bodyB.vertices, bodyB.position);

    const axesA = this._getAxes(bodyA.vertices);
    const axesB = this._getAxes(bodyB.vertices);

    const _getMTV = axes => {
      for (const axis of axes) {
        axis.normalize();

        const projA = this._projectVertices(bodyA.vertices, axis);
        const projB = this._projectVertices(bodyB.vertices, axis);

        if (projA.min > projB.max || projB.min > projA.max) {
          return null;
        }

        const axisOverlap = Math.min(
          projA.max - projB.min,
          projB.max - projA.min
        );

        if (axisOverlap < overlap) {
          overlap = axisOverlap;
          normal.copy(axis);
        }
      }

      return true;
    };

    if (!_getMTV(axesA) || !_getMTV(axesB)) {
      return { collision: null };
    }

    if (directionA.dot(normal) < 0) normal.negate();

    const contactPoints = [];
    let minDistanceSq = Infinity;

    const _findContactPoints = (edgeA, edgeB) => {
      for (let i = 0; i < edgeA.length; ++i) {
        const vertexA = edgeA[i];
        const vertexB0 = edgeB[0];
        const vertexB1 = edgeB[1];
        const { contactPoint, distanceSq } = this._getPointInLineSegment(
          vertexB0,
          vertexB1,
          vertexA
        );

        if (Math.abs(distanceSq - minDistanceSq) < 1e-2) {
          if (!contactPoint.equal(contactPoints[0])) {
            minDistanceSq = distanceSq;
            contactPoints[1] = contactPoint;
          }
        } else if (distanceSq < minDistanceSq) {
          minDistanceSq = distanceSq;
          contactPoints[0] = contactPoint;
        }
      }
    };

    _findContactPoints(edgeA, edgeB);
    _findContactPoints(edgeB, edgeA);

    contactPoints.forEach(point => {
      bodyA.contactPoints.push(point);
    });

    bodyA.edges.push(edgeA);

    return {
      collision: true,
      normal,
      overlapDepth: overlap,
      contactPoints
    };
  }

  static detectPolygonToCapsule(bodyA, bodyB) {
    const normal = new Vec2();
    let overlapDepth = Infinity;

    const directionA = Vec2.subtract(bodyB.position, bodyA.position);
    let edgeA = this._getEdge(directionA, bodyA.vertices, bodyA.position);
    let edgeB = [bodyB.startPoint, bodyB.endPoint];
    const contactPointInB = this._getContactPoint(bodyA.position, edgeB);

    directionA.copy(Vec2.subtract(contactPointInB, bodyA.position));
    edgeA = this._getEdge(directionA, bodyA.vertices, bodyA.position);

    const closestPointOfA = this._getClosestPoint(bodyB.position, edgeA);

    const axesA = this._getAxes(bodyA.vertices);
    axesA.splice(
      0,
      0,
      Vec2.subtract(contactPointInB, closestPointOfA),
      Vec2.subtract(edgeB[1], edgeB[0]).perp()
    );

    for (const axis of axesA) {
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

    if (directionA.dot(normal) < 0) normal.negate();

    const contactPoints = [];
    let minDistanceSq = Infinity;

    const _findContactPoints = (edgeA, edgeB) => {
      for (let i = 0; i < edgeA.length; ++i) {
        const vertexA = edgeA[i];
        const vertexB0 = edgeB[0];
        const vertexB1 = edgeB[1];

        const { contactPoint, distanceSq } = this._getPointInLineSegment(
          vertexB0,
          vertexB1,
          vertexA
        );

        if (Math.abs(distanceSq - minDistanceSq) < 1e-2) {
          if (!contactPoint.equal(contactPoints[0])) {
            contactPoints[1] = contactPoint;
          }
        } else if (distanceSq < minDistanceSq) {
          minDistanceSq = distanceSq;
          contactPoints[0] = contactPoint;
        }
      }
    };

    _findContactPoints(edgeA, edgeB);

    if (contactPoints.length > 0) {
      contactPoints[0].add(Vec2.scale(normal, -bodyB.radius));
    } else if (contactPoints.length > 1) {
      contactPoints[0].add(Vec2.scale(normal, -bodyB.radius));
      contactPoints[1].add(Vec2.scale(normal, -bodyB.radius));
    }

    _findContactPoints(edgeB, edgeA);

    contactPoints.forEach(point => {
      bodyA.contactPoints.push(point);
    });

    bodyA.edges.push(edgeA);

    return {
      collision: true,
      normal,
      overlapDepth,
      contactPoints
    };
  }

  static detectCapsuleToCapsule(bodyA, bodyB) {
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

      if (projA.min > projB.max || projB.min > projA.max) {
        return { collision: null };
      }

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

    const contactPoints = [];
    let minDistanceSq = Infinity;

    const _findContactPoints = (edgeA, edgeB, radius) => {
      for (let i = 0; i < edgeA.length; ++i) {
        const vertexA = edgeA[i];
        const vertexB0 = edgeB[0];
        const vertexB1 = edgeB[1];

        const { contactPoint, distanceSq } = this._getPointInLineSegment(
          vertexB0,
          vertexB1,
          vertexA
        );

        if (Math.abs(distanceSq - minDistanceSq) < 1e-2) {
          if (!contactPoint.equal(contactPoints[0])) {
            contactPoints[1] = contactPoint.add(normal, radius);
          }
        } else if (distanceSq < minDistanceSq) {
          minDistanceSq = distanceSq;
          contactPoints[0] = contactPoint.add(normal, radius);
        }
      }
    };

    _findContactPoints(edgeA, edgeB, -bodyB.radius);
    _findContactPoints(edgeB, edgeA, bodyA.radius);

    contactPoints.forEach(point => {
      bodyA.contactPoints.push(point);
    });

    return {
      collision: true,
      normal,
      overlapDepth,
      contactPoints
    };
  }

  static detectCircleToCapsule(bodyA, bodyB) {
    const edgeB = [bodyB.startPoint, bodyB.endPoint];
    const { contactPoint: contactPointInB } = this._getPointInLineSegment(
      edgeB[0],
      edgeB[1],
      bodyA.position
    );

    const direction = Vec2.subtract(contactPointInB, bodyA.position);
    const distanceSq = direction.magnitudeSq();
    const radii = bodyA.radius + bodyB.radius;

    if (distanceSq == 0 || distanceSq > radii * radii) {
      return { collision: null };
    }

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
}
