import { Vertices } from './Vertices.js'
import { Vec2 } from './Vec2.js'
import { Bounds } from './Bounds.js'

export class Body {
  constructor(properties, option = {}) {
    for (const property in properties) {
      const value = properties[property]

      switch (property) {
        case 'label':
          this.label = value
          break
        case 'type':
          this.type = value
          break
        case 'position':
          this.position = value
          break
        case 'axisPoint':
          this.axisPoint = value
          break
        case 'startPoint':
          this.startPoint = value
          break
        case 'endPoint':
          this.endPoint = value
          break
        case 'vertices':
          this.vertices = value
          break
        case 'radius':
          this.radius = value
          break
        case 'width':
          this.width = value
          break
        case 'height':
          this.height = value
          break
      }
    }

    this.prevPosition = new Vec2().copy(this.position)
    this.allVertices = []

    if (this.axisPoint) this.allVertices.push(this.axisPoint)
    if (this.startPoint) this.allVertices.push(this.startPoint)
    if (this.endPoint) this.allVertices.push(this.endPoint)
    if (this.vertices) this.allVertices.push(...this.vertices)

    this.velocity = new Vec2().copy(option.velocity || { x: 0, y: 0 })
    this.angularVelocity = option.angularVelocity || 0
    this.friction = option.friction || { static: 0.61, kinetic: 0.47 }
    this.restitution = option.restitution || 0.9
    this.density = option.density || 2700
    this.thickness = option.thickness || 0.01

    // Area
    if (this.label == 'circle') {
      this.area = this.radius * this.radius * Math.PI
    } else if (this.label == 'rectangle' || this.label == 'polygon') {
      this.area = Vertices.area(this.vertices)
    } else if (this.label == 'pill') {
      this.area =
        this.radius * this.radius * Math.PI + Vertices.area(this.vertices)
    }

    this.mass = this.density * this.area * this.thickness

    // Inertia
    switch (this.label) {
      case 'circle':
        this.inertia = (1 / 2) * this.mass * this.radius ** 2
        break

      case 'rectangle':
        this.inertia =
          (1 / 12) * this.mass * (this.width ** 2 + this.height ** 2)
        break

      case 'polygon':
        if (this.vertices.length < 4) {
          this.inertia =
            (1 / 18) *
            this.mass *
            ((this.radius * 2) ** 2 + (this.radius * 2) ** 2)
        } else if (this.vertices.length == 4) {
          this.inertia =
            (1 / 12) *
            this.mass *
            ((this.radius * 2) ** 2 + (this.radius * 2) ** 2)
        } else {
          this.inertia = Vertices.inertia(this.vertices, this.mass)
        }
        break

      case 'pill':
        const rectInertia =
          (1 / 12) *
          this.density *
          Vertices.area(this.vertices) *
          this.thickness *
          ((this.radius * 2) ** 2 + this.height ** 2)
        const semiMass =
          (this.density * Math.PI * this.radius ** 2 * this.thickness) / 2
        const semiInertia = (1 / 8) * semiMass * this.radius ** 2
        const semiTotalInertia = semiInertia + semiMass * this.radius ** 2

        this.inertia = rectInertia + 2 * semiTotalInertia

        break
    }

    this.inverseMass = 1 / this.mass
    this.inverseInertia = 1 / this.inertia

    this.wireframe =
      option.wireframe == undefined
        ? true
        : typeof option.wireframe != 'boolean'
        ? true
        : option.wireframe

    this.rotation =
      option.rotation == undefined
        ? true
        : typeof option.rotation != 'boolean'
        ? true
        : option.rotation
    this.isStatic = option.isStatic || false

    if (this.isStatic) {
      this.inverseMass = 0
    }

    if (!this.rotation) {
      this.inverseInertia = 0
    }

    this.color =
      option.color ||
      `hsl(${Math.random() * 360}, 100%, ${Math.random() * 20 + 30}%)`
  }

  updateVertices() {
    const direction = Vec2.subtract(this.position, this.prevPosition)

    if (direction.x == 0 && direction.y == 0) return null

    this.allVertices.forEach(point => point.add(direction))
    this.prevPosition.copy(this.position)
  }

  rotate(angle) {
    this.allVertices.forEach(point => {
      const translated = Vec2.subtract(point, this.position)
      const rotated = translated.rotate(angle)

      point.copy(rotated.add(this.position))
    })
  }

  getBound() {
    return Bounds.getBound(this)
  }

  render(ctx) {
    if (this.label == 'circle') {
      ctx.beginPath()
      ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2)
    } else if (this.label == 'polygon' || this.label == 'rectangle') {
      ctx.beginPath()
      ctx.moveTo(this.vertices[0].x, this.vertices[0].y)
      for (let i = 1; i < this.vertices.length; i++)
        ctx.lineTo(this.vertices[i].x, this.vertices[i].y)
      ctx.closePath()
    } else if (this.label == 'pill') {
      const startDirP1 = Vec2.subtract(this.vertices[0], this.startPoint)
      const startDirP2 = Vec2.subtract(this.vertices[2], this.endPoint)
      const endDirP1 = Vec2.subtract(this.vertices[1], this.startPoint)
      const endDirP2 = Vec2.subtract(this.vertices[3], this.endPoint)

      const startAngleP1 = Math.atan2(startDirP1.y, startDirP1.x)
      const startAngleP2 = Math.atan2(startDirP2.y, startDirP2.x)
      const endAngleP1 = Math.atan2(endDirP1.y, endDirP1.x)
      const endAngleP2 = Math.atan2(endDirP2.y, endDirP2.x)

      ctx.beginPath()
      ctx.arc(
        this.startPoint.x,
        this.startPoint.y,
        this.radius,
        startAngleP1,
        endAngleP1
      )
      ctx.arc(
        this.endPoint.x,
        this.endPoint.y,
        this.radius,
        startAngleP2,
        endAngleP2
      )
      ctx.closePath()
    }

    if (this.axisPoint) {
      ctx.moveTo(this.position.x, this.position.y)
      ctx.lineTo(this.axisPoint.x, this.axisPoint.y)
    } else {
      ctx.moveTo(this.startPoint.x, this.startPoint.y)
      ctx.lineTo(this.endPoint.x, this.endPoint.y)
    }

    if (!this.wireframe) {
      ctx.fillStyle = this.color
      ctx.fill()
      // ctx.strokeStyle = '#ffffffc0';
      // ctx.stroke();
    } else {
      ctx.strokeStyle = '#ffffffc0'
      ctx.stroke()
    }
  }
}
