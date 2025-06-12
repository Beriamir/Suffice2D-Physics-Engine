import { Vec2 } from './Vec2.js';
import { Manifold } from './Manifold.js';

export class Collision {
  static _getPointInLineSegment(segment, vertex) {
    const ab = Vec2.sub(segment[1], segment[0]);
    const ap = Vec2.sub(vertex, segment[0]);
    const abLengthSq = ab.magnitudeSq();
    const projection = ap.dot(ab) / abLengthSq;
    const point = Vec2.add(segment[0], ab, projection);

    if (projection < 0) {
      point.copy(segment[0]);
    } else if (projection > 1) {
      point.copy(segment[1]);
    }

    return [point, Vec2.distanceSq(vertex, point)];
  }

  static _getAxes(vertices, axes = []) {
    const n = vertices.length;

    for (let i = 0; i < n; ++i) {
      const vertexA = vertices[i];
      const vertexB = vertices[i + 1 > n - 1 ? 0 : i + 1];
      const edgeNormal = Vec2.sub(vertexB, vertexA).leftPerp();

      axes.push(edgeNormal);
    }

    return axes;
  }

  static _getMaxVertex(vertices, normal) {
    let bestIndex = -1;
    let bestProjection = -Infinity;

    for (let i = 0; i < vertices.length; ++i) {
      const projection = vertices[i].dot(normal);

      if (projection > bestProjection) {
        bestProjection = projection;
        bestIndex = i;
      }
    }

    return vertices[bestIndex];
  }

  static _projectCircle(body, axis) {
    const projection = body.position.dot(axis);
    const radius = body.radius;

    return [projection - radius, projection + radius];
  }

  static _projectCapsule(body, axis) {
    const proj1 = body.center1.dot(axis);
    const proj2 = body.center2.dot(axis);

    let min = proj1 < proj2 ? proj1 : proj2;
    let max = proj1 > proj2 ? proj1 : proj2;

    return [min - body.radius, max + body.radius];
  }

  static _projectPolygon(body, axis) {
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < body.vertices.length; ++i) {
      const projection = body.vertices[i].dot(axis);

      if (projection < min) min = projection;
      if (projection > max) max = projection;
    }

    return [min, max];
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

    const prevEdge = Vec2.sub(bestVertex, prevVertex);
    const nextEdge = Vec2.sub(bestVertex, nextVertex);

    if (prevEdge.dot(normal) <= nextEdge.dot(normal)) {
      return [prevVertex, bestVertex];
    } else {
      return [bestVertex, nextVertex];
    }
  }

  // Circle Collision Detection = Done!
  static detectCircleToCircle(bodyA, bodyB) {
    const dir = Vec2.sub(bodyB.position, bodyA.position);
    const distanceSq = dir.magnitudeSq();
    const radii = bodyA.radius + bodyB.radius;

    if (distanceSq == 0 || distanceSq >= radii * radii) {
      return false;
    }

    const distance = Math.sqrt(distanceSq);
    const normal = dir.scale(1 / distance);
    const overlapDepth = radii - distance;
    const contactPoint = Vec2.add(
      bodyA.position,
      normal,
      bodyA.radius - overlapDepth * 0.5
    );

    return new Manifold(true, normal, overlapDepth, [contactPoint]);
  }

  // Polygon Circle Collision Detection = Done!
  static detectPolygonToCircle(bodyA, bodyB, manifold) {
    const dir = Vec2.sub(bodyB.position, bodyA.position);
    const maxVertex = this._getMaxVertex(bodyA.vertices, dir);
    const axes = this._getAxes(bodyA.vertices, [
      Vec2.sub(maxVertex, bodyB.position)
    ]);

    let normal = new Vec2();
    let overlapDepth = Infinity;

    for (let i = 0; i < axes.length; ++i) {
      const axis = axes[i].normalize();
      const projA = this._projectPolygon(bodyA, axis);
      const projB = this._projectCircle(bodyB, axis);

      if (projA[0] > projB[1] || projB[0] > projA[1]) {
        return false;
      }

      const axisOverlapDepth = Math.min(
        projA[1] - projB[0],
        projB[1] - projA[0]
      );

      if (axisOverlapDepth < overlapDepth) {
        overlapDepth = axisOverlapDepth;
        normal = axis;
      }
    }

    if (dir.dot(normal) < 0) {
      normal.negate();
    }

    const contactPoint = Vec2.add(
      bodyB.position,
      normal,
      overlapDepth - bodyB.radius
    );

    return new Manifold(true, normal, overlapDepth, [contactPoint]);
  }

  // Polygon Collision Detection = Done!
  static detectPolygonToPolygon(bodyA, bodyB, manifold) {
    const axes = this._getAxes(bodyB.vertices, this._getAxes(bodyA.vertices));
    let normal = null;
    let overlapDepth = Infinity;

    for (let i = 0; i < axes.length; ++i) {
      const axis = axes[i].normalize();
      const projA = this._projectPolygon(bodyA, axis);
      const projB = this._projectPolygon(bodyB, axis);

      if (projA[0] > projB[1] || projB[0] > projA[1]) {
        return false;
      }

      const axisOverlapDepth = Math.min(
        projA[1] - projB[0],
        projB[1] - projA[0]
      );

      if (axisOverlapDepth < overlapDepth) {
        overlapDepth = axisOverlapDepth;
        normal = axis;
      }
    }

    const dir = Vec2.sub(bodyB.position, bodyA.position);
    let flip = false;

    if (dir.dot(normal) < 0.0) {
      normal.negate();
      flip = true;
    }

    let ref = this._getContactEdge(bodyA.vertices, normal);
    let inc = this._getContactEdge(bodyB.vertices, Vec2.negate(normal));

    if (flip) {
      const tmp = ref;

      ref = inc;
      inc = tmp;
    }

    // Sutherland–Hodgman clipping algorithm
    const clippedPoints = [];
    const refEdge = Vec2.sub(ref[1], ref[0]);
    const dot0 = ref[0].dot(refEdge);
    const u0 = inc[0].dot(refEdge) - dot0;
    const u1 = inc[1].dot(refEdge) - dot0;

    if (u0 >= 0) clippedPoints.push(inc[0]);
    if (u1 >= 0) clippedPoints.push(inc[1]);
    if (u0 * u1 < 0.0) {
      const dir = Vec2.sub(inc[1], inc[0]);
      const u = u0 / (u0 - u1);
      const point = Vec2.add(inc[0], dir, u);

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
        const dir = Vec2.sub(temp[1], temp[0]);
        const t = t0 / (t0 - t1);
        const point = Vec2.add(temp[0], dir, t);

        clippedPoints.push(point);
      }
    }

    const finalClippedPoints = [];
    const refNormal = refEdge.rightPerp();
    const max = ref[0].dot(refNormal);

    for (let i = 0; i < clippedPoints.length; ++i) {
      const p = clippedPoints[i].dot(refNormal) - max;

      if (p <= 0) finalClippedPoints.push(clippedPoints[i]);
    }

    return new Manifold(true, normal, overlapDepth, finalClippedPoints);
  }

  // ContactPoints creation is not very efficient
  static detectPolygonToCapsule(bodyA, bodyB, manifold) {
    const dir = Vec2.sub(bodyB.position, bodyA.position);
    const polygonMaxVertex = this._getMaxVertex(bodyA.vertices, dir);
    const segment = [bodyB.center1, bodyB.center2];
    const capsuleMaxVertex = this._getMaxVertex(segment, Vec2.negate(dir));
    const axes = this._getAxes(bodyA.vertices, [
      Vec2.sub(capsuleMaxVertex, polygonMaxVertex),
      Vec2.sub(segment[1], segment[0]).leftPerp()
    ]);

    let normal = null;
    let overlapDepth = Infinity;

    for (let i = 0; i < axes.length; ++i) {
      const axis = axes[i].normalize();
      const projA = this._projectPolygon(bodyA, axis);
      const projB = this._projectCapsule(bodyB, axis);

      if (projA[0] > projB[1] || projB[0] > projA[1]) {
        return false;
      }

      const axisOverlapDepth = Math.min(
        projA[1] - projB[0],
        projB[1] - projA[0]
      );

      if (axisOverlapDepth < overlapDepth) {
        overlapDepth = axisOverlapDepth;
        normal = axis;
      }
    }

    if (dir.dot(normal) < 0) {
      normal.negate();
    }

    const ref = this._getContactEdge(bodyA.vertices, normal);
    const contactPoints = [];
    let minDistanceSq = Infinity;

    const _findContactPoints = (edgeA, edgeB) => {
      for (let i = 0; i < edgeA.length; ++i) {
        const vertexA = edgeA[i];
        const vertexB0 = edgeB[0];
        const vertexB1 = edgeB[1];

        const [point, distanceSq] = this._getPointInLineSegment(
          [vertexB0, vertexB1],
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

    return new Manifold(true, normal, overlapDepth, contactPoints);
  }

  // ContactPoints creation is poorly implemented
  static detectCapsuleToCapsule(bodyA, bodyB, manifold) {
    const segmentA = [bodyA.center1, bodyA.center2];
    const segmentB = [bodyB.center1, bodyB.center2];
    const dir = Vec2.sub(bodyB.position, bodyA.position);
    const maxVertexA = this._getMaxVertex(segmentA, dir);
    const maxVertexB = this._getMaxVertex(segmentB, Vec2.negate(dir));

    const axes = [
      Vec2.sub(maxVertexB, maxVertexA),
      Vec2.sub(segmentA[1], segmentA[0]).leftPerp(),
      Vec2.sub(segmentB[1], segmentB[0]).leftPerp()
    ];

    let normal = new Vec2();
    let overlapDepth = Infinity;

    for (let i = 0; i < axes.length; ++i) {
      const axis = axes[i].normalize();
      const projA = this._projectCapsule(bodyA, axis);
      const projB = this._projectCapsule(bodyB, axis);

      if (projA[0] > projB[1] || projB[0] > projA[1]) {
        return false;
      }

      const axisOverlapDepth = Math.min(
        projA[1] - projB[0],
        projB[1] - projA[0]
      );

      if (axisOverlapDepth < overlapDepth) {
        overlapDepth = axisOverlapDepth;
        normal = axis;
      }
    }

    if (dir.dot(normal) < 0) {
      normal.negate();
    }

    const contactPoints = [];
    let minDistanceSq = Infinity;

    const _findContactPoints = (edgeA, edgeB, radius) => {
      for (let i = 0; i < edgeA.length; ++i) {
        const vertexA = edgeA[i];
        const vertexB0 = edgeB[0];
        const vertexB1 = edgeB[1];

        const [point, distanceSq] = this._getPointInLineSegment(
          [vertexB0, vertexB1],
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

    return new Manifold(true, normal, overlapDepth, contactPoints);
  }

  // Circle Capsule Collision Detection = Done!
  static detectCircleToCapsule(bodyA, bodyB, manifold) {
    const [point, distanceSq] = this._getPointInLineSegment(
      [bodyB.center1, bodyB.center2],
      bodyA.position
    );
    const dir = Vec2.sub(point, bodyA.position);
    const radii = bodyA.radius + bodyB.radius;

    if (distanceSq == 0 || distanceSq >= radii * radii) {
      return false;
    }

    const distance = Math.sqrt(distanceSq);
    const normal = dir.scale(1 / distance);
    const overlapDepth = radii - distance;
    const contactPoint = Vec2.add(
      bodyA.position,
      normal,
      bodyA.radius - overlapDepth * 0.5
    );

    return new Manifold(true, normal, overlapDepth, [contactPoint]);
  }
}
