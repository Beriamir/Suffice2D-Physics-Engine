export class World {
  constructor(engine) {
    this.engine = engine;
    this.collections = [];
    this.constraints = [];
  }

  get count() {
    return this.collections.length;
  }

  set count(value) {
    this.collections.length = value;
  }

  forEach(callback) {
    for (let i = 0; i < this.count; ++i) {
      const body = this.collections[i];

      callback(body);
    }
  }

  addConstraint(constraint) {
    this.constraints.push(constraint);
  }

  addBody(body) {
    for (let i = 0; i < this.count; ++i) {
      const currBody = this.collections[i];

      if (currBody.id === body.id) return;
    }

    this.collections.push(body);
    this.engine.grid.addData(body);
  }

  removeBody(body) {
    const index = this.collections.indexOf(body);
    const lastIndex = this.count - 1;
    const temp = this.collections[index];

    this.collections[index] = this.collections[lastIndex];
    this.collections[lastIndex] = temp;
    this.collections.pop();
    this.engine.grid.removeData(body);
  }

  addBodies(bodies) {
    for (let i = 0; i < bodies.length; ++i) {
      const body = bodies[i];

      for (let j = 0; j < this.count; ++j) {
        const currBody = this.collections[j];

        if (currBody.id === body.id) return;
      }

      this.collections.push(body);
      this.engine.grid.addData(body);
    }
  }

  removeBodies(bodies) {
    bodies.forEach(body => {
      const index = this.collections.indexOf(body);
      const lastIndex = this.count - 1;
      const temp = this.collections[index];

      this.collections[index] = this.collections[lastIndex];
      this.collections[lastIndex] = temp;
      this.collections.pop();
      this.engine.grid.removeData(body);
    });
  }

  empty() {
    this.forEach(body => {
      this.engine.grid.removeData(body);
    });

    this.count = 0;
  }

  render(ctx) {
    this.forEach(body => {
      body.bound.render(ctx);
      body.render(ctx);
      body.renderContacts(ctx);
    });
  }
}
