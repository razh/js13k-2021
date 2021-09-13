// https://github.com/id-Software/Quake-Tools/blob/master/qcc/v101qc/ai.qc
// https://github.com/id-Software/Quake-2/blob/master/game/g_ai.c

import { ray_create, ray_intersectObjects } from './ray.js';
import {
  vec3_applyQuaternion,
  vec3_create,
  vec3_distanceTo,
  vec3_dot,
  vec3_normalize,
  vec3_subVectors,
  vec3_Z,
} from './vec3.js';

var _ray = ray_create();
var _v0 = vec3_create();
var _v1 = vec3_create();

var MELEE_DISTANCE = 64;

export var RANGE_MELEE = 0;
export var RANGE_NEAR = 1;
export var RANGE_MID = 2;
export var RANGE_FAR = 3;

export var getRange = (enemy, target) => {
  var distance = vec3_distanceTo(enemy.position, target.position);
  if (distance < MELEE_DISTANCE) return RANGE_MELEE;
  if (distance < 512) return RANGE_NEAR;
  if (distance < 1024) return RANGE_MID;
  return RANGE_FAR;
};

export var inFront = (enemy, target) =>
  vec3_dot(
    vec3_normalize(vec3_subVectors(_v1, target.position, enemy.position)),
    vec3_applyQuaternion(Object.assign(_v0, vec3_Z), enemy.quaternion),
  ) > 0.3;

export var findTarget = (enemy, target) => {
  var r = getRange(enemy, target);

  if (r === RANGE_FAR) {
    return false;
  }

  if (r === RANGE_NEAR || r === RANGE_MID) {
    if (!inFront(enemy, target)) {
      return false;
    }
  }

  return true;
};

export var isVisible = (meshes, origin, target) => {
  Object.assign(_ray.origin, origin);
  vec3_subVectors(_ray.direction, target, origin);
  return !ray_intersectObjects(_ray, meshes).length;
};
