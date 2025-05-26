export class SpatialHashGrid {
  constructor(scale = 32, keyStrategy = 'int') {
    this.scale = scale;
    this.grid = new Map();
    this.queryId = 0;
    this.keyStrategy = keyStrategy;
  }

  // Key strategy: 'int' for packed int keys, 'string' for human-readable
  _hash(x, y) {
    const cellX = Math.floor(x / this.scale);
    const cellY = Math.floor(y / this.scale);

    return this.keyStrategy === 'int'
      ? (cellY << 16) | (cellX & 0xffff)
      : `${cellX},${cellY}`;
  }

  _unpackKey(key) {
    if (this.keyStrategy === 'int') {
      const x = (key << 16) >> 16;
      const y = key >> 16;
      return [x, y];
    }
    return key.split(',').map(Number);
  }

  _range(x, y, halfWidth, halfHeight) {
    const minX = Math.floor((x - halfWidth) / this.scale);
    const minY = Math.floor((y - halfHeight) / this.scale);
    const maxX = Math.floor((x + halfWidth) / this.scale);
    const maxY = Math.floor((y + halfHeight) / this.scale);
    return [[minX, minY], [maxX, maxY]];
  }

  _getCell(key) {
    if (!this.grid.has(key)) this.grid.set(key, []);
    return this.grid.get(key);
  }

  add(item, pos, size) {
    const [min, max] = this._range(pos.x, pos.y, size.x * 0.5, size.y * 0.5);
    const keys = [];

    for (let x = min[0]; x <= max[0]; ++x) {
      for (let y = min[1]; y <= max[1]; ++y) {
        const key = this._hash(x * this.scale, y * this.scale);
        this._getCell(key).push(item);
        keys.push(key);
      }
    }

    item.__spatialKeys = keys;
    item.__lastQueryId = -1;
  }

  remove(item) {
    if (!item.__spatialKeys) return;

    for (const key of item.__spatialKeys) {
      const cell = this.grid.get(key);
      if (!cell) continue;
      const index = cell.indexOf(item);
      if (index !== -1) {
        cell.splice(index, 1);
        if (cell.length === 0) this.grid.delete(key);
      }
    }

    item.__spatialKeys = [];
  }

  update(item, pos, size) {
    const prevKeys = item.__spatialKeys || [];
    this.remove(item);
    this.add(item, pos, size);
  }

  query(pos, size, filter = () => true) {
    const [min, max] = this._range(pos.x, pos.y, size.x * 0.5, size.y * 0.5);
    const found = [];
    const id = ++this.queryId;

    for (let x = min[0]; x <= max[0]; ++x) {
      for (let y = min[1]; y <= max[1]; ++y) {
        const key = this._hash(x * this.scale, y * this.scale);
        const cell = this.grid.get(key);
        if (!cell) continue;

        for (const item of cell) {
          if (item.__lastQueryId === id) continue;
          item.__lastQueryId = id;
          if (filter(item)) found.push(item);
        }
      }
    }

    return found;
  }

  render(ctx) {
    ctx.save();
    ctx.fillStyle = '#2f1e3580';

    for (const [key, cell] of this.grid.entries()) {
      if (cell.length === 0) continue;
      const [x, y] = this._unpackKey(key);
      ctx.fillRect(
        x * this.scale,
        y * this.scale,
        this.scale,
        this.scale
      );
    }

    ctx.restore();
  }
}