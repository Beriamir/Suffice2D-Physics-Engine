import { Vec2 } from './Vec2.js';

export class Collision {
  static _getPointInLineSegment(startPoint, endPoint, targetPoint) {
    const ab = Vec2.subtract(endPoint, startPoint);
    const ap = Vec2.subtract(targetPoint, startPoint);
    const abLengthSq = ab.magnitudeSq();
    const projection = ap.dot(ab) / abLengthSq;
    const point = ab.scale(projection).add(startPoint);

    if (projection < 0) {
      point.copy(startPoint);
    } else if (projection > 1) {
      point.copy(endPoint);
    }

    const distanceSq = Vec2.distanceSq(targetPoint, point);

    return { point, distanceSq };
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

  static _getMaxVertex(vertices, normal) {
    let bestIndex = -1;
    let bestProjection = -Infinity;
    const n = vertices.length;

    for (let i = 0; i < n; ++i) {
      const projection = vertices[i].dot(normal);

      if (projection > bestProjection) {
        bestProjection = projection;
        bestIndex = i;
      }
    }

    return vertices[bestIndex];
  }

  static _projectCircle(body, axis) {
    let min = Infinity;
    let max = -Infinity;

    const projection = body.position.dot(axis);

    if (projection < min) min = projection;
    if (projection > max) max = projection;

    return { min: min - body.radius, max: max + body.radius };
  }

  static _projectCapsule(body, axis) {
    const segment = [body.startPoint, body.endPoint];
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < segment.length; ++i) {
      const projection = segment[i].dot(axis);

      if (projection < min) min = projection;
      if (projection > max) max = projection;
    }

    return { min: min - body.radius, max: max + body.radius };
  }

  static _projectPolygon(body, axis) {
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < body.vertices.length; ++i) {
      const projection = body.vertices[i].dot(axis);

      if (projection < min) min = projection;
      if (projection > max) max = projection;
    }

    return { min, max };
  }

  static _getContactEdge(vertices, normal) {
    let bestIndex = -1;
    let bestProjection = -Infinity;
    const n = vertices.length;

    for (let i = 0; i < n; ++i) {
      const projection = vertices[i].dot(normal);

      if (projection > bestProjection) {
        bestProjection = projection;
        bestIndex = i;
      }
    }

    const prevVertex = vertices[bestIndex - 1 < 0 ? n - 1 : bestIndex - 1];
    const bestVertex = vertices[bestIndex];
    const nextVertex = vertices[bestIndex + 1 > n - 1 ? 0 : bestIndex + 1];

    const prevEdge = Vec2.subtract(bestVertex, prevVertex);
    const nextEdge = Vec2.subtract(bestVertex, nextVertex);

    if (prevEdge.dot(normal) <= nextEdge.dot(normal)) {
      return [prevVertex, bestVertex, bestVertex];
    } else {
      return [bestVertex, nextVertex, bestVertex];
    }
  }

  static _clipEdge(ref, inc) {
    // Sutherland–Hodgman clipping algorithm
    const clippedPoints = [];
    const refEdge = Vec2.subtract(ref[1], ref[0]);
    const dot0 = ref[0].dot(refEdge);
    const u0 = inc[0].dot(refEdge) - dot0;
    const u1 = inc[1].dot(refEdge) - dot0;

    if (u0 >= 0) clippedPoints.push(inc[0]);
    if (u1 >= 0) clippedPoints.push(inc[1]);
    if (u0 * u1 < 0.0) {
      const dir = Vec2.subtract(inc[1], inc[0]);
      const u = u0 / (u0 - u1);
      const point = dir.scale(u).add(inc[0]);

      clippedPoints.push(point);
    }

    if (clippedPoints.length > 1) {
      const temp = [clippedPoints[0], clippedPoints[1]];

      clippedPoints.length = 0;
      const flipRefEdge = Vec2.negate(refEdge);
      const dot1 = ref[1].dot(flipRefEdge);
      const t0 = temp[0].dot(flipRefEdge) - dot1;
      const t1 = temp[1].dot(flipRefEdge) - dot1;

      if (t0 >= 0) clippedPoints.push(temp[0]);
      if (t1 >= 0) clippedPoints.push(temp[1]);
      if (t0 * t1 < 0.0) {
        const dir = Vec2.subtract(temp[1], temp[0]);
        const t = t0 / (t0 - t1);
        const point = dir.scale(t).add(temp[0]);

        clippedPoints.push(point);
      }
    }

    const finalClippedPoints = [];
    const refNormal = refEdge.perp();
    const max = ref[2].dot(refNormal);

    for (let i = 0; i < clippedPoints.length; ++i) {
      const p = clippedPoints[i].dot(refNormal) - max;

      if (p >= 0) finalClippedPoints.push(clippedPoints[i]);
    }

    return finalClippedPoints;
  }

  // Circle Collision Detection = Done!
  static detectCircleToCircle(bodyA, bodyB, manifold) {
    const direction = Vec2.subtract(bodyB.position, bodyA.position);
    const distanceSq = direction.magnitudeSq();
    const radii = bodyA.radius + bodyB.radius;

    if (distanceSq === 0 || distanceSq > radii * radii) {
      manifold.collision = false;
      return manifold;
    }

    const distance = Math.sqrt(distanceSq);
    const normal = direction.scale(1 / distance);
    const overlapDepth = radii - distance;
    const contactPoint = Vec2.scale(normal, bodyA.radius).add(bodyA.position);

    manifold.collision = true;
    manifold.normal.copy(normal);
    manifold.overlapDepth = overlapDepth;
    manifold.contactPoints = [contactPoint];

    return manifold;
  }

  // Polygon Circle Collision Detection = Done!
  static detectPolygonToCircle(bodyA, bodyB, manifold) {
    const normal = new Vec2();
    let overlapDepth = Infinity;
    const direction = Vec2.subtract(bodyB.position, bodyA.position);
    const maxVertex = this._getMaxVertex(bodyA.vertices, direction);
    const axes = this._getAxes(bodyA.vertices, [
      Vec2.subtract(maxVertex, bodyB.position)
    ]);

    for (let i = 0; i < axes.length; ++i) {
      const axis = axes[i].normalize();
      const projA = this._projectPolygon(bodyA, axis);
      const projB = this._projectCircle(bodyB, axis);

      if (projA.min > projB.max || projB.min > projA.max) {
        manifold.collision = false;
        return manifold;
      }

      const axisDepth = Math.min(projA.max - projB.min, projB.max - projA.min);

      if (axisDepth < overlapDepth) {
        overlapDepth = axisDepth;
        normal.copy(axis);
      }
    }

    if (direction.dot(normal) < 0) {
      normal.negate();
    }

    const contactPoint = Vec2.add(bodyB.position, normal, -bodyB.radius);

    manifold.collision = true;
    manifold.normal.copy(normal);
    manifold.overlapDepth = overlapDepth;
    manifold.contactPoints = [contactPoint];

    return manifold;
  }

  // Polygon Collision Detection = Done!
  static detectPolygonToPolygon(bodyA, bodyB, manifold) {
    const normal = new Vec2();
    let overlapDepth = Infinity;
    const axes = this._getAxes(bodyB.vertices, this._getAxes(bodyA.vertices));

    for (let i = 0; i < axes.length; ++i) {
      const axis = axes[i].normalize();
      const projA = this._projectPolygon(bodyA, axis);
      const projB = this._projectPolygon(bodyB, axis);

      if (projA.min > projB.max || projB.min > projA.max) {
        manifold.collision = false;
        return manifold;
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

    const direction = Vec2.subtract(bodyB.position, bodyA.position);
    let flip = false;

    if (direction.dot(normal) < 0.0) {
      normal.negate();
      flip = true;
    }

    let ref = this._getContactEdge(bodyA.vertices, normal);
    let inc = this._getContactEdge(bodyB.vertices, Vec2.negate(normal));

    if (flip) {
      const temp = ref;

      ref = inc;
      inc = temp;
    }

    const clippedPoints = this._clipEdge(ref, inc);

    manifold.collision = true;
    manifold.normal = normal;
    manifold.overlapDepth = overlapDepth;
    manifold.contactPoints = clippedPoints;

    return manifold;
  }

  // ContactPoints creation is not very efficient
  static detectPolygonToCapsule(bodyA, bodyB, manifold) {
    const normal = new Vec2();
    let overlapDepth = Infinity;

    const direction = Vec2.subtract(bodyB.position, bodyA.position);
    const polygonMaxVertex = this._getMaxVertex(bodyA.vertices, direction);
    const segment = [bodyB.startPoint, bodyB.endPoint];
    const capsuleMaxVertex = this._getMaxVertex(
      segment,
      Vec2.negate(direction)
    );
    const axes = this._getAxes(bodyA.vertices, [
      Vec2.subtract(capsuleMaxVertex, polygonMaxVertex),
      Vec2.subtract(segment[1], segment[0]).perp()
    ]);

    for (let i = 0; i < axes.length; ++i) {
      const axis = axes[i].normalize();
      const projA = this._projectPolygon(bodyA, axis);
      const projB = this._projectCapsule(bodyB, axis);

      if (projA.min > projB.max || projB.min > projA.max) {
        manifold.collision = false;
        return manifold;
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

    if (direction.dot(normal) < 0) {
      normal.negate();
    }

    const contactPoints = [];
    let minDistanceSq = Infinity;
    const ref = this._getContactEdge(bodyA.vertices, normal);
    ref.pop();

    const _findContactPoints = (edgeA, edgeB) => {
      for (let i = 0; i < edgeA.length; ++i) {
        const vertexA = edgeA[i];
        const vertexB0 = edgeB[0];
        const vertexB1 = edgeB[1];

        const { point, distanceSq } = this._getPointInLineSegment(
          vertexB0,
          vertexB1,
          vertexA
        );

        if (Math.abs(distanceSq - minDistanceSq) < 1e-2) {
          if (!point.equal(contactPoints[0])) {
            contactPoints[1] = point;
          }
        } else if (distanceSq < minDistanceSq) {
          minDistanceSq = distanceSq;
          contactPoints[0] = point;
        }
      }
    };

    _findContactPoints(ref, segment);

    if (contactPoints.length < 2) {
      contactPoints[0].add(Vec2.scale(normal, -bodyB.radius));
    }

    if (contactPoints.length > 1) {
      contactPoints[0].add(Vec2.scale(normal, -bodyB.radius));
      contactPoints[1].add(Vec2.scale(normal, -bodyB.radius));
    }

    _findContactPoints(segment, ref);

    manifold.collision = true;
    manifold.normal = normal;
    manifold.overlapDepth = overlapDepth;
    manifold.contactPoints = contactPoints;

    return manifold;
  }

  // ContactPoints creation is not very efficient
  static detectCapsuleToCapsule(bodyA, bodyB, manifold) {
    const normal = new Vec2();
    let overlapDepth = Infinity;

    const segmentA = [bodyA.startPoint, bodyA.endPoint];
    const segmentB = [bodyB.startPoint, bodyB.endPoint];
    const direction = Vec2.subtract(bodyB.position, bodyA.position);
    const maxVertexA = this._getMaxVertex(segmentA, direction);
    const maxVertexB = this._getMaxVertex(segmentB, Vec2.negate(direction));

    const axes = [
      Vec2.subtract(maxVertexB, maxVertexA),
      Vec2.subtract(segmentA[1], segmentA[0]).perp(),
      Vec2.subtract(segmentB[1], segmentB[0]).perp()
    ];

    for (let i = 0; i < axes.length; ++i) {
      const axis = axes[i].normalize();
      const projA = this._projectCapsule(bodyA, axis);
      const projB = this._projectCapsule(bodyB, axis);

      if (projA.min > projB.max || projB.min > projA.max) {
        manifold.collision = false;
        return manifold;
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

    if (direction.dot(normal) < 0) {
      normal.negate();
    }

    const contactPoints = [];
    let minDistanceSq = Infinity;

    const _findContactPoints = (edgeA, edgeB, radius) => {
      for (let i = 0; i < edgeA.length; ++i) {
        const vertexA = edgeA[i];
        const vertexB0 = edgeB[0];
        const vertexB1 = edgeB[1];

        const { point, distanceSq } = this._getPointInLineSegment(
          vertexB0,
          vertexB1,
          vertexA
        );

        if (Math.abs(distanceSq - minDistanceSq) < 1e-2) {
          if (!point.equal(contactPoints[0])) {
            contactPoints[1] = point.add(normal, radius);
          }
        } else if (distanceSq < minDistanceSq) {
          minDistanceSq = distanceSq;
          contactPoints[0] = point.add(normal, radius);
        }
      }
    };

    _findContactPoints(segmentA, segmentB, -bodyB.radius);
    _findContactPoints(segmentB, segmentA, bodyA.radius);

    manifold.collision = true;
    manifold.normal.copy(normal);
    manifold.overlapDepth = overlapDepth;
    manifold.contactPoints = contactPoints;

    return manifold;
  }

  // Circle Capsule Collision Detection = Done!
  static detectCircleToCapsule(bodyA, bodyB, manifold) {
    const { point, distanceSq } = this._getPointInLineSegment(
      bodyB.startPoint,
      bodyB.endPoint,
      bodyA.position
    );
    const direction = Vec2.subtract(point, bodyA.position);
    const radii = bodyA.radius + bodyB.radius;

    if (distanceSq == 0 || distanceSq > radii * radii) {
      manifold.collision = false;
      return manifold;
    }

    const distance = Math.sqrt(distanceSq);
    const normal = direction.scale(1 / distance);
    const overlapDepth = radii - distance;
    const contactPoint = Vec2.add(bodyA.position, normal, bodyA.radius);

    manifold.collision = true;
    manifold.normal = normal;
    manifold.overlapDepth = overlapDepth;
    manifold.contactPoints = [contactPoint];

    return manifold;
  }
}
