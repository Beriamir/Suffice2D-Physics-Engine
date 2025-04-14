import { Vec2 } from './Vec2.js';

export class Vertices {
  static area(vertices) {
    let area = 0;

    for (let i = 0; i < vertices.length; ++i) {
      const currPoint = vertices[i];
      const nextPoint = vertices[(i + 1) % vertices.length];

      area += currPoint.cross(nextPoint);
    }

    return Math.abs(area) * 0.5;
  }

  static inertia(vertices, mass) {
    let numerator = 0;
    let denominator = 0;
    const centroid = this.centroid(vertices);
    const newVertices = vertices.map(vertex =>
      vertex.clone().subtract(centroid)
    );

    for (let i = 0; i < newVertices.length; ++i) {
      const currPoint = newVertices[i];
      const nextPoint = newVertices[(i + 1) % newVertices.length];
      const cross = currPoint.cross(nextPoint);

      numerator +=
        cross *
        (currPoint.dot(currPoint) +
          currPoint.dot(nextPoint) +
          nextPoint.dot(nextPoint));
      denominator += cross;
    }

    return (mass / 6) * (numerator / denominator);
  }

  static centroid(vertices) {
    let area = 0;
    let centroidX = 0;
    let centroidY = 0;

    for (let i = 0; i < vertices.length; ++i) {
      const currPoint = vertices[i];
      const nextPoint = vertices[(i + 1) % vertices.length];

      const cross = currPoint.x * nextPoint.y - currPoint.y * nextPoint.x;

      centroidX += (currPoint.x + nextPoint.x) * cross;
      centroidY += (currPoint.y + nextPoint.y) * cross;
      area += cross;
    }

    area *= 0.5;
    centroidX *= 1 / (6 * area);
    centroidY *= 1 / (6 * area);

    return { x: centroidX, y: centroidY };
  }

  static mean(vertices) {
    let sumX = 0;
    let sumY = 0;
    const n = vertices.length;

    for (let i = 0; i < n; ++i) {
      sumX += vertices[i].x;
      sumY += vertices[i].y;
    }

    return { x: sumX / n, y: sumY / n };
  }

  static isConvex(vertices) {
    if (vertices.length < 4) {
      return true;
    }

    for (let i = 0; i < vertices.length; ++i) {
      const prevPoint = vertices[(i - 1 + vertices.length) % vertices.length];
      const currPoint = vertices[i];
      const nextPoint = vertices[(i + 1) % vertices.length];

      const toNext = {
        x: nextPoint.x - currPoint.x,
        y: nextPoint.y - currPoint.y
      };
      const toPrev = {
        x: currPoint.x - prevPoint.x,
        y: currPoint.y - prevPoint.y
      };

      const crossProduct = toPrev.x * toNext.y - toPrev.y * toNext.x;

      if (crossProduct < 0) {
        return false;
      }
    }

    return true;
  }

  static hull(points) {
    if (points.length < 3) return points;

    const vertices = points.map(point => point.clone());

    vertices.sort((a, b) => {
      if (a.x == b.x) {
        return a.y - b.y;
      }

      return a.x - b.x;
    });

    const lower = [];
    for (let i = 0; i < vertices.length; ++i) {
      while (
        lower.length >= 2 &&
        Vec2.cross3(
          lower[lower.length - 2],
          lower[lower.length - 1],
          vertices[i]
        ) <= 0
      ) {
        lower.pop();
      }
      lower.push(vertices[i]);
    }

    const upper = [];
    for (let i = vertices.length - 1; i >= 0; --i) {
      while (
        upper.length >= 2 &&
        Vec2.cross3(
          upper[upper.length - 2],
          upper[upper.length - 1],
          vertices[i]
        ) <= 0
      ) {
        upper.pop();
      }
      upper.push(vertices[i]);
    }

    lower.pop();
    upper.pop();

    return lower.concat(upper);
  }

  static chamfer(vertices, radius, quality, qualityMin, qualityMax) {
    if (radius && typeof radius == 'number') {
      radius = [radius];
    } else radius = radius || [8];

    quality = quality || -1;
    qualityMin = qualityMin || 2;
    qualityMax = qualityMax || 14;

    const newVertices = [];
    const n = vertices.length;

    for (var i = 0; i < n; i++) {
      const prevPoint = vertices[(i - 1 + n) % n];
      const currPoint = vertices[i];
      const nextPoint = vertices[(i + 1) % n];
      const currRadius = radius[i > radius.length - 1 ? radius.length - 1 : i];

      if (currRadius == 0) {
        newVertices.push(currPoint);
        continue;
      }

      const prevNormal = Vec2.subtract(currPoint, prevPoint)
        .perp(-1)
        .normalize();
      const nextNormal = Vec2.subtract(nextPoint, currPoint)
        .perp(-1)
        .normalize();
      const diagonalRadius = Math.sqrt(2 * Math.pow(currRadius, 2));
      const radiusVector = prevNormal.clone().scale(currRadius);
      const midNormal = Vec2.add(prevNormal, nextNormal).scale(0.5).normalize();
      const scaledVertex = Vec2.subtract(
        currPoint,
        Vec2.scale(midNormal, diagonalRadius)
      );

      let precision = quality;

      if (quality == -1) {
        precision = Math.pow(currRadius, 0.32) * 1.75;
      }

      precision = Math.max(qualityMin, Math.min(qualityMax, precision));

      if (precision % 2 == 1) precision++;

      const alpha = Math.acos(prevNormal.dot(nextNormal));
      const theta = alpha / precision;

      for (var j = 0; j < precision; j++) {
        newVertices.push(radiusVector.rotate(theta * j).add(scaledVertex));
      }
    }

    return newVertices;
  }
}
