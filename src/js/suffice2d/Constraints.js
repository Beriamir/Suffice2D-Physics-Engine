import { Constraint } from './Constraint.js';

export const Constraints = {
  ids: 0,
  distanceJoint: function (engine, option) {
    const properties = {
      id: option.id ?? Constraints.ids++,
      label: 'distanceJoint',
      engine
    };

    return new Constraint(properties, option);
  },
  revoluteJoint: function (engine, option) {
    const properties = {
      id: option.id ?? Constraints.ids++,
      label: 'revoluteJoint',
      engine
    };

    return new Constraint(properties, option);
  },
  springJoint: function (engine, option) {
    const properties = {
      id: option.id ?? Constraints.ids++,
      label: 'springJoint',
      engine
    };

    return new Constraint(properties, option);
  },
  fixedJoint: function (engine, option) {
    const properties = {
      id: option.id ?? Constraints.ids++,
      label: 'fixedJoint',
      engine
    };

    return new Constraint(properties, option);
  },
  prismaticJoint: function (engine, option) {
    const properties = {
      id: option.id ?? Constraints.ids++,
      label: 'prismaticJoint',
      engine
    };

    return new Constraint(properties, option);
  }
};
