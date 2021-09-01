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
import { geom_create, merge } from './geom.js';
import { flow } from './utils.js';

export var box = (dimensions, ...transforms) =>
  flow(...transforms)(boxGeom_create(...dimensions));

export var mergeAll = (...geoms) => flow(...geoms.map(merge))(geom_create());

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
