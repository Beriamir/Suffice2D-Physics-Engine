export class Vertices {
  static area(vertices) {
    let area = 0

    for (let i = 0; i < vertices.length; ++i) {
      const currPoint = vertices[i]
      const nextPoint = vertices[(i + 1) % vertices.length]

      area += currPoint.cross(nextPoint)
    }

    return Math.abs(area) * 0.5
  }

  static inertia(vertices, mass) {
    const centroid = this.mean(vertices)
    const newVertices = vertices.map(vertex =>
      vertex.clone().subtract(centroid)
    )
    let numerator = 0
    let denominator = 0

    for (let i = 0; i < newVertices.length; ++i) {
      const currPoint = newVertices[i]
      const nextPoint = newVertices[(i + 1) % newVertices.length]

      const cross = currPoint.cross(nextPoint)

      numerator +=
        cross *
        (currPoint.dot(currPoint) +
          currPoint.dot(nextPoint) +
          nextPoint.dot(nextPoint))
      denominator += cross
    }

    return (mass / 6) * (numerator / denominator)
  }

  static centroid(vertices) {
    let area = 0
    let cX = 0
    let cY = 0

    for (let i = 0; i < vertices.length; ++i) {
      const currPoint = vertices[i]
      const nextPoint = vertices[(i + 1) % vertices.length]

      const cross = currPoint.x * nextPoint.y - currPoint.y * nextPoint.x

      cX += (currPoint.x + nextPoint.x) * cross
      cY += (currPoint.y + nextPoint.y) * cross
      area += cross
    }

    area *= 0.5
    cX *= 1 / (6 * area)
    cY *= 1 / (6 * area)

    return { x: cX, y: cY }
  }

  static mean(vertices) {
    let sumX = 0
    let sumY = 0
    const n = vertices.length

    for (let i = 0; i < n; ++i) {
      sumX += vertices[i].x
      sumY += vertices[i].y
    }

    return { x: sumX / n, y: sumY / n }
  }

  static isConvex(vertices) {
    if (vertices.length < 4) {
      return true
    }

    for (let i = 0; i < vertices.length; ++i) {
      const prevPoint = vertices[(i - 1 + vertices.length) % vertices.length]
      const currPoint = vertices[i]
      const nextPoint = vertices[(i + 1) % vertices.length]

      const toNext = {
        x: nextPoint.x - currPoint.x,
        y: nextPoint.y - currPoint.y
      }
      const toPrev = {
        x: currPoint.x - prevPoint.x,
        y: currPoint.y - prevPoint.y
      }

      const crossProduct = toPrev.x * toNext.y - toPrev.y * toNext.x

      if (crossProduct < 0) {
        return false
      }
    }

    return true
  }
}
