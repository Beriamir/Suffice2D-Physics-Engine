import { Vertices } from './Vertices.js';
import { Vector2 } from './Vector2.js';
import { Bounds } from './Bounds.js';

export class Body {
  constructor(properties, option = {}) {
    for (const property in properties) {
      const value = properties[property];

      switch (property) {
        case 'label':
          this.label = value;
          break;
        case 'type':
          this.type = value;
          break;
        case 'position':
          this.position = value;
          break;
        case 'axisPoint':
          this.axisPoint = value;
          break;
        case 'startPoint':
          this.startPoint = value;
          break;
        case 'endPoint':
          this.endPoint = value;
          break;
        case 'vertices':
          this.vertices = value;
          break;
        case 'radius':
          this.radius = value;
          break;
        case 'width':
          this.width = value;
          break;
        case 'height':
          this.height = value;
          break;
      }
    }

    this.prevPosition = new Vector2().copy(this.position);
    this.allVertices = [];

    if (this.axisPoint) this.allVertices.push(this.axisPoint);
    if (this.startPoint) this.allVertices.push(this.startPoint);
    if (this.endPoint) this.allVertices.push(this.endPoint);
    if (this.vertices) this.allVertices.push(...this.vertices);

    this.velocity = new Vector2().copy(option.velocity || { x: 0, y: 0 });
    this.angularVelocity = option.angularVelocity || 0;
    this.friction = option.friction || { static: 0.61, dynamic: 0.47 };
    this.restitution = option.restitution || 0.9;
    this.density = option.density || 2700;
    this.thickness = option.thickness || 0.01;

    // Area
    if (this.label === 'circle') {
      this.area = this.radius * this.radius * Math.PI;
    } else if (this.label === 'rectangle' || this.label === 'polygon') {
      this.area = Vertices.area(this.vertices);
    } else if (this.label === 'pill') {
      this.area =
        this.radius * this.radius * Math.PI + Vertices.area(this.vertices);
    }

    this.mass = this.density * this.area * this.thickness;

    // Inertia
    switch (this.label) {
      case 'circle':
        this.inertia = (1 / 2) * this.mass * this.radius ** 2;
        break;

      case 'rectangle':
        this.inertia =
          (1 / 12) * this.mass * (this.width ** 2 + this.height ** 2);
        break;

      case 'polygon':
        if (this.vertices.length < 4) {
          this.inertia =
            (1 / 18) * this.mass * (this.radius ** 2 + this.radius ** 2);
        } else if (this.vertices.length === 4) {
          this.inertia =
            (1 / 12) * this.mass * (this.radius ** 2 + this.radius ** 2);
        } else {
          this.inertia = Vertices.inertia(this.vertices, this.mass);
        }
        break;

      case 'pill':
        const rectInertia =
          (1 / 12) *
          this.density *
          Vertices.area(this.vertices) *
          this.thickness *
          ((this.radius * 2) ** 2 + this.height ** 2);
        const semiMass =
          (this.density * Math.PI * this.radius ** 2 * this.thickness) / 2;
        const semiInertia = (1 / 8) * semiMass * this.radius ** 2;
        const semiTotalInertia = semiInertia + semiMass * this.radius ** 2;

        this.inertia = rectInertia + 2 * semiTotalInertia;

        break;
    }

    this.inverseMass = 1 / this.mass;
    this.inverseInertia = 1 / this.inertia;

    this.wireframe =
      option.wireframe === undefined
        ? true
        : typeof option.wireframe !== 'boolean'
        ? true
        : option.wireframe;

    this.isStatic = option.isStatic || false;

    if (this.isStatic) {
      this.inverseMass = 0;
      this.inverseInertia = 0;
    }

    this.colors = ['#237cf5', '#d9e0eb', '#f57023', '#ee569a'];
    this.color =
      option.color ||
      this.colors[Math.floor(Math.random() * this.colors.length)];
  }

  updateVertices() {
    const direction = Vector2.subtract(this.position, this.prevPosition);

    if (direction.x === 0 && direction.y === 0) return;

    this.allVertices.forEach(point => point.add(direction));
  }

  rotate(angle) {
    this.allVertices.forEach(point => {
      const translated = Vector2.subtract(point, this.position);
      const rotated = translated.rotate(angle);

      point.copy(rotated.add(this.position));
    });
  }

  getBound() {
    return Bounds.getBound(this);
  }
}
