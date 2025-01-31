import { Bounds } from './Bounds.js'

export class SpatialGrid {
  constructor(x, y, width, height, scale) {
    this.bounds = [
      [x, y],
      [width, height]
    ]
    this.columns = Math.floor(width / scale)
    this.rows = Math.floor(height / scale)
    this.grid = Array.from({ length: this.columns * this.rows }, () => [])
    this.scale = scale
    this.queryIds = 0
  }

  render(ctx) {
    ctx.strokeStyle = '#ffffff47'
    ctx.fillStyle = '#f9000023'
    for (let x = 0; x <= this.columns; ++x) {
      ctx.beginPath()
      ctx.moveTo(x * this.scale, 0)
      ctx.lineTo(x * this.scale, this.bounds[1][1])
      ctx.stroke()
    }
    for (let y = 0; y <= this.rows; ++y) {
      ctx.beginPath()
      ctx.moveTo(0, y * this.scale)
      ctx.lineTo(this.bounds[1][0], y * this.scale)
      ctx.stroke()
    }

    for (let i = 0; i < this.grid.length; ++i) {
      if (this.grid[i].length > 0) {
        const x = i % this.columns
        const y = Math.floor(i / this.columns)

        ctx.fillRect(x * this.scale, y * this.scale, this.scale, this.scale)
      }
    }
  }

  addData(client) {
    client.indices = null

    const { x, y } = client.position
    const { width, height } = Bounds.getBound(client)
    const [min, max] = this._range(x, y, width * 0.5, height * 0.5)

    client.indices = [min, max]

    for (let x = min[0]; x <= max[0]; ++x) {
      for (let y = min[1]; y <= max[1]; ++y) {
        const index = this._index(x, y)

        this.grid[index].push(client)
      }
    }
  }

  removeData(client) {
    const [min, max] = client.indices

    for (let x = min[0]; x <= max[0]; ++x) {
      for (let y = min[1]; y <= max[1]; ++y) {
        const index = this._index(x, y)

        const cell = this.grid[index]

        for (let i = 0; i < cell.length; ++i) {
          const cellClient = cell[i]

          if (cellClient === client) {
            const temp = client
            const endIndex = cell.length - 1

            cell[i] = cell[endIndex]
            cell[endIndex] = temp
            cell.pop()
          }
        }
      }
    }
  }

  updateData(client) {
    const { x, y } = client.position
    const { width, height } = Bounds.getBound(client)
    const [newMin, newMax] = this._range(x, y, width * 0.5, height * 0.5)
    const [prevMin, prevMax] = client.indices

    if (
      prevMin[0] === newMin[0] &&
      prevMin[1] === newMin[1] &&
      prevMax[0] === newMax[0] &&
      prevMax[1] === newMax[1]
    ) {
      return null
    }

    this.removeData(client)
    this.addData(client)
  }

  queryNearby(client) {
    const { x, y } = client.position
    const { width, height } = Bounds.getBound(client)
    const [min, max] = this._range(x, y, width * 0.5, height * 0.5)

    const queries = []
    this.queryIds++

    for (let x = min[0]; x <= max[0]; ++x) {
      for (let y = min[1]; y <= max[1]; ++y) {
        const index = this._index(x, y)

        this.grid[index].forEach(neighbor => {
          if (neighbor.queryId != this.queryIds && neighbor !== client) {
            neighbor.queryId = this.queryIds
            queries.push(neighbor)
          }
        })
      }
    }

    return queries
  }

  _index(x, y) {
    return y * this.columns + x
  }

  _clamp(value, min = 0, max = 1) {
    return value < min ? min : value > max ? max : value
  }

  _range(x, y, width, height) {
    const minX = this._clamp(
      Math.floor((x - width) / this.scale),
      0,
      this.columns - 1
    )
    const minY = this._clamp(
      Math.floor((y - height) / this.scale),
      0,
      this.rows - 1
    )
    const maxX = this._clamp(
      Math.floor((x + width) / this.scale),
      0,
      this.columns - 1
    )
    const maxY = this._clamp(
      Math.floor((y + height) / this.scale),
      0,
      this.rows - 1
    )

    return [
      [minX, minY],
      [maxX, maxY]
    ]
  }
}
