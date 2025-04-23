import { Body } from './Body.js';
import { Vertices } from './Vertices.js';
import { Vec2 } from './Vec2.js';

export const Bodies = {
  circle: function (x, y, radius, option = {}) {
    if (typeof option != 'object') {
      console.warn(`
        Bodies.circle( 
          x: Number, 
          y: Number, 
          radius: Number
          option: {}
        )
      `);
      throw `Body's option must be of type object!`;
    }

    const properties = {
      label: 'circle',
      type: 'rigid',
      position: new Vec2(x, y),
      axisPoint: new Vec2(x + radius, y),
      radius: radius
    };

    return new Body(properties, option);
  },

  rectangle: function (x, y, width, height, option = {}) {
    if (typeof option != 'object') {
      console.warn(`
        Bodies.rectangle( 
          x: Number, 
          y: Number, 
          width: Number, 
          height: Number,
          option: {}
        )
      `);
      throw `Body's option must be of type object!`;
    }

    const vertices = [
      new Vec2(x - width * 0.5, y - height * 0.5),
      new Vec2(x + width * 0.5, y - height * 0.5),
      new Vec2(x + width * 0.5, y + height * 0.5),
      new Vec2(x - width * 0.5, y + height * 0.5)
    ];

    const properties = {
      label: 'rectangle',
      type: 'rigid',
      position: new Vec2(x, y),
      axisPoint: new Vec2(
        width > height
          ? x + width * 0.5
          : width == height
          ? x + width * 0.5
          : x,
        height > width ? y + height * 0.5 : height == width ? y : y
      ),
      vertices: vertices,
      width: width,
      height: height
    };

    return new Body(properties, option);
  },

  capsule: function (x, y, radius, height, option = {}) {
    if (typeof option != 'object') {
      console.warn(`
        Bodies.capsule( 
          x: Number, 
          y: Number, 
          radius: Number,
          height: Number
          option: {}
        )
      `);
      throw `Body's option must be of type object!`;
    }

    const vertices = [
      new Vec2(x - radius, y - height * 0.5),
      new Vec2(x + radius, y - height * 0.5),
      new Vec2(x + radius, y + height * 0.5),
      new Vec2(x - radius, y + height * 0.5)
    ];

    const properties = {
      label: 'capsule',
      type: 'rigid',
      position: new Vec2(x, y),
      startPoint: new Vec2(x, y - height * 0.5),
      endPoint: new Vec2(x, y + height * 0.5),
      vertices: vertices,
      radius: radius,
      height: height
    };

    return new Body(properties, option);
  },

  polygon: function (vertices = [], option = {}) {
    if (typeof option != 'object') {
      console.log(`
        Bodies.polygon( 
          vertices: [{x, y}]
          option: {}
        )
      `);
      throw `Body's option must be of type object!`;
    }

    if (vertices.length < 3)
      throw `Polygon's body expects atleast 3 or more vertices!`;

    if (!Vertices.isConvex(vertices)) {
      console.warn('Please provide a valid shape.');
      throw `Currently the engine doesn't support a concave polygon!`;
    }

    vertices = vertices.map(point => new Vec2(point.x, point.y));

    const centroid = Vertices.centroid(vertices);
    const direction = Vec2.subtract(vertices[0], centroid);
    const axisPoint = Vec2.add(centroid, direction);
    const properties = {
      label: 'polygon',
      type: 'rigid',
      position: new Vec2(centroid.x, centroid.y),
      axisPoint: axisPoint,
      vertices: vertices,
      radius: Math.abs(direction.x)
    };

    return new Body(properties, option);
  },

  log: function () {
    console.log(`
      Bodies.circle( 
        x: Number, 
        y: Number, 
        radius: Number,
        option: {}
      )
      
      Bodies.rectangle( 
        x: Number, 
        y: Number, 
        width: Number,
        height: Number,
        option: {}
      )
      
      Bodies.capsule( 
        x: Number, 
        y: Number, 
        radius: Number,
        height: Number,
        option: {}
      )
      
      Bodies.polygon( 
        vertices: [{x, y}]
        option: {}
      )
    `);
  }
};
