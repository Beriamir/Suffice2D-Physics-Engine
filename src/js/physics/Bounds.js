export class Bounds {
  static getBound(body) {
    let min = [Infinity, Infinity];
    let max = [-Infinity, -Infinity];

    if (body.label === 'circle') {
      min[0] = body.position.x - body.radius;
      min[1] = body.position.y - body.radius;
      max[0] = body.position.x + body.radius;
      max[1] = body.position.y + body.radius;
    } else if (body.label === 'rectangle' || body.label === 'polygon') {
      for (let i = 0; i < body.vertices.length; i++) {
        const p1 = body.vertices[i];

        if (p1.x < min[0]) min[0] = p1.x;
        if (p1.y < min[1]) min[1] = p1.y;
        if (p1.x > max[0]) max[0] = p1.x;
        if (p1.y > max[1]) max[1] = p1.y;
      }
    } else if (body.label === 'pill') {
      for (let i = 0; i < body.vertices.length; i++) {
        const p1 = body.vertices[i];

        if (p1.x - body.radius < min[0]) min[0] = p1.x - body.radius;
        if (p1.y - body.radius < min[1]) min[1] = p1.y - body.radius;
        if (p1.x + body.radius > max[0]) max[0] = p1.x + body.radius;
        if (p1.y + body.radius > max[1]) max[1] = p1.y + body.radius;
      }
    }

    return {
      min,
      max,
      width: max[0] - min[0],
      height: max[1] - min[1]
    };
  }

  static contains(bounds, point) {
    return (
      point.x >= bounds.min[0] &&
      point.x <= bounds.max[0] &&
      point.y >= bounds.min[1] &&
      point.y <= bounds.max[1]
    );
  }

  static overlaps(boundsA, boundsB) {
    return (
      boundsA.min[0] <= boundsB.max[0] &&
      boundsA.max[0] >= boundsB.min[0] &&
      boundsA.max[1] >= boundsB.min[1] &&
      boundsA.min[1] <= boundsB.max[1]
    );
  }
}
