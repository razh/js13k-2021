import { boxGeom_create } from './boxGeom.js';
import { nx, ny, nz, px, py, pz } from './boxIndices.js';
import { geom_translate } from './geom.js';
import { rearg } from './utils.js';
import {
  vec3_add,
  vec3_create,
  vec3_divideScalar,
  vec3_fromArray,
  vec3_multiply,
  vec3_set,
  vec3_setScalar,
  vec3_setX,
  vec3_setY,
  vec3_setZ,
  vec3_subVectors,
} from './vec3.js';

var _vector = vec3_create();

var centroidA = vec3_create();
var centroidB = vec3_create();

// Color#set().
export var setVector = (vector, value, identity) => {
  if (Array.isArray(value)) {
    vec3_set(vector, ...value);
  } else if (typeof value === 'object') {
    Object.assign(vector, identity, value);
  } else if (typeof value === 'number') {
    vec3_setScalar(vector, value);
  }
};

var computeCentroid = (geom, indices, vector) => {
  vec3_setScalar(vector, 0);

  indices.map(index => vec3_add(vector, geom.vertices[index]));
  vec3_divideScalar(vector, indices.length);

  return vector;
};

var alignBoxVertices = (geom, indices) => {
  computeCentroid(geom, indices, _vector);
  return geom_translate(geom, -_vector.x, -_vector.y, -_vector.z);
};

var relativeAlignBoxVertices = (geomA, indicesA, geomB, indicesB) => {
  computeCentroid(geomA, indicesA, centroidA);
  computeCentroid(geomB, indicesB, centroidB);

  vec3_subVectors(_vector, centroidA, centroidB);
  return geom_translate(geomA, -_vector.x, -_vector.y, -_vector.z);
};

export var align = rearg(alignBoxVertices);
export var relativeAlign = rearg(relativeAlignBoxVertices);

var transformBoxVertices = (method, identity = vec3_create()) => (
  geom,
  ...vectors
) => {
  vectors.map(([indices, delta]) => {
    setVector(_vector, delta, identity);
    indices.map(index => method(geom.vertices[index], _vector));
  });

  return geom;
};

export var $translate = rearg(transformBoxVertices(vec3_add));
export var $scale = rearg(
  transformBoxVertices(vec3_multiply, vec3_create(1, 1, 1)),
);

var transformAxisBoxVertices = (method, identity = vec3_create()) => axis => (
  geom,
  ...vectors
) => {
  vectors.map(([indices, delta = identity[axis]]) => {
    Object.assign(_vector, identity);
    _vector[axis] = delta;
    indices.map(index => method(geom.vertices[index], _vector));
  });

  return geom;
};

var translateAxisBoxVertices = transformAxisBoxVertices(vec3_add);

export var $translateX = rearg(translateAxisBoxVertices('x'));
export var $translateY = rearg(translateAxisBoxVertices('y'));
export var $translateZ = rearg(translateAxisBoxVertices('z'));

var callBoxVertices = method => (geom, ...vectors) => {
  vectors.map(([indices, value]) =>
    indices.map(index => method(geom.vertices[index], value)),
  );

  return geom;
};

export var $set = rearg(callBoxVertices(vec3_fromArray));
export var $setX = rearg(callBoxVertices(vec3_setX));
export var $setY = rearg(callBoxVertices(vec3_setY));
export var $setZ = rearg(callBoxVertices(vec3_setZ));

export var extrude = (() => {
  var identity = vec3_create();
  var oppositeIndices = new Map([
    [px, nx],
    [py, ny],
    [pz, nz],
    [nx, px],
    [ny, py],
    [nz, pz],
  ]);

  return (geom, indicesA, delta) => {
    setVector(_vector, delta, identity);
    var indicesB = oppositeIndices.get(indicesA);

    var extrudedGeom = boxGeom_create();
    indicesA.map((indexA, index) => {
      var indexB = indicesB[index];
      Object.assign(
        extrudedGeom.vertices[
          indicesB === px || indicesB === nx
            ? // Transform px [0, 1, 2, 3] to nx [5, 4, 7, 6] and nx to px.
              indexB ^ 1
            : indexB
        ],
        geom.vertices[indexA],
      );
      vec3_add(
        Object.assign(extrudedGeom.vertices[indexA], geom.vertices[indexA]),
        _vector,
      );
    });
    return extrudedGeom;
  };
})();

export var deleteFaces = rearg((geom, ...faceIndices) => {
  faceIndices
    .flat()
    .sort((a, b) => a - b)
    .reverse()
    .map(index => geom.faces.splice(index, 1));
  return geom;
});
