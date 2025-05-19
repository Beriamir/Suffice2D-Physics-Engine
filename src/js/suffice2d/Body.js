import { Vertices } from './Vertices.js';
import { Vec2 } from './Vec2.js';
import { Bnd2 } from './Bnd2.js';
import { Collision } from './Collision.js';

export class Body {
  constructor(properties, option = {}) {
    this.type = 'rigidBody';
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

    this.prevPosition = this.position.clone(); // new Vec2().copy(this.position);
    this.allVertices = [];

    if (this.axisPoint) this.allVertices.push(this.axisPoint);
    if (this.startPoint) this.allVertices.push(this.startPoint);
    if (this.endPoint) this.allVertices.push(this.endPoint);
    if (this.vertices) this.allVertices.push(...this.vertices);

    this.linearVelocity = option.linearVelocity ?? new Vec2();
    this.angularVelocity = option.angularVelocity ?? 0;

    let defaultFriction = null;
    switch (this.label) {
      case 'circle':
        defaultFriction = { static: 0.6, kinetic: 0.4 };
        break;

      case 'rectangle':
      case 'polygon':
        defaultFriction = { static: 9, kinetic: 7 };
        break;

      case 'capsule':
        defaultFriction = { static: 0.6, kinetic: 0.4 };
        break;
    }
    this.friction = option.friction ?? defaultFriction;
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
          : this.vertices.length == 4
          ? (this.inertia =
              0.0833333333 * this.mass * (radiusSq * 2 + radiusSq * 2))
          : (this.inertia = Vertices.inertia(this.vertices, this.mass));
        break;
      }

      /* case 'capsule': {
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
      } */

      case 'capsule': {
        const r = this.radius;
        const h = this.height;
        const w = 2 * r;
        const thickness = this.thickness;
        const density = this.density;

        const rectArea = w * h;
        const capArea = Math.PI * r * r;

        const rectMass = density * rectArea * thickness;
        const capMass = density * capArea * thickness;
        const semiMass = capMass / 2;

        const rectInertia = (1 / 12) * rectMass * (w * w + h * h);
        const semiInertia = 0.25 * semiMass * r * r;
        const semiOffset = semiMass * (h / 2) ** 2;

        this.inertia = rectInertia + 2 * (semiInertia + semiOffset);
        break;
      }
    }

    this.inverseMass = 1 / this.mass;
    this.inverseInertia = 1 / this.inertia;

    this.isSensor = option.isSensor ?? false;
    this.isStatic = option.isStatic ?? false;
    this.allowContact = true;
    this.fixedRotation = option.fixedRotation ?? false;
    this.wireframe = option.wireframe ?? false;
    this.jointId = Math.random() * 10276262;
    this.color = option.color ?? `hsla(${Math.random() * 360}, 100%, 50%, 70%)`;

    if (this.isStatic) {
      this.inverseMass = 0;
      this.restitution = option.restitution ?? 1;
      this.color = option.color ?? 'hsla(0,0%,51.4%,70%)';
    }

    if (this.fixedRotation) {
      this.inverseInertia = 0;
    }

    this.rotation = 0;
    this.bound = new Bnd2(this);
    this.contactPoints = [];
    this.edges = [];
    this.anchorPoints = [];
    this.anchorPointId = -1;
    this.anchorPairs = [];

    this.onCollisionStart = null;
    this.onCollisionActive = null;
    this.onCollisionEnd = null;
  }

  static _clamp(value, min = 0, max = 1) {
    return value > max ? max : value < min ? min : value;
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
        const contactPoint = ab.scale(projection).add(this.startPoint);

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

  addAnchorForce(anchorA, anchorB, stiffness = 0.5) {
    const delta = Vec2.subtract(anchorB, anchorA);
    const distance = delta.magnitude();

    if (distance < 1) return;

    const normal = delta.scale(1 / distance);
    
    const vA = this.linearVelocity;
    const wA = this.angularVelocity;
    const mA = this.inverseMass;
    const iA = this.inverseInertia;
    const staticFriction = this.friction.static;
    const kineticFriction = this.friction.kinetic;

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

    const beta = 0.001;
    const correction = stiffness * distance * beta;
    const impulse = velNormal + correction / effMassN;
    let friction = relVel.dot(tangent) / effMassT;

    const maxStatic = impulse * staticFriction;
    const maxKinetic = impulse * kineticFriction;

    if (Math.abs(friction) > maxStatic) {
      friction = Body._clamp(friction, -maxKinetic, maxKinetic);
    } else {
      friction = Body._clamp(friction, -maxStatic, maxStatic);
    }

    const torqueN = rnA * impulse * iA;
    const torqueT = rtA * friction * iA;

    const impulseVector = Vec2.scale(normal, impulse * mA);
    const frictionVector = Vec2.scale(tangent, friction * mA);

    this.angularVelocity += torqueN;
    this.angularVelocity += torqueT;

    this.linearVelocity.add(impulseVector);
    this.linearVelocity.add(frictionVector);
  }

  renderAnchorPoints(ctx) {
    ctx.strokeStyle = 'white';
    this.anchorPoints.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  setPosition(x, y) {
    this.prevPosition.copy(this.position);
    this.position.set(x, y);

    const offset = Vec2.subtract(this.position, this.prevPosition);

    this.allVertices.forEach(point => point.add(offset));
    this.bound.update();
  }

  addForce(force, scalar = 1) {
    this.prevPosition.copy(this.position);
    this.position.add(force, scalar);
    this.allVertices.forEach(point => point.add(force, scalar));
    this.anchorPoints.forEach(point => {
      point.add(force, scalar);
    });

    this.bound.update();
  }

  rotate(angle) {
    this.allVertices.forEach(point =>
      point.copy(point.subtract(this.position).rotate(angle).add(this.position))
    );
    this.anchorPoints.forEach(point =>
      point.copy(point.subtract(this.position).rotate(angle).add(this.position))
    );

    this.rotation += angle;
    this.bound.update();
  }

  roundCorner(radius) {
    if (this.label == 'rectangle' || this.label == 'polygon') {
      this.vertices = Vertices.chamfer(this.vertices, radius);

      const direction = Vec2.subtract(this.vertices[0], this.position);

      this.axisPoint.copy(this.position.clone().add(direction));
      this.allVertices = [];
      this.allVertices.push(...this.vertices, this.axisPoint);

      this.bound.update();
      this.label = 'polygon';
    }
  }

  furthestPointInDir(direction) {
    const maxPoint = new Vec2();

    if (this.label == 'rectangle' || this.label == 'polygon') {
      let maxDistance = -Infinity;

      for (let i = 0; i < this.vertices.length; i++) {
        const vertex = this.vertices[i];
        const distance = vertex.dot(direction);

        if (distance > maxDistance) {
          maxDistance = distance;
          maxPoint.copy(vertex);
        }
      }
    } else if (this.label == 'circle') {
      maxPoint.copy(
        Vec2.add(this.position, Vec2.scale(direction, this.radius))
      );
    } else if (this.label == 'capsule') {
      maxPoint.copy(this.position).add(Vec2.scale(direction, this.radius * 2));

      const ab = Vec2.subtract(this.endPoint, this.startPoint);
      const ap = Vec2.subtract(maxPoint, this.startPoint);
      const abLengthSq = ab.magnitudeSq();
      const projection = ap.dot(ab) / abLengthSq;
      const contactPoint = ab.scale(projection).add(this.startPoint);

      if (projection < 0) {
        contactPoint.copy(this.startPoint);
      } else if (projection > 1) {
        contactPoint.copy(this.endPoint);
      }

      maxPoint.copy(contactPoint).add(direction, this.radius);
    }

    return maxPoint;
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
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffffc0';
      ctx.stroke();
    } else {
      ctx.strokeStyle = this.isSleeping ? '#ffffff56' : '#ffffff9c';
      ctx.stroke();
    }

    this.renderAnchorPoints(ctx);
  }

  renderContacts(ctx) {
    ctx.fillStyle = 'cyan';
    ctx.strokeStyle = 'cyan';

    this.contactPoints.forEach(point => {
      switch (this.label) {
        // Circle Edge
        case 'circle': {
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

        // capsule Edge
        case 'capsule': {
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

      // Contact Point
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Polygon Edge
    this.edges.forEach(edge => {
      ctx.beginPath();
      ctx.moveTo(edge[0].x, edge[0].y);
      ctx.lineTo(edge[1].x, edge[1].y);
      ctx.stroke();
    });
  }

  renderVelocity(ctx) {
    const maxLength = 100;

    ctx.beginPath();
    ctx.moveTo(this.position.x, this.position.y);
    ctx.lineTo(
      this.position.x + this.linearVelocity.x * maxLength,
      this.position.y + this.linearVelocity.y * maxLength
    );
    ctx.strokeStyle = 'cyan';
    ctx.stroke();
  }

  renderDebug(ctx) {
    this.bound.render(ctx);
    this.renderContacts(ctx);
    this.renderVelocity(ctx);
  }
}
