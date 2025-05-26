import { Constraint } from './Constraint.js';

export const Constraints = {
  ids: 0,
  distanceJoint: function (engine, option = {}) {
    const properties = {
      id: option.id ?? Constraints.ids++,
      label: 'distanceJoint',
      selfCollision: option.selfCollision || false,
      engine
    };

    return new Constraint(properties);
  },
  revoluteJoint: function (engine, option = {}) {
    const properties = {
      id: option.id ?? Constraints.ids++,
      label: 'revoluteJoint',
      selfCollision: option.selfCollision || false,
      engine
    };

    return new Constraint(properties);
  },
  springJoint: function (engine, option = {}) {
    const properties = {
      id: option.id ?? Constraints.ids++,
      label: 'springJoint',
      selfCollision: option.selfCollision || false,
      engine
    };

    return new Constraint(properties);
  },
  fixedJoint: function (engine, option = {}) {
    const properties = {
      id: option.id ?? Constraints.ids++,
      label: 'fixedJoint',
      selfCollision: option.selfCollision || false,
      engine
    };

    return new Constraint(properties);
  },
  prismaticJoint: function (engine, option = {}) {
    const properties = {
      id: option.id ?? Constraints.ids++,
      label: 'prismaticJoint',
      selfCollision: option.selfCollision || false,
      engine
    };

    return new Constraint(properties);
  }
};
