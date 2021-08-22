import { boxGeom_create } from './boxGeom.js';
import { light_create } from './directionalLight.js';
import { component_create, entity_add } from './entity.js';
import { keys_create } from './keys.js';
import { material_create } from './material.js';
import { mesh_create } from './mesh.js';
import { object3d_add, object3d_create } from './object3d.js';
import { vec3_create, vec3_set } from './vec3.js';

var keys = keys_create();

export var map0 = (gl, scene, camera) => {
  var map = object3d_create();
  object3d_add(scene, map);

  // Lights
  var ambient = vec3_create(0.5, 0.5, 0.5);

  var directional = light_create(vec3_create(1, 1, 1));
  vec3_set(directional.position, 128, 256, -128);
  object3d_add(map, directional);

  // Camera
  var cameraObject = object3d_create();
  object3d_add(cameraObject, camera);
  object3d_add(map, cameraObject);

  vec3_set(camera.position, 16, 16, 32);

  var mesh = mesh_create(boxGeom_create(8, 8, 8), material_create());
  object3d_add(scene, mesh);

  var mesh2 = mesh_create(boxGeom_create(8, 8, 8), material_create());
  mesh2.position.x = 6;
  mesh2.position.z = -8;
  object3d_add(scene, mesh2);

  var floorMesh = mesh_create(boxGeom_create(256, 8, 256), material_create());
  floorMesh.position.y = -8;
  object3d_add(scene, floorMesh);

  entity_add(
    map,
    component_create(() => {}),
  );

  return {
    ambient,
    directional,
  };
};
