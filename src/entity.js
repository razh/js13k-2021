export var component_create = (update, options) => ({
  parent: undefined,
  update,
  ...options,
});

export var entity_add = (entity, component) => {
  component.parent = entity;
  entity.components.push(component);
  return entity;
};

export var entity_has = (entity, component) =>
  entity.components.includes(component);

export var entity_find = (entity, predicate) =>
  entity.components.find(predicate);

export var entity_filter = (entity, predicate) =>
  entity.components.filter(predicate);

export var entity_remove = (entity, component) => {
  var index = entity.components.indexOf(component);

  if (index >= 0) {
    entity.components
      .splice(index, 1)
      .map(component => (component.parent = undefined));
  }
};

export var entity_update = (entity, ...args) =>
  entity.components.map(component => component.update(...args));
