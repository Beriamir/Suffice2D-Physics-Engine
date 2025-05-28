export class SpatialHashGrid {
  constructor(scale) {
    this.scale = scale; // Size of each grid cell
    this.grid = new Map(); // Stores only populated cells: key -> array of bodies
    this.queryIds = -1; // Used to mark objects as visited in query
  }

  // Converts a world position to a string-based hash key for the cell
  _hash(x, y) {
    const cellX = Math.floor(x / this.scale);
    const cellY = Math.floor(y / this.scale);
    return `${cellX},${cellY}`;
  }

  // Computes cell range covered by an object's bounding box
  _range(x, y, halfWidth, halfHeight) {
    const minX = Math.floor((x - halfWidth) / this.scale);
    const minY = Math.floor((y - halfHeight) / this.scale);
    const maxX = Math.floor((x + halfWidth) / this.scale);
    const maxY = Math.floor((y + halfHeight) / this.scale);
    return [
      [minX, minY],
      [maxX, maxY]
    ];
  }

  // Ensures a cell exists in the map and returns its array
  _getCell(x, y) {
    const key = `${x},${y}`;
    if (!this.grid.has(key)) this.grid.set(key, []);
    return this.grid.get(key);
  }

  // Adds an object to all the grid cells it touches
  addData(body) {
    const { width, height } = body.bound; // Assume body has .bound { width, height }
    const [min, max] = this._range(
      body.position.x,
      body.position.y,
      width * 0.5,
      height * 0.5
    );

    body.cellKeys = []; // Store keys for fast removal later

    for (let x = min[0]; x <= max[0]; ++x) {
      for (let y = min[1]; y <= max[1]; ++y) {
        const key = `${x},${y}`;
        const cell = this._getCell(x, y);
        cell.push(body);
        body.cellKeys.push(key);
      }
    }
  }

  // Removes the object from all its previous cells
  removeData(body) {
    for (const key of body.cellKeys || []) {
      const cell = this.grid.get(key);
      if (!cell) continue;

      const index = cell.indexOf(body);
      if (index !== -1) {
        cell.splice(index, 1);
        if (cell.length === 0) this.grid.delete(key); // Clean up empty cell
      }
    }
    body.cellKeys = [];
  }

  // Recalculates which cells an object should be in if it moved
  updateData(body) {
    const { width, height } = body.bound;
    const [newMin, newMax] = this._range(
      body.position.x,
      body.position.y,
      width * 0.5,
      height * 0.5
    );

    const newKeys = [];
    for (let x = newMin[0]; x <= newMax[0]; ++x) {
      for (let y = newMin[1]; y <= newMax[1]; ++y) {
        newKeys.push(`${x},${y}`);
      }
    }

    // Avoid rehashing if object stayed in same cells
    if (JSON.stringify(newKeys) === JSON.stringify(body.cellKeys)) return;

    this.removeData(body);
    this.addData(body);
  }

  // Returns a list of nearby objects (possible collision candidates)
  queryNearby(body) {
    const { width, height } = body.bound;
    const [min, max] = this._range(
      body.position.x,
      body.position.y,
      width * 0.5,
      height * 0.5
    );

    const queryId = ++this.queryIds;
    const neighbors = [];
    body.queryId = queryId;

    for (let x = min[0]; x <= max[0]; ++x) {
      for (let y = min[1]; y <= max[1]; ++y) {
        const key = `${x},${y}`;
        const cell = this.grid.get(key);
        if (!cell) continue;

        for (const neighbor of cell) {
          if (neighbor.queryId !== queryId && neighbor !== body) {
            neighbor.queryId = queryId;
            neighbors.push(neighbor);
          }
        }
      }
    }

    return neighbors;
  }

  _getRenderBounds() {
    const cellKeys = Array.from(this.grid.keys()).map(key =>
      key.split(',').map(Number)
    );

    const xs = cellKeys.map(([x]) => x);
    const ys = cellKeys.map(([_, y]) => y);

    const minX = Math.min(...xs) - 1;
    const maxX = Math.max(...xs) + 1;
    const minY = Math.min(...ys) - 1;
    const maxY = Math.max(...ys) + 1;

    return { minX, maxX, minY, maxY };
  }

  // Optional: visualize occupied cells
  render3(ctx) {
    ctx.save();
    ctx.fillStyle = '#4343436f';

    for (const [key, cell] of this.grid.entries()) {
      if (cell.length === 0) continue;

      const [x, y] = key.split(',').map(Number);

      ctx.fillRect(x * this.scale, y * this.scale, this.scale, this.scale);
    }

    ctx.restore();
  }

  render2(ctx) {
    ctx.save();
    ctx.fillStyle = '#2f1e3580';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#2f1e3580';

    for (const [key, cell] of this.grid.entries()) {
      if (cell.length === 0) continue;

      const [x, y] = key.split(',').map(Number);
      const px = x * this.scale;
      const py = y * this.scale;

      // Highlight cell
      ctx.fillRect(px, py, this.scale, this.scale);

      // Body count
      ctx.fillStyle = 'white';
      ctx.fillText(cell.length, px + this.scale / 2, py + this.scale / 2);
      ctx.fillStyle = '#2f1e3580';
    }

    ctx.restore();
  }

  render(ctx) {
    ctx.save();

    // Draw filled cells (occupied grid cells)
    ctx.fillStyle = '#4848489b';
    for (const key of this.grid.keys()) {
      const [x, y] = key.split(',').map(Number);
      ctx.fillRect(x * this.scale, y * this.scale, this.scale, this.scale);
    }

    // Draw grid lines (optional, helps visualize resolution)
    ctx.strokeStyle = '#ffffff20';
    ctx.lineWidth = 1;

    const bounds = this._getRenderBounds();
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      for (let y = bounds.minY; y <= bounds.maxY; y++) {
        ctx.strokeRect(x * this.scale, y * this.scale, this.scale, this.scale);
      }
    }

    ctx.restore();
  }
}
