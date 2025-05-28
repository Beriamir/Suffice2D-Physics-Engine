import { Vertices } from './Vertices.js';
import { Vec2 } from './Vec2.js';
import { Bnd2 } from './Bnd2.js';
import { Collision } from './Collision.js';

export class RigidBody {
  constructor(properties, option = {}) {
    this.type = 'rigid';
    this.name = '';
    this.tag = '';

    for (const property in properties) {
      const value = properties[property];

      switch (property) {
        case 'id':
          this.id = value;
          break;
        case 'label':
          this.label = value;
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

    this.prevPosition = this.position.clone(); // new Vec2().copy(this.position);
    this.allVertices = [];

    if (this.axisPoint) this.allVertices.push(this.axisPoint);
    if (this.startPoint) this.allVertices.push(this.startPoint);
    if (this.endPoint) this.allVertices.push(this.endPoint);
    if (this.vertices) this.allVertices.push(...this.vertices);

    this.linearVelocity = option.linearVelocity ?? new Vec2();
    this.angularVelocity = option.angularVelocity ?? 0;
    this.staticFriction = option.staticFriction ?? 0.6;
    this.kineticFriction = option.kineticFriction ?? 0.4;
    this.restitution = option.restitution ?? 0.0;
    this.density = option.density ?? 2700;
    this.thickness = option.thickness ?? 0.01;

    switch (this.label) {
      case 'circle':
        this.area = this.radius * this.radius * Math.PI;
        break;
      case 'rectangle':
      case 'polygon':
        this.area = Vertices.area(this.vertices);
        break;
      case 'capsule':
        this.area =
          this.radius * this.radius * Math.PI + Vertices.area(this.vertices);
        break;
    }

    this.mass = option.mass ?? this.density * this.area * this.thickness;

    switch (this.label) {
      case 'circle':
        this.inertia = 0.5 * this.mass * this.radius * this.radius;
        break;

      case 'rectangle':
        this.inertia =
          0.0833333333 * this.mass * (this.width ** 2 + this.height ** 2);
        break;

      case 'polygon': {
        const radiusSq = this.radius ** 2;
        this.vertices.length < 4
          ? (this.inertia =
              0.0555555556 * this.mass * (radiusSq * 2 + radiusSq * 2))
          : this.vertices.length === 4
          ? (this.inertia =
              0.0833333333 * this.mass * (radiusSq * 2 + radiusSq * 2))
          : (this.inertia = Vertices.inertia(this.vertices, this.mass));
        break;
      }

      case 'capsule': {
        const circleInertia = 0.5 * this.mass * this.radius * this.radius;
        const width = this.radius * 2;
        const rectangleInertia =
          0.0833333333 *
          this.mass *
          (width * width + this.height * this.height);

        this.inertia = circleInertia + rectangleInertia;
        break;
      }
    }

    this.inverseMass = 1 / this.mass;
    this.inverseInertia = 1 / this.inertia;

    this.isSleeping = false;
    this.isSensor = option.isSensor ?? false;
    this.isStatic = option.isStatic ?? false;
    this.fixedRot = option.fixedRot ?? false;
    this.rotation = option.rotation ?? 0;
    this.wireframe = option.wireframe ?? false;
    this.jointSelfCollision = true;
    this.jointId = Math.random() * 10276262;
    this.customColor = option.color;
    this.color = `hsla(${Math.random() * 360}, 100%, 50%, `;
    this.bound = new Bnd2(this);

    if (this.isStatic) {
      this.inverseMass = 0;
      this.restitution = 1;
      this.color = 'hsla(0, 0%, 50%, ';
    }

    if (this.fixedRot) {
      this.inverseInertia = 0;
    }

    this.contactPoints = [];
    this.edges = [];
    this.anchorPoints = [];
    this.anchorPointId = -1;
    this.anchorPairs = [];

    this.onCollisionStart = _ => {};
    this.onCollisionActive = _ => {};
    this.onCollisionEnd = _ => {};
    this.rotate(this.rotation);
  }

  addAnchorPoint(point) {
    const pointId = ++this.anchorPointId;

    point.id = pointId;
    this.anchorPoints.push(point);

    return point;
  }

  removeAnchorPoint(point) {
    for (let i = 0; i < this.anchorPoints.length; i++) {
      const currPoint = this.anchorPoints[i];

      if (currPoint.id === point.id) {
        this.anchorPoints.splice(i, 1);
        return null;
      }
    }
  }

  containsAnchor(anchor) {
    let contains = false;

    switch (this.label) {
      case 'circle': {
        const distanceSq = Vec2.distanceSq(this.position, anchor);
        const radiusSq = this.radius * this.radius;

        if (distanceSq < radiusSq) {
          contains = true;
        }

        break;
      }
      case 'rectangle':
      case 'polygon': {
        const n = this.vertices.length;
        contains = true;

        for (let i = 0; i < n; ++i) {
          const a = this.vertices[i];
          const b = this.vertices[(i + 1) % n];

          const ab = Vec2.subtract(b, a);
          const ap = Vec2.subtract(anchor, a);
          const cross = ab.cross(ap);

          if (cross < 0) {
            contains = false;
            break;
          }
        }

        break;
      }

      case 'capsule': {
        const ab = Vec2.subtract(this.endPoint, this.startPoint);
        const ap = Vec2.subtract(anchor, this.startPoint);
        const abLengthSq = ab.magnitudeSq();
        const projection = ap.dot(ab) / abLengthSq;
        const contactPoint = Vec2.add(this.startPoint, ab, projection);

        if (projection < 0) {
          contactPoint.copy(this.startPoint);
        } else if (projection > 1) {
          contactPoint.copy(this.endPoint);
        }

        const distanceSq = Vec2.distanceSq(contactPoint, anchor);
        const radiusSq = this.radius * this.radius;

        if (distanceSq < radiusSq) {
          contains = true;
        }

        break;
      }
    }

    return contains;
  }

  addAnchorVelocity(anchorA, anchorB, deltaTime = 1000 / 60) {
    const delta = Vec2.subtract(anchorB, anchorA);
    const distance = delta.magnitude();

    if (distance < 1) return;

    const normal = delta.scale(1 / distance);
    const correction = distance - 0;

    const vA = this.linearVelocity;
    const wA = this.angularVelocity;
    const mA = this.inverseMass;
    const iA = this.inverseInertia;

    const rA = Vec2.subtract(anchorA, this.position);
    const rAPerp = rA.perp();
    const vTanA = Vec2.scale(rAPerp, wA);
    const relVel = Vec2.subtract(new Vec2(), Vec2.add(vA, vTanA));
    const velNormal = relVel.dot(normal);

    const tangent = Vec2.subtract(
      relVel,
      Vec2.scale(normal, velNormal)
    ).normalize();

    const rnA = rAPerp.dot(normal);
    const rtA = rAPerp.dot(tangent);
    const effMassN = mA + rnA * rnA * iA;
    const effMassT = mA + rtA * rtA * iA;

    if (effMassN === 0 || effMassT === 0) {
      return;
    }

    const springiness = 0.9;
    const beta = 0.1 / deltaTime;
    const slop = correction * 0.9;
    const bias = Math.max(correction - slop, 0) * beta;
    let impulse = -((1 - springiness) * velNormal + bias) / effMassN;
    let friction = relVel.dot(tangent) / effMassT;

    if (Math.abs(friction) >= impulse * this.staticFriction) {
      friction = impulse * this.kineticFriction;
    }

    const torqueN = rnA * impulse * iA;
    const torqueT = rtA * friction * iA;
    const impulseVector = Vec2.scale(normal, -impulse * mA);
    const frictionVector = Vec2.scale(tangent, -friction * mA);

    this.angularVelocity += -torqueN;
    this.angularVelocity += -torqueT;

    this.linearVelocity.add(impulseVector);
    this.linearVelocity.add(frictionVector);
  }

  setPosition(x, y) {
    this.prevPosition.copy(this.position);
    this.position.set(x, y);

    const offset = Vec2.subtract(this.position, this.prevPosition);

    for (let i = 0; i < this.allVertices.length; ++i) {
      const vertex = this.allVertices[i];

      vertex.add(offset);
    }

    for (let i = 0; i < this.anchorPoints.length; ++i) {
      const vertex = this.anchorPoints[i];

      vertex.add(offset);
    }

    this.bound.update();
  }

  translate(force, scalar = 1) {
    this.prevPosition.copy(this.position);
    this.position.add(force, scalar);

    for (let i = 0; i < this.allVertices.length; ++i) {
      const vertex = this.allVertices[i];

      vertex.add(force, scalar);
    }

    for (let i = 0; i < this.anchorPoints.length; ++i) {
      const vertex = this.anchorPoints[i];

      vertex.add(force, scalar);
    }

    this.bound.update();
  }

  rotate(angle) {
    for (let i = 0; i < this.allVertices.length; ++i) {
      const vertex = this.allVertices[i];

      vertex.copy(
        vertex.subtract(this.position).rotate(angle).add(this.position)
      );
    }

    for (let i = 0; i < this.anchorPoints.length; ++i) {
      const vertex = this.anchorPoints[i];

      vertex.copy(
        vertex.subtract(this.position).rotate(angle).add(this.position)
      );
    }

    this.rotation += angle;
    this.bound.update();
  }

  render(ctx) {
    ctx.beginPath();
    switch (this.label) {
      case 'circle':
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        break;

      case 'rectangle':
      case 'polygon': {
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++)
          ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        ctx.closePath();
        break;
      }

      case 'capsule': {
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

    for (let i = 0; i < this.anchorPairs.length; ++i) {
      const pairs = this.anchorPairs[i];

      ctx.moveTo(pairs.anchorA.x, pairs.anchorA.y);
      ctx.lineTo(pairs.anchorB.x, pairs.anchorB.y);
    }

    if (!this.wireframe) {
      ctx.fillStyle = this.customColor || this.color + ` 0.5)`;
      ctx.strokeStyle = this.customColor ? '#ffffff' : this.color + `1)`;

      ctx.fill();
      ctx.stroke();
    } else {
      ctx.strokeStyle = this.isSleeping ? '#ffffff80' : '#ffffff';
      ctx.stroke();
    }

    this.renderAnchorPoints(ctx);
  }

  renderAnchorPoints(ctx) {
    ctx.strokeStyle = this.customColor ? '#ffffff' : this.color + `1)`;
    for (let i = 0; i < this.anchorPoints.length; ++i) {
      const point = this.anchorPoints[i];

      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  renderContacts(ctx) {
    for (let i = 0; i < this.contactPoints.length; ++i) {
      const point = this.contactPoints[i];

      ctx.beginPath();
      ctx.arc(point.x, point.y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderVelocity(ctx) {
    const maxLength = 100;

    ctx.beginPath();
    ctx.moveTo(this.position.x, this.position.y);
    ctx.lineTo(
      this.position.x + this.linearVelocity.x * maxLength,
      this.position.y + this.linearVelocity.y * maxLength
    );
    ctx.stroke();
  }

  renderDebug(ctx) {
    this.bound.render(ctx);
    ctx.fillStyle = '#ffffff80';
    ctx.strokeStyle = '#ffffff80';
    this.renderContacts(ctx);
    this.renderVelocity(ctx);
  }
}
