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

      pitchEuler.x -= event.movementY * controls.sensitivity;
      yawEuler.y -= event.movementX * controls.sensitivity;

      pitchEuler.x = clamp(pitchEuler.x, -Math.PI / 2, Math.PI / 2);

      quat_setFromEuler(pitchQuat, pitchEuler);
      quat_setFromEuler(yawQuat, yawEuler);

      quat_multiply(yawQuat, pitchQuat);
      Object.assign(object.quaternion, yawQuat);
    },
  };

  addEventListener('mousemove', controls.onMouseMove);

  return controls;
};

export var controls_dispose = controls =>
  removeEventListener('mousemove', controls.onMouseMove);
