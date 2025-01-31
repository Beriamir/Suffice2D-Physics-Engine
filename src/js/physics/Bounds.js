import { Vec2 } from './Vec2.js'

export class Bounds {
  static getBound(body) {
    const min = new Vec2(Infinity, Infinity)
    const max = new Vec2(-Infinity, -Infinity)

    if (body.label == 'circle') {
      min.x = body.position.x - body.radius
      min.y = body.position.y - body.radius
      max.x = body.position.x + body.radius
      max.y = body.position.y + body.radius
    } else if (body.label == 'rectangle' || body.label == 'polygon') {
      for (let i = 0; i < body.vertices.length; ++i) {
        const p1 = body.vertices[i]

        min.x = Math.min(p1.x, min.x)
        min.y = Math.min(p1.y, min.y)
        max.x = Math.max(p1.x, max.x)
        max.y = Math.max(p1.y, max.y)
      }
    } else if (body.label == 'pill') {
      for (let i = 0; i < body.vertices.length; ++i) {
        const p1 = body.vertices[i]

        min.x = Math.min(p1.x - body.radius, min.x)
        min.y = Math.min(p1.y - body.radius, min.y)
        max.x = Math.max(p1.x + body.radius, max.x)
        max.y = Math.max(p1.y + body.radius, max.y)
      }
    }

    return {
      min,
      max,
      width: Math.abs(max.x - min.x),
      height: Math.abs(max.y - min.y)
    }
  }

  static contains(bounds, point) {
    return (
      point.x >= bounds.min.x &&
      point.x <= bounds.max.x &&
      point.y >= bounds.min.y &&
      point.y <= bounds.max.y
    )
  }

  static overlaps(boundsA, boundsB) {
    return (
      boundsA.min.x <= boundsB.max.x &&
      boundsA.max.x >= boundsB.min.x &&
      boundsA.max.y >= boundsB.min.y &&
      boundsA.min.y <= boundsB.max.y
    )
  }
}
