import { boxGeom_create } from './boxGeom.js';
import { light_create } from './directionalLight.js';
import { component_create, entity_add } from './entity.js';
import { keys_create } from './keys.js';
import { material_create } from './material.js';
import { mesh_create } from './mesh.js';
import { object3d_add, object3d_create } from './object3d.js';
import {
  BODY_DYNAMIC,
  BODY_STATIC,
  get_physics_component,
  physics_add,
  physics_bodies,
  physics_update,
} from './physics.js';
import { player_create, player_update } from './player.js';
import {
  vec3_applyQuaternion,
  vec3_create,
  vec3_cross,
  vec3_multiplyScalar,
  vec3_normalize,
  vec3_set,
  vec3_setScalar,
} from './vec3.js';

var keys = keys_create();

export var map0 = (gl, scene, camera) => {
  var map = object3d_create();
  object3d_add(scene, map);

  // Lights
  var ambient = vec3_create(0.5, 0.5, 0.5);

  var directional = light_create(vec3_create(1, 1, 1));
  Object.assign(directional.shadow.camera, {
    left: -128,
    right: 128,
    top: 128,
    bottom: -128,
  });
  vec3_set(directional.position, 64, 256, -64);
  object3d_add(map, directional);

  // Camera
  var cameraObject = object3d_create();
  object3d_add(cameraObject, camera);
  object3d_add(map, cameraObject);

  // Action
  var playerMesh = physics_add(
    mesh_create(boxGeom_create(30, 56, 30), material_create()),
    BODY_DYNAMIC,
  );
  playerMesh.position.y += 28;
  playerMesh.visible = false;
  Object.assign(cameraObject.position, playerMesh.position);
  object3d_add(map, playerMesh);

  var playerPhysics = get_physics_component(playerMesh);
  playerPhysics.update = () => {};
  var player = player_create(playerMesh, playerPhysics);
  player.scene = map;

  var mesh = mesh_create(boxGeom_create(8, 8, 8), material_create());
  mesh.position.y = 4;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  object3d_add(scene, mesh);

  var mesh2 = mesh_create(boxGeom_create(8, 24, 8), material_create());
  vec3_set(mesh2.position, 6, 12, -8);
  mesh2.castShadow = true;
  mesh2.receiveShadow = true;
  object3d_add(scene, mesh2);

  var floorMesh = mesh_create(boxGeom_create(256, 8, 256), material_create());
  floorMesh.position.y = -4;
  floorMesh.receiveShadow = true;
  object3d_add(scene, floorMesh);

  entity_add(
    map,
    component_create((component, dt) => {
      var bodies = physics_bodies(map);
      physics_update(bodies);
      player.dt = dt;

      vec3_setScalar(player.command, 0);

      if (keys.KeyW || keys.ArrowUp) player.command.z++;
      if (keys.KeyS || keys.ArrowDown) player.command.z--;
      if (keys.KeyA || keys.ArrowLeft) player.command.x--;
      if (keys.KeyD || keys.ArrowRight) player.command.x++;
      if (keys.Space) player.command.y++;

      var movespeed = 127;
      vec3_multiplyScalar(player.command, movespeed);

      vec3_set(player.viewForward, 0, 0, -1);
      vec3_set(player.viewRight, 1, 0, 0);

      vec3_applyQuaternion(
        vec3_set(player.viewForward, 0, 0, -1),
        camera.quaternion,
      );
      vec3_normalize(
        vec3_cross(vec3_set(player.viewRight, 0, -1, 0), player.viewForward),
      );

      player_update(player);
      Object.assign(cameraObject.position, playerMesh.position);
    }),
  );

  return {
    ambient,
    directional,
  };
};
