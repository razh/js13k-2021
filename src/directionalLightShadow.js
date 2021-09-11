import { camera_lookAt, camera_updateWorldMatrix } from './camera.js';
import { mat4_create, mat4_multiplyMatrices } from './mat4.js';
import { orthoCamera_create } from './orthoCamera.js';
import { vec3_create, vec3_setFromMatrixPosition } from './vec3.js';

var _lookTarget = vec3_create();

export var lightShadow_create = () => ({
  camera: orthoCamera_create(-5, 5, 5, -5, 0.5, 500),
  matrix: mat4_create(),
});

export var lightShadow_updateMatrices = (lightShadow, light) => {
  var { camera, matrix } = lightShadow;

  vec3_setFromMatrixPosition(camera.position, light.matrixWorld);

  camera_lookAt(
    camera,
    vec3_setFromMatrixPosition(_lookTarget, light.target.matrixWorld),
  );
  camera_updateWorldMatrix(camera);

  // prettier-ignore
  matrix.set([
    0.5, 0, 0, 0,
    0, 0.5, 0, 0,
    0, 0, 0.5, 0,
    0.5, 0.5, 0.5, 1
  ]);

  mat4_multiplyMatrices(
    matrix,
    mat4_multiplyMatrices(matrix, matrix, camera.projectionMatrix),
    camera.matrixWorldInverse,
  );
};
