import { Vertices } from "./Vertices.js";
import { Vec2 } from "./Vec2.js";
import { Bnd2 } from "./Bnd2.js";

export class Body {
  constructor(properties, option = {}) {
    for (const property in properties) {
      const value = properties[property];

      switch (property) {
        case "label":
          this.label = value;
          break;
        case "type":
          this.type = value;
          break;
        case "position":
          this.position = value;
          break;
        case "axisPoint":
          this.axisPoint = value;
          break;
        case "startPoint":
          this.startPoint = value;
          break;
        case "endPoint":
          this.endPoint = value;
          break;
        case "vertices":
          this.vertices = value;
          break;
        case "radius":
          this.radius = value;
          break;
        case "width":
          this.width = value;
          break;
        case "height":
          this.height = value;
          break;
      }
    }

    this.prevPosition = this.position.clone(); // new Vec2().copy(this.position);
    this.allVertices = [];

    if (this.axisPoint) this.allVertices.push(this.axisPoint);
    if (this.startPoint) this.allVertices.push(this.startPoint);
    if (this.endPoint) this.allVertices.push(this.endPoint);
    if (this.vertices) this.allVertices.push(...this.vertices);

    this.linearVelocity = new Vec2().copy(
      option.linearVelocity || { x: 0, y: 0 }
    );
    this.angularVelocity = option.angularVelocity || 0;

    let defaultFriction = null;
    switch (this.label) {
      case "circle":
        defaultFriction = { static: 0.8, kinetic: 0.7 };
        break;

      case "rectangle":
      case "polygon":
        defaultFriction = { static: 0.9, kinetic: 0.8 };
        break;

      case "pill":
        defaultFriction = { static: 0.7, kinetic: 0.6 };
        break;
    }
    this.friction = option.friction || defaultFriction;
    this.restitution = option.restitution || 0.0;
    this.density = option.density || 2700;
    this.thickness = option.thickness || 0.01;

    switch (this.label) {
      case "circle":
        this.area = this.radius * this.radius * Math.PI;
        break;
      case "rectangle":
      case "polygon":
        this.area = Vertices.area(this.vertices);
        break;
      case "pill":
        this.area =
          this.radius * this.radius * Math.PI + Vertices.area(this.vertices);
        break;
    }

    this.mass = this.density * this.area * this.thickness;

    switch (this.label) {
      case "circle":
        this.inertia = 0.5 * this.mass * this.radius * this.radius;
        break;

      case "rectangle":
        this.inertia =
          0.0833333333 * this.mass * (this.width ** 2 + this.height ** 2);
        break;

      case "polygon": {
        const radiusSq = this.radius ** 2;
        this.vertices.length < 4
          ? (this.inertia =
              0.0555555556 * this.mass * (radiusSq * 2 + radiusSq * 2))
          : this.vertices.length == 4
          ? (this.inertia =
              0.0833333333 * this.mass * (radiusSq * 2 + radiusSq * 2))
          : (this.inertia = Vertices.inertia(this.vertices, this.mass));
        break;
      }

      case "pill": {
        const radiusSq = this.radius ** 2;
        const rectInertia =
          0.0833333333 *
          this.density *
          Vertices.area(this.vertices) *
          this.thickness *
          (radiusSq * 2 + this.height ** 2);
        const semiMass =
          this.density * Math.PI * radiusSq * this.thickness * 0.5;
        const semiInertia = 0.125 * semiMass * radiusSq;
        const semiTotalInertia = semiInertia + semiMass * radiusSq;

        this.inertia = rectInertia + 2 * semiTotalInertia;
        break;
      }
    }

    this.inverseMass = 1 / this.mass;
    this.inverseInertia = 1 / this.inertia;

    this.wireframe =
      option.wireframe == undefined
        ? true
        : option.wireframe && typeof option.wireframe != "boolean"
        ? true
        : option.wireframe;

    this.rotation =
      option.rotation == undefined
        ? true
        : typeof option.rotation != "boolean"
        ? true
        : option.rotation;
    this.isStatic = option.isStatic || false;

    if (this.isStatic) this.inverseMass = 0;

    if (!this.rotation) this.inverseInertia = 0;

    this.color = option.color || `hsla(${Math.random() * 360}, 100%, 50%, 80%)`;

    this.bound = new Bnd2(this);
    this.contactPoints = [];
    this.edges = [];
  }

  translate(offset, scalar = 1) {
    this.prevPosition.copy(this.position);
    this.position.add(offset, scalar);
    this.allVertices.forEach(point => point.add(offset, scalar));

    this.bound.update();
  }

  rotate(angle) {
    this.allVertices.forEach(point =>
      point.copy(point.subtract(this.position).rotate(angle).add(this.position))
    );

    this.bound.update();
  }

  roundCorner(radius) {
    if (this.label == "rectangle" || this.label == "polygon") {
      this.vertices = Vertices.chamfer(this.vertices, radius);

      const direction = Vec2.subtract(this.vertices[0], this.position);

      this.axisPoint.copy(this.position.clone().add(direction));
      this.allVertices = [];
      this.allVertices.push(...this.vertices, this.axisPoint);
    }
  }

  render(ctx) {
    ctx.beginPath();
    switch (this.label) {
      case "circle":
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        break;

      case "rectangle":
      case "polygon": {
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++)
          ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        ctx.closePath();
        break;
      }

      case "pill": {
        const startDir = Vec2.subtract(this.vertices[0], this.startPoint);
        const endDir = Vec2.subtract(this.vertices[1], this.startPoint);
        const startAngle = Math.atan2(startDir.y, startDir.x);
        const endAngle = Math.atan2(endDir.y, endDir.x);

        ctx.arc(
          this.startPoint.x,
          this.startPoint.y,
          this.radius,
          startAngle,
          endAngle
        );
        ctx.arc(
          this.endPoint.x,
          this.endPoint.y,
          this.radius,
          endAngle,
          startAngle
        );
        ctx.closePath();
        break;
      }
    }

    if (this.axisPoint) {
      ctx.moveTo(this.position.x, this.position.y);
      ctx.lineTo(this.axisPoint.x, this.axisPoint.y);
    } else {
      ctx.moveTo(this.startPoint.x, this.startPoint.y);
      ctx.lineTo(this.endPoint.x, this.endPoint.y);
    }

    if (!this.wireframe) {
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.strokeStyle = "#ffffffc0";
      ctx.stroke();
    } else {
      ctx.strokeStyle = this.isSleeping ? "#ffffff50" : "#ffffffc0";
      ctx.stroke();
    }
  }

  renderContacts(ctx) {
    ctx.fillStyle = "orange";
    ctx.strokeStyle = "orange";
    // ctx.fillStyle = '#ee5858cf';
    // ctx.strokeStyle = '#ee5858cf';

    this.contactPoints.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
      ctx.fill();

      switch (this.label) {
        // Circle Edge
        case "circle": {
          const direction = Vec2.subtract(point, this.position);
          const angle = Math.atan2(direction.y, direction.x);

          ctx.beginPath();
          ctx.arc(
            this.position.x,
            this.position.y,
            this.radius,
            angle - Math.PI * 0.25,
            angle + Math.PI * 0.25
          );
          ctx.stroke();
          break;
        }

        // Pill Edge
        case "pill": {
          let edge = null;
          const ab = Vec2.subtract(this.endPoint, this.startPoint);
          const ap = Vec2.subtract(point, this.startPoint);
          const cross = ap.cross(ab);

          const magnitudeSq = ab.magnitudeSq();
          const projection = ap.dot(ab) / magnitudeSq;

          if (projection > 0 && projection < 1) {
            if (cross > 0) edge = [this.vertices[1], this.vertices[2]];
            else if (cross < 0) edge = [this.vertices[0], this.vertices[3]];

            ctx.beginPath();
            ctx.moveTo(edge[0].x, edge[0].y);
            ctx.lineTo(edge[1].x, edge[1].y);
            ctx.stroke();
          } else {
            const direction = Vec2.subtract(point, this.position);
            const angle = Math.atan2(direction.y, direction.x);

            ctx.beginPath();
            if (projection < 0) {
              ctx.arc(
                this.startPoint.x,
                this.startPoint.y,
                this.radius,
                angle - Math.PI * 0.25,
                angle + Math.PI * 0.25
              );
            } else if (projection > 1) {
              ctx.arc(
                this.endPoint.x,
                this.endPoint.y,
                this.radius,
                angle - Math.PI * 0.25,
                angle + Math.PI * 0.25
              );
            }
            ctx.stroke();
          }

          break;
        }
      }
    });

    // Polygon Edge
    this.edges.forEach(edge => {
      ctx.beginPath();
      ctx.moveTo(edge[0].x, edge[0].y);
      ctx.lineTo(edge[1].x, edge[1].y);
      ctx.lineTo(edge[2].x, edge[2].y);
      ctx.stroke();
    });
  }
}
