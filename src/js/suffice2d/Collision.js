import { Vec2 } from './Vec2.js';

export class Collision {
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

  static _getAxes(vertices, axes = []) {
    const n = vertices.length;

    for (let i = 0; i < n; ++i) {
      const vertexA = vertices[i];
      const vertexB = vertices[i + 1 > n - 1 ? 0 : i + 1];
      const edgeNormal = Vec2.subtract(vertexB, vertexA).perp();

      axes.push(edgeNormal);
    }

    return axes;
  }

  static _getFeaturedVertices(vertices, normal) {
    let maxProjection = -Infinity;
    let index = -1;
    const n = vertices.length;

    for (let i = 0; i < n; ++i) {
      const projection = vertices[i].dot(normal);

      if (projection > maxProjection) {
        maxProjection = projection;
        index = i;
      }
    }

    return [
      vertices[(index - 1 + n) % n],
      vertices[index],
      vertices[(index + 1) % n]
    ];
  }

  static _getBestEdge(featuredVertices, normal) {
    const prevVertex = featuredVertices[0];
    const currVertex = featuredVertices[1];
    const nextVertex = featuredVertices[2];

    const prevEdge = Vec2.subtract(currVertex, prevVertex);
    const nextEdge = Vec2.subtract(currVertex, nextVertex);

    prevEdge.normalize();
    nextEdge.normalize();

    if (prevEdge.dot(normal) <= nextEdge.dot(normal)) {
      return [prevVertex, currVertex, currVertex];
    } else {
      return [currVertex, nextVertex, currVertex];
    }
  }

  static _clipEdge(edge, normal, dot, clippedPoints = []) {
    const d1 = edge[0].dot(normal) - dot;
    const d2 = edge[1].dot(normal) - dot;

    if (d1 >= 0) clippedPoints.push(edge[0]);
    if (d2 >= 0) clippedPoints.push(edge[1]);

    if (d1 * d2 < 0.0) {
      const edgeVector = Vec2.subtract(edge[1], edge[0]);
      const u = d1 / (d1 - d2);

      edgeVector.scale(u);
      edgeVector.add(edge[0]);

      clippedPoints.push(edgeVector);
    }

    return clippedPoints;
  }

  static detectCircleToCircle(bodyA, bodyB, manifold) {
    const direction = Vec2.subtract(bodyB.position, bodyA.position);
    const distanceSq = direction.magnitudeSq();
    const radii = bodyA.radius + bodyB.radius;

    if (distanceSq === 0 || distanceSq > radii * radii) {
      manifold.collision = false;
      return;
    }

    const distance = Math.sqrt(distanceSq);
    const normal = direction.scale(1 / distance);
    const overlapDepth = radii - distance;
    const contactPoint = Vec2.scale(normal, bodyA.radius).add(bodyA.position);

    bodyA.contactPoints.push(contactPoint);

    manifold.collision = true;
    manifold.normal.copy(normal);
    manifold.overlapDepth = overlapDepth;
    manifold.contactPoints = [contactPoint];
  }

  static detectCircleToRectangle(bodyA, bodyB, manifold) {
    const normal = new Vec2();
    let depth = Infinity;
    const closestPoint = this._getClosestPoint(bodyA.position, bodyB.vertices);
    let axes = [Vec2.subtract(closestPoint, bodyA.position)];

    axes = this._getAxes(bodyB.vertices, axes);

    for (let i = 0; i < axes.length; ++i) {
      const axis = axes[i].normalize();
      const projA = this._projectPointsWithRadius(
        [bodyA.position],
        bodyA.radius,
        axis
      );
      const projB = this._projectVertices(bodyB.vertices, axis);

      if (projA.min > projB.max || projB.min > projA.max) {
        manifold.collision = false;
        return;
      }

      const axisDepth = Math.min(projA.max - projB.min, projB.max - projA.min);

      if (axisDepth < depth) {
        depth = axisDepth;
        normal.copy(axis);
      }
    }

    const direction = Vec2.subtract(bodyB.position, bodyA.position);

    if (direction.dot(normal) < 0) {
      normal.negate();
    }

    const featuredVerticesB = this._getFeaturedVertices(
      bodyB.vertices,
      Vec2.negate(normal)
    );
    const edgeB = this._getBestEdge(featuredVerticesB, Vec2.negate(normal));
    const { contactPoint } = this._getPointInLineSegment(
      edgeB[1],
      edgeB[0],
      bodyA.position
    );

    bodyA.contactPoints.push(contactPoint);
    bodyA.edges.push(edgeB);

    manifold.collision = true;
    manifold.normal.copy(normal);
    manifold.overlapDepth = depth;
    manifold.contactPoints = [contactPoint];
  }

  static detectPolygonToPolygon(bodyA, bodyB, manifold) {
    const normal = new Vec2();
    let depth = Infinity;
    let axes = [];

    axes = this._getAxes(bodyA.vertices, axes);
    axes = this._getAxes(bodyB.vertices, axes);

    for (let i = 0; i < axes.length; ++i) {
      const axis = axes[i].normalize();
      const projA = this._projectVertices(bodyA.vertices, axis);
      const projB = this._projectVertices(bodyB.vertices, axis);

      if (projA.min > projB.max || projB.min > projA.max) {
        manifold.collision = false;
        return;
      }

      const axisDepth = Math.min(projA.max - projB.min, projB.max - projA.min);

      if (axisDepth < depth) {
        depth = axisDepth;
        normal.copy(axis);
      }
    }

    const direction = Vec2.subtract(bodyB.position, bodyA.position);
    let flip = false;

    if (direction.dot(normal) < 0) {
      normal.negate();
      flip = true;
    }

    const featuredVerticesA = this._getFeaturedVertices(bodyA.vertices, normal);
    const featuredVerticesB = this._getFeaturedVertices(
      bodyB.vertices,
      Vec2.negate(normal)
    );

    const bestEdgeA = this._getBestEdge(featuredVerticesA, normal);
    const bestEdgeB = this._getBestEdge(featuredVerticesB, Vec2.negate(normal));

    bodyA.edges.push(bestEdgeA);

    let ref = null;
    let inc = null;

    if (flip) {
      ref = bestEdgeB;
      inc = bestEdgeA;
    } else {
      ref = bestEdgeA;
      inc = bestEdgeB;
    }

    const refEdge = Vec2.subtract(ref[1], ref[0]).normalize();
    const dot1 = ref[0].dot(refEdge);
    const dot2 = ref[1].dot(refEdge);
    let clippedPoints = [];

    clippedPoints = this._clipEdge(inc, refEdge, dot1);

    if (clippedPoints.length > 1) {
      clippedPoints = this._clipEdge(
        clippedPoints,
        Vec2.negate(refEdge),
        -dot2
      );
    }

    const edgeNormal = refEdge.perp();
    const max = ref[2].dot(edgeNormal);

    clippedPoints.forEach((point, i) => {
      if (point.dot(edgeNormal) - max < 0) {
        clippedPoints.splice(i, 1);
      }
    });

    clippedPoints.forEach(point => {
      bodyA.contactPoints.push(point);
    });

    manifold.collision = true;
    manifold.normal.copy(normal);
    manifold.overlapDepth = depth;
    manifold.contactPoints = clippedPoints;
  }

  static detectPolygonToCapsule(bodyA, bodyB, manifold) {
    const normal = new Vec2();
    let overlapDepth = Infinity;

    const directionA = Vec2.subtract(bodyB.position, bodyA.position);
    let edgeA = this._getEdge(directionA, bodyA.vertices, bodyA.position);
    let edgeB = [bodyB.startPoint, bodyB.endPoint];

    const closestPointOfA = this._getClosestPoint(bodyB.position, edgeA);
    const contactPointInB = this._getContactPoint(bodyA.position, edgeB);

    directionA.copy(Vec2.subtract(contactPointInB, bodyA.position));
    edgeA = this._getEdge(directionA, bodyA.vertices, bodyA.position);

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

      if (projA.min > projB.max || projB.min > projA.max) {
        manifold.collision = false;
        return;
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

    if (contactPoints.length < 2) {
      contactPoints[0].add(Vec2.scale(normal, -bodyB.radius));
    }

    if (contactPoints.length > 1) {
      contactPoints[0].add(Vec2.scale(normal, -bodyB.radius));
      contactPoints[1].add(Vec2.scale(normal, -bodyB.radius));
    }

    _findContactPoints(edgeB, edgeA);

    contactPoints.forEach(point => {
      bodyA.contactPoints.push(point);
    });
    bodyA.edges.push(edgeA);

    manifold.collision = true;
    manifold.normal.copy(normal);
    manifold.overlapDepth = overlapDepth;
    manifold.contactPoints = contactPoints;
  }

  static detectCapsuleToCapsule(bodyA, bodyB, manifold) {
    const normal = new Vec2();
    let overlapDepth = Infinity;

    const edgeA = [bodyA.startPoint, bodyA.endPoint];
    const edgeB = [bodyB.startPoint, bodyB.endPoint];
    const closestPointA = this._getClosestPoint(bodyB.position, edgeA);
    const closestPointB = this._getClosestPoint(bodyA.position, edgeB);
    const direction = Vec2.subtract(closestPointB, closestPointA);

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
        manifold.collision = false;
        return;
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

    manifold.collision = true;
    manifold.normal.copy(normal);
    manifold.overlapDepth = overlapDepth;
    manifold.contactPoints = contactPoints;
  }

  static detectCircleToCapsule(bodyA, bodyB, manifold) {
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
      manifold.collision = false;
      return;
    }

    const distance = Math.sqrt(distanceSq);
    const normal = direction.scale(1 / distance);
    const overlapDepth = radii - distance;
    const contactPoint = Vec2.scale(normal, bodyA.radius).add(bodyA.position);

    bodyA.contactPoints.push(contactPoint);

    manifold.collision = true;
    manifold.normal.copy(normal);
    manifold.overlapDepth = overlapDepth;
    manifold.contactPoints = [contactPoint];
  }
}
