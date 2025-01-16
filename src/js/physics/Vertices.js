export class Vertices {
  static area(vertices) {
    let area = 0;

    for (let i = 0; i < vertices.length; i++) {
      const p1 = vertices[i];
      const p2 = vertices[(i + 1) % vertices.length];

      area += p1.cross(p2);
    }

    return Math.abs(area) * 0.5;
  }

  static inertia(vertices, mass) {
    const centroid = Vertices.centroid(vertices);
    const newVertices = vertices.map(vertex =>
      vertex.clone().subtract(centroid)
    );
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < newVertices.length; i++) {
      const p1 = newVertices[i];
      const p2 = newVertices[(i + 1) % newVertices.length];
      const cross = p1.cross(p2);

      numerator += cross * (p1.dot(p1) + p1.dot(p2) + p2.dot(p2));
      denominator += cross;
    }

    return (mass / 6) * (numerator / denominator);
  }

  static centroid(vertices) {
    let area = 0;
    let cX = 0;
    let cY = 0;

    for (let i = 0; i < vertices.length; i++) {
      const p1 = vertices[i];
      const p2 = vertices[(i + 1) % vertices.length];

      const cross = p1.x * p2.y - p1.y * p2.x;

      cX += (p1.x + p2.x) * cross;
      cY += (p1.y + p2.y) * cross;
      area += cross;
    }

    area *= 0.5;
    cX *= 1 / (6 * area);
    cY *= 1 / (6 * area);

    return { x: cX, y: cY };
  }

  static mean(vertices) {
    let sumX = 0;
    let sumY = 0;
    const count = vertices.length;

    for (let i = 0; i < count; i++) {
      sumX += vertices[i].x;
      sumY += vertices[i].y;
    }

    return { x: sumX / count, y: sumY / count };
  }
}
