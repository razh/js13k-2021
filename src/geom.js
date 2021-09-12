import { face3_clone, face3_create } from './face3.js';
import { rearg } from './utils.js';
import {
  vec3_add,
  vec3_applyQuaternion,
  vec3_clone,
  vec3_create,
  vec3_multiply,
  vec3_set,
} from './vec3.js';

var _vector = vec3_create();

export var geom_create = () => ({
  vertices: [],
  faces: [],
});

export var geom_push = (geom, vertices, faces) => {
  var offset = geom.vertices.length;

  for (var i = 0; i < vertices.length; ) {
    geom.vertices.push(
      vec3_create(vertices[i++], vertices[i++], vertices[i++]),
    );
  }

  for (i = 0; i < faces.length; ) {
    geom.faces.push(
      face3_create(
        offset + faces[i++],
        offset + faces[i++],
        offset + faces[i++],
      ),
    );
  }

  return geom;
};

export var geom_applyQuaternion = (geom, q) => {
  geom.vertices.map(vertex => vec3_applyQuaternion(vertex, q));
  return geom;
};

export var geom_translate = (geom, x, y, z) => {
  vec3_set(_vector, x, y, z);
  geom.vertices.map(vertex => vec3_add(vertex, _vector));
  return geom;
};

export var geom_scale = (geom, x, y, z) => {
  vec3_set(_vector, x, y, z);
  geom.vertices.map(vertex => vec3_multiply(vertex, _vector));
  return geom;
};

export var geom_merge = (a, b) => {
  var vertexOffset = a.vertices.length;

  a.vertices.push(...b.vertices.map(vec3_clone));

  a.faces.push(
    ...b.faces.map(face => {
      var faceCopy = face3_clone(face);
      faceCopy.a += vertexOffset;
      faceCopy.b += vertexOffset;
      faceCopy.c += vertexOffset;
      return faceCopy;
    }),
  );

  return a;
};

export var geom_clone = geom => {
  var clone = geom_create();
  clone.vertices = geom.vertices.map(vec3_clone);
  clone.faces = geom.faces.map(face3_clone);
  return clone;
};

export var translate = rearg(geom_translate);
export var scale = rearg(geom_scale);
export var merge = rearg(geom_merge);
export var clone = rearg(geom_clone);
