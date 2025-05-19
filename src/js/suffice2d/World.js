export class World {
  constructor(engine) {
    this.engine = engine;
    this.collections = [];
    this.constraints = [];
  }
  
  addConstraint(constraint) {
    this.constraints.push(constraint);
  }

  addBody(body) {
    this.collections.push(body);
    this.engine.grid.addData(body);
  }

  removeBody(body) {
    const index = this.collections.indexOf(body);
    const lastIndex = this.collections.length - 1;
    const temp = this.collections[index];

    this.collections[index] = this.collections[lastIndex];
    this.collections[lastIndex] = temp;
    this.collections.pop();
    this.engine.grid.removeData(body);
  }

  addBodies(bodies) {
    bodies.forEach(body => {
      this.collections.push(body);
      this.engine.grid.addData(body);
    });
  }

  removeBodies(bodies) {
    bodies.forEach(body => {
      const index = this.collections.indexOf(body);
      const lastIndex = this.collections.length - 1;
      const temp = this.collections[index];

      this.collections[index] = this.collections[lastIndex];
      this.collections[lastIndex] = temp;
      this.collections.pop();
      this.engine.grid.removeData(body);
    });
  }

  empty() {
    this.collections.forEach(body => {
      this.engine.grid.removeData(body);
    });

    this.collections.length = 0;
  }

  render(ctx) {
    this.collections.forEach(body => {
      body.bound.render(ctx);
      body.render(ctx);
      body.renderContacts(ctx);
    });
  }
}
