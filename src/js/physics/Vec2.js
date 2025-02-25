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

  copy(v, s = 1) {
    this.x = v.x * s
    this.y = v.y * s
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

  perp(signed = 1) {
    return new Vec2(-this.y * signed, this.x * signed)
  }

  rotate(angle) {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    return new Vec2(this.x * cos - this.y * sin, this.x * sin + this.y * cos)
  }

  equal(v) {
    return Vec2.distanceSq(this, v) <= 5e-4 * 5e-4
  }

  string() {
    return `Vec2 { x: ${this.x}, y: ${this.y} }`
  }

  log() {
    console.log(this.string())
  }

  add(v, s = 1) {
    this.x += v.x * s
    this.y += v.y * s
    return this
  }

  subtract(v, s = 1) {
    this.x -= v.x * s
    this.y -= v.y * s
    return this
  }

  divide(v, s = 1) {
    this.x /= v.x * s
    this.y /= v.y * s
    return this
  }

  multiply(v, s = 1) {
    this.x *= v.x * s
    this.y *= v.y * s
    return this
  }

  scale(s = 1) {
    this.x *= s
    this.y *= s
    return this
  }

  dot(v) {
    return this.x * v.x + this.y * v.y
  }

  cross(v) {
    return this.x * v.y - this.y * v.x
  }

  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y)
  }

  magnitudeSq() {
    return this.x * this.x + this.y * this.y
  }

  normalize(length = 0) {
    length = length ? length : this.magnitude()

    if (length === 0) return this.zero()
    else return this.scale(1 / length)
  }

  static add(v1, v2) {
    return new Vec2(v1.x + v2.x, v1.y + v2.y)
  }

  static subtract(v1, v2) {
    return new Vec2(v1.x - v2.x, v1.y - v2.y)
  }

  static scale(v, s) {
    return new Vec2(v.x * s, v.y * s)
  }

  static vectorTripleProduct(v1, v2, v3) {
    return Vec2.subtract(Vec2.scale(v2, v1.dot(v3)), Vec2.scale(v1, v3.dot(v2)))
  }

  static cross3(v1, v2, v3) {
    return (v2.x - v1.x) * (v3.y - v1.y) - (v2.y - v1.y) * (v3.x - v1.x)
  }

  static distance(v1, v2) {
    const dir = Vec2.subtract(v1, v2)

    return Math.sqrt(dir.x ** 2 + dir.y ** 2)
  }

  static distanceSq(v1, v2) {
    const dir = Vec2.subtract(v1, v2)

    return dir.x ** 2 + dir.y ** 2
  }

  static normalized(v, length = 0) {
    length = length ? length : vector.magnitude()

    if (length === 0) return new Vec2()
    else return Vec2.scale(v, 1 / length)
  }

  static perp(v) {
    return new Vec2(-v.y, v.x)
  }

  static negate(v) {
    return new Vec2(-v.x, -v.y)
  }
}
