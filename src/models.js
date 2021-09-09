import { colors } from './boxColors.js';
import { boxGeom_create } from './boxGeom.js';
import {
  all,
  nx,
  nx_nz,
  nx_pz,
  nz,
  px,
  px_nz,
  px_pz,
  pz,
} from './boxIndices.js';
import {
  $translate,
  $translateX,
  $translateZ,
  relativeAlign,
} from './boxTransforms.js';
import { geom_create, merge, translate } from './geom.js';
import { mat4_create, mat4_lookAt, mat4_setPosition } from './mat4.js';
import { randFloat } from './math.js';
import { flow } from './utils.js';
import {
  vec3_addScaledVector,
  vec3_applyMatrix4,
  vec3_create,
  vec3_cross,
  vec3_length,
  vec3_normalize,
  vec3_setScalar,
  vec3_subVectors,
  vec3_Y,
} from './vec3.js';

var _vector = vec3_create();

export var box = (dimensions, ...transforms) =>
  flow(...transforms)(boxGeom_create(...dimensions));

export var mergeAll = (...geoms) => flow(...geoms.map(merge))(geom_create());

export var greeble_create = (() => {
  var _v0 = vec3_create();
  var _v1 = vec3_create();
  var _matrix = mat4_create();
  var origin = vec3_create();

  var triangle_getArea = (a, b, c) =>
    vec3_length(
      vec3_cross(vec3_subVectors(_v0, c, b), vec3_subVectors(_v1, a, b)),
    ) * 0.5;

  var triangle_getNormal = (a, b, c) =>
    vec3_normalize(
      vec3_cross(vec3_subVectors(_v0, c, b), vec3_subVectors(_v1, a, b)),
    );

  var randomPointInTriangle = (vA, vB, vC) => {
    var a = Math.random();
    var b = Math.random();

    if (a + b > 1) {
      a = 1 - a;
      b = 1 - b;
    }

    var c = 1 - a - b;

    return vec3_addScaledVector(
      vec3_addScaledVector(
        vec3_addScaledVector(vec3_setScalar(_vector, 0), vA, a),
        vB,
        b,
      ),
      vC,
      c,
    );
  };

  return (geom, count, fn) => {
    var totalArea = 0;
    var cumulativeAreas = geom.faces.map(face => {
      totalArea += triangle_getArea(
        geom.vertices[face.a],
        geom.vertices[face.b],
        geom.vertices[face.c],
      );
      return totalArea;
    });

    var binarySearch = x => {
      var start = 0;
      var end = cumulativeAreas.length - 1;

      while (start <= end) {
        var middle = Math.ceil((start + end) / 2);
        if (
          !middle ||
          (cumulativeAreas[middle - 1] <= x && cumulativeAreas[middle] > x)
        ) {
          return middle;
        } else if (x < cumulativeAreas[middle]) {
          end = middle - 1;
        } else {
          start = middle + 1;
        }
      }

      return -1;
    };

    return mergeAll(
      ...[...Array(count)].map(() => {
        var r = Math.random() * totalArea;
        var index = binarySearch(r);

        var face = geom.faces[index];
        var vA = geom.vertices[face.a];
        var vB = geom.vertices[face.b];
        var vC = geom.vertices[face.c];

        var point = randomPointInTriangle(vA, vB, vC);
        var normal = triangle_getNormal(vA, vB, vC);
        mat4_setPosition(mat4_lookAt(_matrix, origin, normal, vec3_Y), point);

        var greeble = fn();
        greeble.vertices.map(vertex => vec3_applyMatrix4(vertex, _matrix));
        return greeble;
      }),
    );
  };
})();

export var platform_create = (width, height, depth, strokeWidth) => {
  var innerWidth = width - 4 * strokeWidth;
  var innerDepth = depth - 4 * strokeWidth;

  var base = box([width - 2 * strokeWidth, height, innerDepth]);
  var frontBase = box(
    [innerWidth, height, strokeWidth],
    relativeAlign(nz, base, pz),
    $translateX([nx_nz, -strokeWidth], [px_nz, strokeWidth]),
  );
  var backBase = box(
    [innerWidth, height, strokeWidth],
    relativeAlign(pz, base, nz),
    $translateX([nx_pz, -strokeWidth], [px_pz, strokeWidth]),
  );

  var strokeDimensions = [strokeWidth, height, strokeWidth];
  var strokeColor = colors([all, 0.5]);
  var halfStrokeWidth = strokeWidth / 2;

  return mergeAll(
    base,
    frontBase,
    backBase,
    box(
      [innerWidth, height, strokeWidth],
      relativeAlign(nz, frontBase, pz),
      $translateX([nx_pz, -halfStrokeWidth], [px_pz, halfStrokeWidth]),
      strokeColor,
    ),
    box(
      [innerWidth, height, strokeWidth],
      relativeAlign(pz, backBase, nz),
      $translateX([nx_nz, -halfStrokeWidth], [px_nz, halfStrokeWidth]),
      strokeColor,
    ),
    box(
      [strokeWidth, height, innerDepth],
      relativeAlign(nx, base, px),
      $translateZ([px_nz, -halfStrokeWidth], [px_pz, halfStrokeWidth]),
      strokeColor,
    ),
    box(
      [strokeWidth, height, innerDepth],
      relativeAlign(px, base, nx),
      $translateZ([nx_nz, -halfStrokeWidth], [nx_pz, halfStrokeWidth]),
      strokeColor,
    ),
    box(
      strokeDimensions,
      relativeAlign(nx_nz, base, px_pz),
      $translate(
        [px, { z: halfStrokeWidth }],
        [pz, { x: -strokeWidth }],
        [px_pz, { x: -halfStrokeWidth, z: halfStrokeWidth }],
      ),
      strokeColor,
    ),
    box(
      strokeDimensions,
      relativeAlign(px_nz, base, nx_pz),
      $translate(
        [nx, { z: halfStrokeWidth }],
        [pz, { x: strokeWidth }],
        [nx_pz, { x: halfStrokeWidth, z: halfStrokeWidth }],
      ),
      strokeColor,
    ),
    box(
      strokeDimensions,
      relativeAlign(nx_pz, base, px_nz),
      $translate(
        [px, { z: -halfStrokeWidth }],
        [nz, { x: -strokeWidth }],
        [px_nz, { x: -halfStrokeWidth, z: -halfStrokeWidth }],
      ),
      strokeColor,
    ),
    box(
      strokeDimensions,
      relativeAlign(px_pz, base, nx_nz),
      $translate(
        [nx, { z: -halfStrokeWidth }],
        [nz, { x: strokeWidth }],
        [nx_nz, { x: halfStrokeWidth, z: -halfStrokeWidth }],
      ),
      strokeColor,
    ),
  );
};

export var starfield_create = (innerRadius, outerRadius, count) => {
  var stars = [];
  var size = 16;

  for (var i = 0; i < count; i++) {
    var theta = 2 * Math.PI * Math.random();
    var u = 2 * Math.random() - 1;
    var v = Math.sqrt(1 - u * u);
    var radius = randFloat(innerRadius, outerRadius);

    stars.push(
      box(
        [size, size, size],
        translate(
          radius * v * Math.cos(theta),
          radius * v * Math.sin(theta),
          radius * u,
        ),
      ),
    );
  }

  return mergeAll(...stars);
};
