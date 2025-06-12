export class FixedSpatialGrid {
  constructor(x, y, width, height, scale) {
    this.min = { x, y };
    this.max = { x: x + width, y: y + height };
    this.width = width;
    this.height = height;
    this.scale = scale;
    this.invScale = 1 / scale;
    this.columns = ~~(this.width * this.invScale);
    this.rows = ~~(this.height * this.invScale);
    this.totalCells = this.columns * this.rows;
    this.cells = new Array(this.totalCells);
    this._queryIds = -1;

    for (let i = 0; i < this.totalCells; ++i) {
      this.cells[i] = [];
    }
  }

  _clamp(value, min = 0, max = 1) {
    return value > max ? max : value < min ? min : value;
  }

  _index(x, y) {
    return y * this.columns + x;
  }

  _range(x, y, width, height) {
    width *= 0.5;
    height *= 0.5;

    const min = [
      this._clamp(~~((x - width) * this.invScale), 0, this.columns - 1),
      this._clamp(~~((y - height) * this.invScale), 0, this.rows - 1)
    ];
    const max = [
      this._clamp(~~((x + width) * this.invScale), 0, this.columns - 1),
      this._clamp(~~((y + height) * this.invScale), 0, this.rows - 1)
    ];

    return [min, max];
  }

  add(client) {
    const [min, max] = this._range(
      client.position.x,
      client.position.y,
      client.bound.width,
      client.bound.height
    );

    client.indices = [min, max];

    for (let x = min[0]; x <= max[0]; ++x) {
      for (let y = min[1]; y <= max[1]; ++y) {
        const index = this._index(x, y);
        const cell = this.cells[index];

        cell.push(client);
      }
    }
  }

  remove(client) {
    const [min, max] = client.indices;

    for (let x = min[0]; x <= max[0]; ++x) {
      for (let y = min[1]; y <= max[1]; ++y) {
        const index = this._index(x, y);
        const cell = this.cells[index];

        for (let i = 0; i < cell.length; ++i) {
          if (cell[i].id == client.id) {
            const last = cell.length - 1;

            cell[i] = cell[last];
            cell.pop();
            --i;
          }
        }
      }
    }
  }

  update(client) {
    const [prevMin, prevMax] = client.indices;
    const [newMin, newMax] = this._range(
      client.position.x,
      client.position.y,
      client.bound.width,
      client.bound.height
    );

    if (
      prevMin[0] == newMin[0] &&
      prevMin[1] == newMin[1] &&
      prevMax[0] == newMax[0] &&
      prevMax[1] == newMax[1]
    )
      return null;

    this.remove(client);
    this.add(client);
  }

  query(client) {
    const neighbors = [];
    const [min, max] = this._range(
      client.position.x,
      client.position.y,
      client.bound.width,
      client.bound.height
    );

    client.queryId = ++this._queryIds;

    for (let x = min[0]; x <= max[0]; ++x) {
      for (let y = min[1]; y <= max[1]; ++y) {
        const index = this._index(x, y);
        const cell = this.cells[index];

        for (let i = 0; i < cell.length; ++i) {
          const neighbor = cell[i];

          if (neighbor.queryId != client.queryId) {
            neighbor.queryId = client.queryId;
            neighbors.push(neighbor);
          }
        }
      }
    }

    return neighbors;
  }

  render(ctx) {
    const scale = 1 / this.invScale;

    ctx.fillStyle = '#000';
    ctx.fillRect(this.min.x, this.min.y, this.width, this.height);

    ctx.fillStyle = '#ffffff20';
    for (let i = 0; i < this.cells.length; ++i) {
      if (this.cells[i].length > 0) {
        const x = i % this.columns;
        const y = Math.floor(i / this.columns);

        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }

    ctx.strokeStyle = '#ffffff40';
    ctx.beginPath();
    for (let x = this.min.x; x <= this.columns; ++x) {
      const gx = this.min.x + x * scale;

      ctx.moveTo(gx, this.min.y);
      ctx.lineTo(gx, this.min.y + this.height);
    }
    for (let y = this.min.y; y <= this.rows; ++y) {
      const gy = this.min.y + y * scale;

      ctx.moveTo(this.min.x, gy);
      ctx.lineTo(this.min.x + this.width, gy);
    }
    ctx.stroke();
  }
}
