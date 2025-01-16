export const Composite = {
  add(engine, body) {
    engine.world.push(body);
    engine.grid.addData(body);
  },
  remove(engine, body) {
    const index = engine.world.indexOf(body);
    const lastIndex = engine.world.length - 1;
    const temp = engine.world[index];
    
    engine.world[index] = engine.world[lastIndex];
    engine.world[lastIndex] = temp;
    engine.world.pop();
    engine.grid.removeData(body);
  }
};