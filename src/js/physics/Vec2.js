export class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x
    this.y = y
  }

  set(x, y) {
    this.x = x
    this.y = y
    return this
  }

  copy(vector, scalar = 1) {
    this.x = vector.x * scalar
    this.y = vector.y * scalar
    return this
  }

  clone() {
    return new Vec2(this.x, this.y)
  }

  zero() {
    this.x = 0
    this.y = 0
    return this
  }

  negate() {
    this.x *= -1
    this.y *= -1
    return this
  }

  random() {
    this.x = Math.random() - 0.5
    this.y = Math.random() - 0.5
    return this
  }

  perp() {
    return new Vec2(-this.y, this.x)
  }

  rotate(angle) {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    const x = this.x * cos - this.y * sin
    const y = this.x * sin + this.y * cos

    return new Vec2(x, y)
  }

  equal(vector) {
    const minDistance = 5e-4
    return Vec2.distanceSq(this, vector) <= minDistance * minDistance
  }

  string() {
    return `Vec2 { x: ${this.x}, y: ${this.y} }`
  }

  log() {
    console.log(this.string())
    return this
  }

  add(vector, scalar = 1) {
    this.x += vector.x * scalar
    this.y += vector.y * scalar
    return this
  }

  subtract(vector, scalar = 1) {
    this.x -= vector.x * scalar
    this.y -= vector.y * scalar
    return this
  }

  divide(vector, scalar = 1) {
    this.x /= vector.x * scalar
    this.y /= vector.y * scalar
    return this
  }

  multiply(vector, scalar = 1) {
    this.x *= vector.x * scalar
    this.y *= vector.y * scalar
    return this
  }

  scale(scalar = 1) {
    this.x *= scalar
    this.y *= scalar
    return this
  }

  dot(vector) {
    return this.x * vector.x + this.y * vector.y
  }

  cross(vector) {
    return this.x * vector.y - this.y * vector.x
  }

  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y)
  }

  magnitudeSq() {
    return this.x * this.x + this.y * this.y
  }

  normalize(length = 0) {
    length = length ? length : this.magnitude()

    if (length === 0) {
      return this.zero()
    } else {
      return this.scale(1 / length)
    }
  }

  // Static Method To Avoid Mutation
  static add(v1, v2) {
    return new Vec2(v1.x + v2.x, v1.y + v2.y)
  }

  static subtract(v1, v2) {
    return new Vec2(v1.x - v2.x, v1.y - v2.y)
  }

  static scale(vector, scalar) {
    return new Vec2(vector.x * scalar, vector.y * scalar)
  }

  static tripleProduct(v1, v2, v3) {
    const cross = v1.cross(v2)

    return new Vec2(-cross * v3.y, cross * v3.x)
  }

  static distance(v1, v2) {
    const dir = Vec2.subtract(v1, v2)

    return Math.sqrt(dir.x * dir.x + dir.y * dir.y)
  }

  static distanceSq(v1, v2) {
    const dir = Vec2.subtract(v1, v2)

    return dir.x * dir.x + dir.y * dir.y
  }

  static normalized(vector, length = 0) {
    length = length ? length : vector.magnitude()

    if (length === 0) {
      return new Vec2()
    } else {
      return Vec2.scale(vector, 1 / length)
    }
  }

  static perp(vector) {
    return new Vec2(-vector.y, vector.x)
  }

  static negate(vector) {
    return new Vec2(-vector.x, -vector.y)
  }
}
