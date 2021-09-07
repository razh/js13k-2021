import { geom_create, geom_push } from './geom.js';
import { vec3_clone, vec3_create, vec3_lerp, vec3_setLength } from './vec3.js';

export var polyhedronGeom_create = (geom, radius = 1, detail = 0) => {
  // subdivide
  var a = vec3_create();
  var b = vec3_create();
  var c = vec3_create();

  var vertices = [];
  var faces = [];
  var faceIndex = 0;

  geom.faces.map(face => {
    Object.assign(a, geom.vertices[face.a]);
    Object.assign(b, geom.vertices[face.b]);
    Object.assign(c, geom.vertices[face.c]);

    // subdivideFace
    var cols = detail + 1;
    var v = [];

    for (var i = 0; i <= cols; i++) {
      v[i] = [];

      var aj = vec3_lerp(vec3_clone(a), c, i / cols);
      var bj = vec3_lerp(vec3_clone(b), c, i / cols);

      var rows = cols - i;

      for (var j = 0; j <= rows; j++) {
        if (j === 0 && i === cols) {
          v[i][j] = aj;
        } else {
          v[i][j] = vec3_lerp(vec3_clone(aj), bj, j / rows);
        }
      }
    }

    for (i = 0; i < cols; i++) {
      for (j = 0; j < 2 * (cols - i) - 1; j++) {
        var k = Math.floor(j / 2);
        if (j % 2 === 0) {
          vertices.push(v[i][k + 1], v[i + 1][k], v[i][k]);
        } else {
          vertices.push(v[i][k + 1], v[i + 1][k + 1], v[i + 1][k]);
        }
        faces.push(faceIndex++, faceIndex++, faceIndex++);
      }
    }
  });

  // applyRadius
  vertices.map(vertex => vec3_setLength(vertex, radius));

  return Object.assign(geom_push(geom_create(), [], faces), { vertices });
};

export var icosahedronGeom_create = (radius, detail) => {
  var t = (1 + Math.sqrt(5)) / 2;

  // prettier-ignore
  var vertices = [
    -1, t, 0,
    1, t, 0,
    -1, -t, 0,
    1, -t, 0,
    0, -1, t,
    0, 1, t,
    0, -1, -t,
    0, 1, -t,
    t, 0, -1,
    t, 0, 1,
    -t, 0, -1,
    -t, 0, 1,
  ];

  // prettier-ignore
  var indices = [
    0, 11, 5,
    0, 5, 1,
    0, 1, 7,
    0, 7, 10,
    0, 10, 11,
    1, 5, 9,
    5, 11, 4,
    11, 10, 2,
    10, 7, 6,
    7, 1, 8,
    3, 9, 4,
    3, 4, 2,
    3, 2, 6,
    3, 6, 8,
    3, 8, 9,
    4, 9, 5,
    2, 4, 11,
    6, 2, 10,
    8, 6, 7,
    9, 8, 1,
  ];

  return polyhedronGeom_create(
    geom_push(geom_create(), vertices, indices),
    radius,
    detail,
  );
};
