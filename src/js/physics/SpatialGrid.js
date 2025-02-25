export class SpatialGrid {
  constructor(x, y, width, height, scale) {
    this.bound = [x, y, width, height];
    this.columns = Math.floor(width / scale);
    this.rows = Math.floor(height / scale);
    this.grid = Array.from({ length: this.columns * this.rows }, () => []);
    this.scale = scale;
    this.queryIds = -1;
  }

  _index(x, y) {
    return y * this.columns + x;
  }

  _clamp(value, min = 0, max = 1) {
    return value < min ? min : value > max ? max : value;
  }

  _range(x, y, width, height) {
    const min = [
      this._clamp(Math.floor((x - width) / this.scale), 0, this.columns - 1),
      this._clamp(Math.floor((y - height) / this.scale), 0, this.rows - 1)
    ];
    const max = [
      this._clamp(Math.floor((x + width) / this.scale), 0, this.columns - 1),
      this._clamp(Math.floor((y + height) / this.scale), 0, this.rows - 1)
    ];

    return [min, max];
  }

  addData(client) {
    const { width, height } = client.bound;
    const [min, max] = this._range(
      client.position.x,
      client.position.y,
      width * 0.5,
      height * 0.5
    );

    client.indices = [min, max];

    for (let x = min[0]; x <= max[0]; ++x) {
      for (let y = min[1]; y <= max[1]; ++y) {
        const index = this._index(x, y);
        const cell = this.grid[index];

        cell.push(client);
      }
    }
  }

  removeData(client) {
    const [min, max] = client.indices;

    for (let x = min[0]; x <= max[0]; ++x) {
      for (let y = min[1]; y <= max[1]; ++y) {
        const index = this._index(x, y);
        const cell = this.grid[index];

        cell.forEach((cellClient, i) => {
          if (cellClient === client) {
            const temp = cellClient;
            const last = cell.length - 1;

            cell[i] = cell[last];
            cell[last] = temp;
            cell.pop();
          }
        });
      }
    }
  }

  updateData(client) {
    const [prevMin, prevMax] = client.indices;
    const { width, height } = client.bound;
    const [newMin, newMax] = this._range(
      client.position.x,
      client.position.y,
      width * 0.5,
      height * 0.5
    );

    if (
      prevMin[0] == newMin[0] &&
      prevMin[1] == newMin[1] &&
      prevMax[0] == newMax[0] &&
      prevMax[1] == newMax[1]
    )
      return null;

    this.removeData(client);
    this.addData(client);
  }

  queryNearby(client) {
    const { width, height } = client.bound;
    const [min, max] = this._range(
      client.position.x,
      client.position.y,
      width * 0.5,
      height * 0.5
    );

    const queryId = ++this.queryIds;
    const neighbors = [];
    client.queryId = queryId;

    for (let x = min[0]; x <= max[0]; ++x) {
      for (let y = min[1]; y <= max[1]; ++y) {
        const index = this._index(x, y);
        const cell = this.grid[index];

        cell.forEach(neighbor => {
          if (neighbor.queryId != queryId) {
            neighbor.queryId = queryId;
            neighbors.push(neighbor);
          }
        });
      }
    }

    return neighbors;
  }

  render(ctx) {
    ctx.strokeStyle = '#ffffff47';
    ctx.fillStyle = '#f9000023';
    ctx.beginPath();
    for (let x = 0; x <= this.columns; ++x) {
      ctx.moveTo(x * this.scale, 0);
      ctx.lineTo(x * this.scale, this.bound[3]);
    }
    for (let y = 0; y <= this.rows; ++y) {
      ctx.moveTo(0, y * this.scale);
      ctx.lineTo(this.bound[2], y * this.scale);
    }
    ctx.stroke();

    for (let i = 0; i < this.grid.length; ++i) {
      if (this.grid[i].length > 0) {
        const x = i % this.columns;
        const y = Math.floor(i / this.columns);

        ctx.fillRect(x * this.scale, y * this.scale, this.scale, this.scale);
      }
    }
  }
}
