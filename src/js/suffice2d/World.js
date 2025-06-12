export class World {
  constructor(engine) {
    this.engine = engine;
    this.rigidBodies = [];
    this.constraints = [];
  }

  forEach(callback) {
    for (let i = 0; i < this.rigidBodies.length; ++i) {
      if (callback(this.rigidBodies[i], i)) break;
    }
  }

  addConstraint(constraint) {
    this.constraints.push(constraint);
  }

  addBody(body) {
    for (let i = 0; i < this.rigidBodies.length; ++i) {
      if (this.rigidBodies[i].id == body.id) return;
    }

    this.rigidBodies.push(body);
    this.engine.spatialGrid.add(body);
  }

  removeBody(body) {
    const index = this.rigidBodies.indexOf(body);
    const lastIndex = this.rigidBodies.length - 1;

    this.rigidBodies[index] = this.rigidBodies[lastIndex];
    this.rigidBodies.pop();
    this.engine.spatialGrid.remove(body);
  }

  addBodies(bodies) {
    for (let i = 0; i < bodies.length; ++i) {
      const body = bodies[i];
      let exists = false;

      for (let j = 0; j < this.rigidBodies.length; ++j) {
        if (this.rigidBodies[j].id == body.id) {
          exists = true;
          break;
        }
      }

      if (!exists) {
        this.rigidBodies.push(body);
        this.engine.spatialGrid.add(body);
      }
    }
  }

  removeBodies(bodies) {
    for (let i = 0; i < bodies.length; ++i) {
      const body = bodies[i];
      const index = this.rigidBodies.indexOf(body);
      const lastIndex = this.rigidBodies.length - 1;

      this.rigidBodies[index] = this.rigidBodies[lastIndex];
      this.rigidBodies.pop();
      this.engine.spatialGrid.remove(body);
    }
  }

  empty() {
    this.forEach(body => this.engine.spatialGrid.remove(body));
    this.rigidBodies = [];
  }

  render(ctx) {
    this.forEach(body => body.render(ctx));
  }
}
