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
        case 'center1':
          this.center1 = value;
          break;
        case 'center2':
          this.center2 = value;
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
    if (this.center1) this.allVertices.push(this.center1);
    if (this.center2) this.allVertices.push(this.center2);
    if (this.vertices) this.allVertices.push(...this.vertices);

    this.linearVelocity = option.linearVelocity ?? new Vec2();
    this.angularVelocity = option.angularVelocity ?? 0;
    this.staticFriction = option.staticFriction ?? 0.0;
    this.kineticFriction = option.kineticFriction ?? 0.0;
    this.restitution = option.restitution ?? 0.0;
    this.density = option.density ?? 2700;
    this.thickness = option.thickness ?? 0.01;

    this.restitution =
      this.restitution > 1 ? 1 : this.restitution < 0 ? 0 : this.restitution;
    this.staticFriction =
      this.staticFriction > 1
        ? 1
        : this.staticFriction < 0
        ? 0
        : this.staticFriction;
    this.kineticFriction =
      this.kineticFriction > 1
        ? 1
        : this.kineticFriction < 0
        ? 0
        : this.kineticFriction;

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

    this.isSensor = option.isSensor ?? false;
    this.isStatic = option.isStatic ?? false;
    this.fixedRot = option.fixedRot ?? false;
    this.rotation = option.rotation ?? 0;
    this.prevRotation = this.rotation;
    this.collision = option.collision ?? true;

    this.wireframe = option.wireframe ?? false;
    this.jointSelfCollision = true;
    this.jointId = Math.random() * 10276262;
    this.customColor = option.color;
    this.color = `hsla(${Math.random() * 360}, 100%, 50%, `;
    this.bound = new Bnd2(this);

    if (this.isStatic) {
      this.restitution = 1.0;
      this.inverseMass = 0.0;
      this.color = 'hsla(0, 0%, 50%, ';
    }

    if (this.fixedRot) {
      this.inverseInertia = 0.0;
      this.color = 'hsla(0, 0%, 50%, ';
    }

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

          const ab = Vec2.sub(b, a);
          const ap = Vec2.sub(anchor, a);
          const cross = ab.cross(ap);

          if (cross < 0) {
            contains = false;
            break;
          }
        }

        break;
      }

      case 'capsule': {
        const ab = Vec2.sub(this.center2, this.center1);
        const ap = Vec2.sub(anchor, this.center1);
        const abLengthSq = ab.magnitudeSq();
        const projection = ap.dot(ab) / abLengthSq;
        const contactPoint = Vec2.add(this.center1, ab, projection);

        if (projection < 0) {
          contactPoint.copy(this.center1);
        } else if (projection > 1) {
          contactPoint.copy(this.center2);
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
    const delta = Vec2.sub(anchorB, anchorA);
    const distance = delta.magnitude();

    if (distance === 0) return;

    const normal = delta.scale(1 / distance);

    const beta = 0.01;
    const slop = 0.01;
    const stiffness = 0.1;
    const sFriction = Math.max(this.staticFriction, 0);
    const kFriction = Math.max(this.kineticFriction, 0);

    let rAPerp = Vec2.sub(anchorA, this.position).leftPerp();
    let rBPerp = Vec2.sub(anchorB, anchorB).leftPerp();
    let velNormal = Vec2.sub(
      Vec2.add(new Vec2(), Vec2.scale(rBPerp, 0)),
      Vec2.add(this.linearVelocity, Vec2.scale(rAPerp, this.angularVelocity))
    ).dot(normal);

    const mA = this.inverseMass;
    const mB = this.inverseMass;
    const iA = this.inverseInertia;
    const iB = this.inverseInertia;

    const rnA = rAPerp.dot(normal);
    const rnB = rBPerp.dot(normal);
    const effNormalMass = mA + mB + rnA * rnA * iA + rnB * rnB * iB;
    let normalImpulse = 0;

    if (effNormalMass != 0) {
      const bias = (Math.max(distance - slop, 0) * beta) / deltaTime;

      normalImpulse = -(stiffness * velNormal + bias) / effNormalMass;
    }

    this.angularVelocity -= rnA * normalImpulse * iA;
    this.linearVelocity.sub(normal, normalImpulse * mA);

    // Frictional Impulse
    rAPerp = Vec2.sub(anchorA, this.position).leftPerp();
    rBPerp = Vec2.sub(anchorB, anchorB).leftPerp();
    const relVel = Vec2.sub(
      Vec2.add(new Vec2(), Vec2.scale(rBPerp, 0)),
      Vec2.add(this.linearVelocity, Vec2.scale(rAPerp, this.angularVelocity))
    );
    const tangent = Vec2.sub(
      relVel,
      Vec2.scale(normal, relVel.dot(normal))
    ).normalize();

    const rtA = rAPerp.dot(tangent);
    const rtB = rBPerp.dot(tangent);
    const effTangentMass = mA + mB + rtA * rtA * iA + rtB * rtB * iB;
    let frictionImpulse = 0;

    if (effTangentMass != 0) {
      frictionImpulse = relVel.dot(tangent) / effTangentMass;

      if (Math.abs(frictionImpulse) >= normalImpulse * sFriction) {
        frictionImpulse = normalImpulse * kFriction;
      }
    }

    this.angularVelocity -= rtA * frictionImpulse * iA;
    this.linearVelocity.sub(tangent, frictionImpulse * mA);
  }

  setPosition(x, y) {
    this.prevPosition.copy(this.position);
    this.position.set(x, y);

    const offset = Vec2.sub(this.position, this.prevPosition);

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

      vertex.copy(vertex.sub(this.position).rotate(angle).add(this.position));
    }

    for (let i = 0; i < this.anchorPoints.length; ++i) {
      const vertex = this.anchorPoints[i];

      vertex.copy(vertex.sub(this.position).rotate(angle).add(this.position));
    }

    this.prevRotation = this.rotation;
    this.rotation += angle;
    this.bound.update();
  }

  round(radius = 10) {
    this.vertices = Vertices.chamfer(this.vertices, radius);

    this.allVertices = [];
    this.axisPoint = this.vertices[0].clone();

    if (this.axisPoint) this.allVertices.push(this.axisPoint);
    if (this.vertices) this.allVertices.push(...this.vertices);
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
        const startDir = Vec2.sub(this.vertices[0], this.center1);
        const endDir = Vec2.sub(this.vertices[1], this.center1);
        const startAngle = Math.atan2(startDir.y, startDir.x);
        const endAngle = Math.atan2(endDir.y, endDir.x);

        ctx.arc(
          this.center1.x,
          this.center1.y,
          this.radius,
          startAngle,
          endAngle
        );
        ctx.arc(
          this.center2.x,
          this.center2.y,
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
      ctx.moveTo(this.center1.x, this.center1.y);
      ctx.lineTo(this.center2.x, this.center2.y);
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
      ctx.strokeStyle = this.isSleeping ? '#ffffff40' : '#ffffff80';
      ctx.stroke();
    }

    for (let i = 0; i < this.anchorPoints.length; ++i) {
      const point = this.anchorPoints[i];

      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.stroke();
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
    ctx.strokeStyle = '#ffffff80';
    ctx.stroke();
  }
}
