import { mat4_create } from './mat4.js';
import { object3d_create } from './object3d.js';
import { vec3_clone, vec3_Y } from './vec3.js';

export var orthoCamera_create = (
  left = -1,
  right = 1,
  top = 1,
  bottom = -1,
  near = 0.1,
  far = 2000,
) => {
  var camera = {
    ...object3d_create(),
    left,
    right,
    top,
    bottom,
    near,
    far,
    up: vec3_clone(vec3_Y),
    matrixWorldInverse: mat4_create(),
    projectionMatrix: mat4_create(),
  };

  orthoCamera_updateProjectionMatrix(camera);

  return camera;
};

export var orthoCamera_updateProjectionMatrix = camera => {
  var { left, right, top, bottom, near, far } = camera;

  var w = 1 / (right - left);
  var h = 1 / (top - bottom);
  var p = 1 / (far - near);

  var x = (right + left) * w;
  var y = (top + bottom) * h;
  var z = (far + near) * p;

  // prettier-ignore
  camera.projectionMatrix.set([
    2 * w, 0, 0, 0,
    0, 2 * h, 0, 0,
    0, 0, -2 * p, 0,
    -x, -y, -z, 1,
  ]);
};
