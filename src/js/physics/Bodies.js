import { Body } from './Body.js';
import { Vertices } from './Vertices.js';
import { Vector2 } from './Vector2.js';

export const Bodies = {
  circle: function (x, y, radius, option) {
    if (typeof option !== 'object') option = {};

    const properties = {
      label: 'circle',
      type: 'rigid',
      position: new Vector2(x, y),
      axisPoint: new Vector2(x + radius, y),
      radius: radius
    };

    return new Body(properties, option);
  },

  rectangle: function (x, y, width, height, option) {
    if (typeof option !== 'object') option = {};

    const vertices = [
      new Vector2(x - width * 0.5, y - height * 0.5),
      new Vector2(x + width * 0.5, y - height * 0.5),
      new Vector2(x + width * 0.5, y + height * 0.5),
      new Vector2(x - width * 0.5, y + height * 0.5)
    ];

    const properties = {
      label: 'rectangle',
      type: 'rigid',
      position: new Vector2(x, y),
      axisPoint: new Vector2(
        width > height
          ? x + width * 0.5
          : width === height
          ? x + width * 0.5
          : x,
        height > width ? y + height * 0.5 : height === width ? y : y
      ),
      vertices: vertices,
      width: width,
      height: height
    };

    return new Body(properties, option);
  },

  pill: function (x, y, radius, height, option) {
    if (typeof option !== 'object') option = {};

    const vertices = [
      new Vector2(x - radius, y - height * 0.5),
      new Vector2(x + radius, y - height * 0.5),
      new Vector2(x + radius, y + height * 0.5),
      new Vector2(x - radius, y + height * 0.5)
    ];

    const properties = {
      label: 'pill',
      type: 'rigid',
      position: new Vector2(x, y),
      startPoint: new Vector2(x, y - height * 0.5),
      endPoint: new Vector2(x, y + height * 0.5),
      vertices: vertices,
      radius: radius,
      height: height
    };

    return new Body(properties, option);
  },

  polygon: function (x, y, radius, sides, option) {
    if (typeof option !== 'object') option = {};

    sides = sides < 3 ? 3 : sides > 8 ? 8 : sides;

    const vertices = [];
    let axisPoint = null;

    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;

      vertices.push(
        new Vector2(x + radius * Math.cos(angle), y + radius * Math.sin(angle))
      );
    }

    axisPoint = new Vector2(x + radius, y);

    const properties = {
      label: 'polygon',
      type: 'rigid',
      position: new Vector2(x, y),
      axisPoint: axisPoint,
      vertices: vertices,
      radius: radius
    };

    return new Body(properties, option);
  }
};
