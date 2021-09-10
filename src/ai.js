// https://github.com/id-Software/Quake-Tools/blob/master/qcc/v101qc/ai.qc
// https://github.com/id-Software/Quake-2/blob/master/game/g_ai.c

import {
  vec3_applyQuaternion,
  vec3_create,
  vec3_distanceTo,
  vec3_dot,
  vec3_normalize,
  vec3_subVectors,
  vec3_Z,
} from './vec3.js';

var _v0 = vec3_create();
var _v1 = vec3_create();

var MELEE_DISTANCE = 64;

var RANGE_MELEE = 0;
var RANGE_NEAR = 1;
var RANGE_MID = 2;
var RANGE_FAR = 3;

var range = (enemy, target) => {
  var distance = vec3_distanceTo(enemy.position, target.position);
  if (distance < MELEE_DISTANCE) return RANGE_MELEE;
  if (distance < 256) return RANGE_NEAR;
  if (distance < 512) return RANGE_MID;
  return RANGE_FAR;
};

export var inFront = (enemy, target) =>
  vec3_dot(
    vec3_normalize(vec3_subVectors(_v1, target.position, enemy.position)),
    vec3_applyQuaternion(Object.assign(_v0, vec3_Z), enemy.quaternion),
  ) > 0.3;

export var findTarget = (enemy, target) => {
  var r = range(enemy, target);

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
