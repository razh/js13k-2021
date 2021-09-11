export var flow = (...fns) => initialValue =>
  fns.reduce((value, fn) => fn(value), initialValue);

export var rearg = fn => (...args) => value => fn(value, ...args);

export var remove = (array, element) => {
  var index = array.indexOf(element);
  if (index >= 0) array.splice(index, 1);
};

export var sample = array => array[(Math.random() * array.length) | 0];
