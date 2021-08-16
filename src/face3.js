import { vec3_clone, vec3_create } from './vec3.js';

export var face3_create = (a, b, c) => ({
  a,
  b,
  c,
  color: vec3_create(1, 1, 1),
  vertexColors: [],
});

export var face3_clone = face => ({
  a: face.a,
  b: face.b,
  c: face.c,
  color: vec3_clone(face.color),
  vertexColors: face.vertexColors.map(vec3_clone),
});
