import { colors } from './boxColors.js';
import { boxGeom_create } from './boxGeom.js';
import {
  all,
  nx,
  nx_nz,
  nx_py,
  nx_pz,
  ny,
  nz,
  px,
  px_nz,
  px_py,
  px_pz,
  py,
  py_nz,
  pz,
} from './boxIndices.js';
import {
  $scale,
  $translate,
  $translateX,
  $translateZ,
  align,
  extrude,
  relativeAlign,
} from './boxTransforms.js';
import { DEBUG } from './constants';
import { geom_create, merge, translate } from './geom.js';
import { randFloat } from './math.js';
import { flow } from './utils.js';
import { vec3_create, vec3_subVectors } from './vec3.js';

var _vector = vec3_create();

export var box = (dimensions, ...transforms) =>
  flow(...transforms)(boxGeom_create(...dimensions));

export var mergeAll = (...geoms) => flow(...geoms.map(merge))(geom_create());

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

export var corridor_create = () => {
  var base = box([24, 64, 24], align(ny));
  var middle = flow(
    $translateX([px_py, -12]),
    colors([all, [1, 0, 0]]),
  )(extrude(base, py, ny, { y: 24 }));
  return mergeAll(
    base,
    middle,
    flow(colors([all, [0, 1, 0]]))(extrude(base, nx, px, { x: -24, y: -12 })),
  );

  var columnWidth = 24;
  var columnHeight = 128;
  var columnDepth = 16;

  var columnCapWidth = 12;
  var columnCapHeight = 24;

  var base = box(
    [columnWidth, columnHeight - columnCapHeight, columnDepth],
    align(ny),
    $translateX([px_py, -(columnWidth - columnCapWidth)]),
  );

  var column = mergeAll(
    base,
    box(
      [columnCapWidth, columnCapHeight, columnDepth],
      relativeAlign(ny, base, py),
      $translateX([px_py, -columnCapWidth / 4]),
    ),
  );

  return column;
};

export var door_create = () => {};

export var dreadnought_create = () => box([12288, 1024, 3072]);

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

export var scanner_create = () => {
  var size = 16;
  var length = 24;
  var headLength = 4;

  var head = box([size, size, headLength], $scale([pz, { x: 0.5, y: 0.5 }]));
  return mergeAll(
    head,
    box([size, size, length - headLength], relativeAlign(pz, head, nz)),
  );
};

// http://www.vendian.org/mncharity/dir3/starcolor/
var starColors = [
  // '#9bb0ff'
  [0.6, 0.69, 1],
  // '#aabfff'
  [0.66, 0.75, 1],
  // '#cad8ff'
  [0.79, 0.85, 1],
  // '#fbf8ff',
  [0.98, 0.97, 1],
  // '#fff4e8',
  [1, 0.96, 0.91],
  // '#ffddb4'
  [1, 0.87, 0.71],
  // '#ffbd6f'
  [1, 0.84, 0.44],
];

export var starfield_create = (innerRadius, outerRadius, count) => {
  var stars = [];
  var size = 32;

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
        colors([all, starColors[i % starColors.length]]),
      ),
    );
  }

  return mergeAll(...stars);
};
