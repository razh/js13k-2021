export var clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export var lerp = (x, y, t) => (1 - t) * x + t * y;

export var mapLinear = (x, a1, a2, b1, b2) =>
  b1 + ((x - a1) * (b2 - b1)) / (a2 - a1);

export var randFloat = (low, high) => low + Math.random() * (high - low);

export var randFloatSpread = range => range * (0.5 - Math.random());
