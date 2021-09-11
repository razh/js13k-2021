import { clamp } from './math.js';
import { quat_create, quat_multiply, quat_setFromEuler } from './quat.js';
import { vec3_create } from './vec3.js';

var pitchQuat = quat_create();
var yawQuat = quat_create();

export var controls_create = object => {
  var pitchEuler = vec3_create();
  var yawEuler = vec3_create();

  var controls = {
    object,
    sensitivity: 0.002,
    enabled: false,
    onMouseMove(event) {
      if (!controls.enabled) {
        return;
      }

      pitchEuler.x = clamp(
        pitchEuler.x - event.movementY * controls.sensitivity,
        -Math.PI / 2,
        Math.PI / 2,
      );
      yawEuler.y -= event.movementX * controls.sensitivity;

      Object.assign(
        object.quaternion,
        quat_multiply(
          quat_setFromEuler(yawQuat, yawEuler),
          quat_setFromEuler(pitchQuat, pitchEuler),
        ),
      );
    },
  };

  addEventListener('mousemove', controls.onMouseMove);

  return controls;
};

export var controls_dispose = controls =>
  removeEventListener('mousemove', controls.onMouseMove);
