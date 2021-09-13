import { box3_getCenter, box3_getSize } from './box3.js';
import { colors, faceColors } from './boxColors.js';
import { boxGeom_create } from './boxGeom.js';
import {
  all,
  face_nx,
  face_ny,
  face_nz,
  face_px,
  face_py,
  face_pz,
  nx,
  nx_ny,
  nx_ny_pz,
  nx_nz,
  nx_py,
  nx_py_nz,
  nx_py_pz,
  nx_pz,
  ny,
  ny_pz,
  nz,
  px,
  px_ny,
  px_ny_pz,
  px_nz,
  px_py,
  px_py_nz,
  px_py_pz,
  px_pz,
  py,
  py_nz,
  py_pz,
  pz,
} from './boxIndices.js';
import {
  $scale,
  $translate,
  $translateX,
  $translateZ,
  align,
  deleteFaces,
  extrude,
  relativeAlign,
} from './boxTransforms.js';
import { DEBUG, gravity } from './constants.js';
import { component_create, entity_add } from './entity.js';
import { geom_applyQuaternion, geom_create, merge, translate } from './geom.js';
import { mat4_create, mat4_lookAt, mat4_setPosition } from './mat4.js';
import { material_create } from './material.js';
import { randFloat, randFloatSpread } from './math.js';
import { mesh_create } from './mesh.js';
import {
  object3d_add,
  object3d_create,
  object3d_lookAt,
  object3d_remove,
} from './object3d.js';
import { quat_create, quat_setFromEuler } from './quat.js';
import { flow, sample } from './utils.js';
import {
  vec3_add,
  vec3_addScaledVector,
  vec3_applyMatrix4,
  vec3_clone,
  vec3_create,
  vec3_cross,
  vec3_length,
  vec3_multiply,
  vec3_multiplyScalar,
  vec3_normalize,
  vec3_set,
  vec3_setLength,
  vec3_setScalar,
  vec3_subVectors,
  vec3_Y,
} from './vec3.js';

var EPSILON = 1e-2;

var _quat = quat_create();
var _vector = vec3_create();

export var box = (dimensions, ...transforms) =>
  flow(...transforms)(boxGeom_create(...dimensions));

export var mergeAll = (...geoms) => flow(...geoms.map(merge))(geom_create());

export var spaceBetween = (start, end, count) => {
  var spacing = (end - start) / (count + 1);
  return [...Array(count)].map((_, index) => start + spacing * (index + 1));
};

export var bridge_create = (start, end, width, height) => {
  vec3_subVectors(_vector, end, start);
  var dx = _vector.x;
  var dz = _vector.z;

  if (DEBUG && (dx < 0 || dz < 0)) {
    throw new Error('bridge_create: start is after end');
  }

  return box(
    dx ? [dx, height, width] : [width, height, dz],
    align(dx ? nx_py : py_nz),
    translate(start.x, start.y, start.z),
  );
};

export var column_create = (
  columnWidth,
  columnHeight,
  columnDepth = columnWidth,
) => {
  var base = box(
    [columnDepth, (3 / 16) * columnHeight, columnWidth],
    align(ny),
  );
  var middle = flow(
    () => extrude(base, py, { y: (3 / 4) * columnHeight }),
    $translateX([px_py, -columnDepth / 2]),
    deleteFaces(face_ny),
  )();
  var top = flow(
    () => extrude(middle, py, { y: (1 / 16) * columnHeight }),
    $translateX([px_py, -columnDepth / 2]),
    deleteFaces(face_ny),
  )();

  return mergeAll(base, middle, top);
};

var disintegrationGeometry = boxGeom_create(1, 1, 1);
var disintegrationMaterial = material_create();
vec3_setScalar(disintegrationMaterial.emissive, 1);

var disintegrationCoreMaterial = material_create();
vec3_setScalar(disintegrationCoreMaterial.color, 0);

export var disintegration_create = (boundingBox, count) => {
  var disintegration = object3d_create();
  var decay = 5;
  var center = box3_getCenter(boundingBox, vec3_create());
  var size = box3_getSize(boundingBox, vec3_create());
  var strokeWidth = 2;

  var velocities = [...Array(count)].map(() => {
    var sprite = mesh_create(disintegrationGeometry, disintegrationMaterial);
    sprite.castShadow = true;
    vec3_set(
      sprite.scale,
      randFloat(4, size.x),
      randFloat(4, 2 * size.y),
      randFloat(4, size.z),
    );
    vec3_set(
      sprite.position,
      randFloatSpread(0.5),
      randFloatSpread(0.5),
      randFloatSpread(0.5),
    );
    var spriteCore = mesh_create(
      disintegrationGeometry,
      disintegrationCoreMaterial,
    );
    vec3_set(
      spriteCore.scale,
      1 - strokeWidth / sprite.scale.x,
      1 - strokeWidth / sprite.scale.y,
      1 - strokeWidth / sprite.scale.z,
    );
    sprite.scale.x *= -1;
    object3d_add(sprite, spriteCore);
    vec3_add(vec3_multiply(sprite.position, size), center);
    object3d_add(disintegration, sprite);
    return vec3_create(0, randFloat(32, 256), 0);
  });

  return entity_add(
    disintegration,
    component_create(dt => {
      var visibleCount = 0;

      disintegration.children.map((sprite, index) => {
        vec3_addScaledVector(sprite.position, velocities[index], dt);
        vec3_multiplyScalar(sprite.scale, 1 - decay * dt);

        if (vec3_length(sprite.scale) > EPSILON) {
          visibleCount++;
        }
      });

      if (!visibleCount) {
        object3d_remove(disintegration.parent, disintegration);
      }
    }),
  );
};

export var dreadnought_create = () => {
  var frontLength = 12288;
  var width = 3072;

  var sideGap = 512;
  var sideWidth = (width - sideGap) / 2;

  var deckHeight = 128;
  var centerHeight = 512;
  var slopeWidth = (5 / 6) * sideWidth;

  var coreWidth = 1.5 * sideGap;
  var coreHeight = 0.75 * centerHeight;
  var coreLength = 3072;

  var frontRightDeck = box(
    [sideWidth, deckHeight, frontLength],
    align(px),
    $translateX([nx_pz, slopeWidth], [all, -sideGap / 2]),
    $translate([ny_pz, { y: deckHeight }]),
    deleteFaces(face_py),
  );
  var frontRightCenter = flow(
    () => extrude(frontRightDeck, py, { y: centerHeight }),
    $translate([nx_nz, { x: slopeWidth }], [py_pz, { y: -centerHeight }]),
    deleteFaces(face_nx, face_ny),
  )();
  var frontRightSlope = flow(
    () => extrude(frontRightCenter, nx, { x: -slopeWidth }),
    $translate([nx_pz, { x: slopeWidth }], [nx_py_nz, { y: -centerHeight }]),
    deleteFaces(face_px, face_ny),
  )();

  var frontLeftDeck = box(
    [sideWidth, deckHeight, frontLength],
    align(nx),
    $translateX([px_pz, -slopeWidth], [all, sideGap / 2]),
    $translate([ny_pz, { y: deckHeight }]),
    deleteFaces(face_py),
  );
  var frontLeftCenter = flow(
    () => extrude(frontLeftDeck, py, { y: centerHeight }),
    $translate([px_nz, { x: -slopeWidth }], [py_pz, { y: -centerHeight }]),
    deleteFaces(face_px, face_ny),
  )();
  var frontLeftSlope = flow(
    () => extrude(frontLeftCenter, px, { x: slopeWidth }),
    $translate([px_pz, { x: -slopeWidth }], [px_py_nz, { y: -centerHeight }]),
    deleteFaces(face_nx, face_ny),
  )();

  var geom = mergeAll(
    frontRightDeck,
    frontRightCenter,
    frontRightSlope,
    frontLeftDeck,
    frontLeftCenter,
    frontLeftSlope,
    box(
      [coreWidth, coreHeight, coreLength],
      align(ny_pz),
      $translate(
        [all, { z: -frontLength / 3 }],
        [py_nz, { y: -coreHeight / 3 }],
      ),
    ),
  );

  return mergeAll(
    geom,
    greeble_create(geom, 2048, () =>
      box(
        [randFloat(16, 128), randFloat(16, 128), randFloat(16, 64)],
        align(pz),
      ),
    ),
  );
};

var explosionGeometry = box([0.5, 0.5, 1]);
var explosionMaterials = [
  [1, 1, 1],
  [1, 0.75, 0],
  [1, 0.5, 0],
].map(color => {
  var material = material_create();
  vec3_set(material.color, ...color);
  vec3_set(material.emissive, ...color);
  return material;
});

export var explosion_create = count => {
  var explosion = object3d_create();
  var decay = 8;

  var velocities = [...Array(count)].map(() => {
    var sprite = mesh_create(explosionGeometry, sample(explosionMaterials));
    sprite.castShadow = true;
    vec3_setScalar(sprite.scale, randFloat(1, 8));
    vec3_set(
      sprite.position,
      randFloatSpread(4),
      randFloatSpread(4),
      randFloatSpread(4),
    );
    object3d_add(explosion, sprite);
    var velocity = vec3_setLength(
      vec3_clone(sprite.position),
      randFloat(64, 128),
    );
    object3d_lookAt(sprite, velocity);
    return velocity;
  });

  return entity_add(
    explosion,
    component_create(dt => {
      var visibleCount = 0;

      explosion.children.map((sprite, index) => {
        vec3_addScaledVector(
          sprite.position,
          vec3_addScaledVector(velocities[index], gravity, dt),
          dt,
        );
        vec3_multiplyScalar(sprite.scale, 1 - decay * dt);

        if (vec3_length(sprite.scale) > EPSILON) {
          visibleCount++;
        }
      });

      if (!visibleCount) {
        object3d_remove(explosion.parent, explosion);
      }
    }),
  );
};

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

export var phantom_create = () => {
  var width = 40;
  var height = 72;
  var depth = 16;
  var gap = 4;

  var sideWidth = (width - gap) / 2;
  var sideHeight = 56;

  var eyeColor = vec3_create(16, 1, 1);
  var eyeSize = 8;

  var head = box(
    [width, height - sideHeight - gap, depth],
    align(ny),
    $translate(
      [all, { y: sideHeight + gap }],
      [px_py, { x: -width / 2 }],
      [nx_py, { x: width / 2 }],
      [py_pz, { z: -depth }],
      [px_ny_pz, { x: -width / 2 }],
      [nx_ny_pz, { x: width / 2 }],
      [ny_pz, { y: -2 * gap }],
    ),
  );
  var rightSide = box(
    [sideWidth, sideHeight, depth],
    align(px_ny),
    $translate(
      [all, { x: -gap / 2 }],
      [nx_ny, { x: sideWidth }],
      [px_py, { y: -2 * gap }],
      [ny_pz, { z: -depth }],
      [nx_py_pz, { z: -depth }],
    ),
  );
  var leftSide = box(
    [sideWidth, sideHeight, depth],
    align(nx_ny),
    $translate(
      [all, { x: gap / 2 }],
      [px_ny, { x: -sideWidth }],
      [nx_py, { y: -2 * gap }],
      [ny_pz, { z: -depth }],
      [px_py_pz, { z: -depth }],
    ),
  );

  var eye = box(
    [eyeSize, eyeSize, eyeSize],
    geom =>
      geom_applyQuaternion(
        geom,
        quat_setFromEuler(
          _quat,
          vec3_set(_vector, Math.PI / 4, -Math.PI / 4, 0),
        ),
      ),
    faceColors([face_px, eyeColor], [face_py, eyeColor], [face_pz, eyeColor]),
    translate(0, sideHeight - gap / 2, -depth / 4),
  );

  return mergeAll(head, rightSide, leftSide, eye);
};

export var platform_create = (width, height, depth, strokeWidth) => {
  var innerWidth = width - 4 * strokeWidth;
  var innerDepth = depth - 4 * strokeWidth;
  var deleteSideFaces = deleteFaces(face_px, face_nx, face_pz, face_nz);

  var base = box(
    [width - 2 * strokeWidth, height, innerDepth],
    deleteSideFaces,
  );
  var frontBase = box(
    [innerWidth, height, strokeWidth],
    relativeAlign(nz, base, pz),
    $translateX([nx_nz, -strokeWidth], [px_nz, strokeWidth]),
    deleteSideFaces,
  );
  var backBase = box(
    [innerWidth, height, strokeWidth],
    relativeAlign(pz, base, nz),
    $translateX([nx_pz, -strokeWidth], [px_pz, strokeWidth]),
    deleteSideFaces,
  );

  var strokeDimensions = [strokeWidth, height, strokeWidth];
  var strokeColor = colors([all, [0.4, 0.4, 0.5]]);
  var halfStrokeWidth = strokeWidth / 2;

  return mergeAll(
    base,
    frontBase,
    backBase,
    box(
      [innerWidth, height, strokeWidth],
      relativeAlign(nz, frontBase, pz),
      $translateX([nx_pz, -halfStrokeWidth], [px_pz, halfStrokeWidth]),
      deleteFaces(face_px, face_nx, face_nz),
      strokeColor,
    ),
    box(
      [innerWidth, height, strokeWidth],
      relativeAlign(pz, backBase, nz),
      $translateX([nx_nz, -halfStrokeWidth], [px_nz, halfStrokeWidth]),
      deleteFaces(face_px, face_nx, face_pz),
      strokeColor,
    ),
    box(
      [strokeWidth, height, innerDepth],
      relativeAlign(nx, base, px),
      $translateZ([px_nz, -halfStrokeWidth], [px_pz, halfStrokeWidth]),
      deleteFaces(face_nx, face_pz, face_nz),
      strokeColor,
    ),
    box(
      [strokeWidth, height, innerDepth],
      relativeAlign(px, base, nx),
      $translateZ([nx_nz, -halfStrokeWidth], [nx_pz, halfStrokeWidth]),
      deleteFaces(face_px, face_pz, face_nz),
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

export var scanner_create = () => {
  var size = 16;
  var length = 32;
  var headLength = 6;
  var eyeColor = vec3_create(16, 1, 1);

  var head = box(
    [size, size, headLength],
    $scale([pz, { x: 0.5, y: 0.5 }]),
    faceColors([face_pz, eyeColor]),
    deleteFaces(face_nz),
  );
  return geom_applyQuaternion(
    mergeAll(
      head,
      // Tail
      box(
        [size, size, length - headLength],
        relativeAlign(pz, head, nz),
        $scale([nz, { x: 0, y: 0 }]),
        deleteFaces(face_pz),
      ),
    ),
    quat_setFromEuler(_quat, vec3_set(_vector, 0, 0, Math.PI / 4)),
  );
};

export var starfield_create = (radius, count) => {
  var stars = [];

  for (var i = 0; i < count; i++) {
    var theta = 2 * Math.PI * Math.random();
    var u = 2 * Math.random() - 1;
    var v = Math.sqrt(1 - u * u);
    var size = randFloat(8, 32);

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

export var healthPack_create = () => {
  var size = 32;
  var depth = 8;
  return translate(
    0,
    size,
    0,
  )(mergeAll(box([size / 3, size, depth]), box([size, size / 3, depth])));
};
