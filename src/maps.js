import { playShoot } from './audio.js';
import { boxGeom_create } from './boxGeom.js';
import { ny, py } from './boxIndices.js';
import { $scale, align } from './boxTransforms.js';
import { DEBUG } from './constants.js';
import { light_create } from './directionalLight.js';
import { component_create, entity_add } from './entity.js';
import { interval_create } from './interval.js';
import { keys_create } from './keys.js';
import { material_create } from './material.js';
import { randFloatSpread } from './math.js';
import { mesh_create } from './mesh.js';
import {
  box,
  bridge_create,
  column_create,
  dreadnought_create,
  explosion_create,
  phantom_create,
  platform_create,
  scanner_create,
  starfield_create,
} from './models.js';
import {
  object3d_add,
  object3d_create,
  object3d_lookAt,
  object3d_remove,
  object3d_rotateX,
  object3d_rotateY,
  object3d_rotateZ,
} from './object3d.js';
import {
  BODY_BULLET,
  BODY_DYNAMIC,
  BODY_STATIC,
  get_physics_component,
  physics_add,
  physics_bodies,
  physics_update,
} from './physics.js';
import { player_create, player_update } from './player.js';
import {
  quat_create,
  quat_rotateTowards,
  quat_setFromAxisAngle,
} from './quat.js';
import { ray_create, ray_intersectObjects } from './ray.js';
import {
  vec3_add,
  vec3_addScaledVector,
  vec3_applyQuaternion,
  vec3_create,
  vec3_cross,
  vec3_dot,
  vec3_length,
  vec3_multiplyScalar,
  vec3_normalize,
  vec3_set,
  vec3_setLength,
  vec3_setScalar,
  vec3_subVectors,
  vec3_X,
  vec3_Y,
  vec3_Z,
} from './vec3.js';

var keys = keys_create();
var isMouseDown = false;

var _q0 = quat_create();
var _v0 = vec3_create();
var _v1 = vec3_create();

export var map0 = (gl, scene, camera) => {
  var map = object3d_create();
  object3d_add(scene, map);

  // Lights
  var ambient = vec3_create(0.2, 0.2, 0.3);

  var directional = light_create(vec3_create(1, 1, 1));
  Object.assign(directional.shadow.camera, {
    left: -512,
    right: 512,
    top: 512,
    bottom: -512,
  });
  vec3_set(directional.position, 64, 256, -64);
  object3d_add(map, directional);

  // Camera
  camera.far = 16384;
  var cameraObject = object3d_create();
  object3d_add(cameraObject, camera);
  object3d_add(map, cameraObject);

  // Action
  var playerWidth = 30;
  var playerHeight = 56;
  var playerMesh = physics_add(
    mesh_create(
      boxGeom_create(playerWidth, playerHeight, playerWidth),
      material_create(),
    ),
    BODY_DYNAMIC,
  );
  playerMesh.position.y += playerHeight / 2;
  playerMesh.visible = false;
  Object.assign(cameraObject.position, playerMesh.position);
  object3d_add(map, playerMesh);

  var playerPhysics = get_physics_component(playerMesh);
  playerPhysics.update = () => {};
  var player = player_create(playerMesh, playerPhysics);
  player.scene = map;

  var createStaticMeshFromGeometry = geometry => {
    var material = material_create();
    vec3_set(material.color, 0.7, 0.7, 0.75);
    var mesh = physics_add(mesh_create(geometry, material), BODY_STATIC);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    object3d_add(map, mesh);
    return mesh;
  };

  [
    // Target for testing bullet tunneling.
    [
      [32, 16, 8],
      [0, 16, -128],
    ],
    [
      [32, 24, 64],
      [48, 0, 0],
    ],
    [
      [256, 64, 256],
      [-128, 128, -192],
    ],
    [
      [256, 16, 256],
      [-128, 128, -192],
      [align(py), $scale([ny, { x: 7 / 8, z: 7 / 8 }])],
    ],
    [[512, 16, 512], [0, 0, 0], [align(py)]],
    [[512, 16, 512], [0, 32, -672], [align(py)]],
  ].map(([dimensions, position, transforms = [align(ny)]]) =>
    vec3_set(
      createStaticMeshFromGeometry(box(dimensions, ...transforms)).position,
      ...position,
    ),
  );

  [
    [
      [96, 8, 128, 8],
      [64, 64, -128],
    ],
    [
      [128, 8, 256, 8],
      [256, 48, -240],
    ],
  ].map(([dimensions, position]) =>
    vec3_set(
      createStaticMeshFromGeometry(platform_create(...dimensions)).position,
      ...position,
    ),
  );

  [[[0, 52, -240], [192, 52, -240], 64, 8]].map(([start, end, width, height]) =>
    createStaticMeshFromGeometry(
      bridge_create(vec3_create(...start), vec3_create(...end), width, height),
    ),
  );

  vec3_set(
    createStaticMeshFromGeometry(column_create()).position,
    -32,
    0,
    -128,
  );

  var starfieldMaterial = material_create();
  vec3_setScalar(starfieldMaterial.emissive, 1);
  starfieldMaterial.fog = false;
  var starfieldOuterRadius = 15360;
  var starfieldInnerRadius = starfieldOuterRadius - 256;
  object3d_add(
    cameraObject,
    mesh_create(
      starfield_create(starfieldInnerRadius, starfieldOuterRadius, 256),
      starfieldMaterial,
    ),
  );

  var dreadnoughtMaterial = material_create();
  vec3_setScalar(dreadnoughtMaterial.specular, 1);
  dreadnoughtMaterial.fog = false;
  var dreadnoughtMesh = mesh_create(dreadnought_create(), dreadnoughtMaterial);
  vec3_set(dreadnoughtMesh.position, 512, 1536, -6144);
  object3d_rotateY(dreadnoughtMesh, -Math.PI / 2);
  object3d_rotateX(dreadnoughtMesh, -Math.PI / 8);
  object3d_rotateZ(dreadnoughtMesh, -Math.PI / 4);
  object3d_add(map, dreadnoughtMesh);

  var phantomMaterial = material_create();
  var phantomMesh = physics_add(
    mesh_create(phantom_create(), phantomMaterial),
    BODY_STATIC,
  );
  vec3_setScalar(phantomMaterial.color, 0.5);
  vec3_setScalar(phantomMaterial.specular, 1);
  phantomMesh.castShadow = true;
  phantomMesh.receiveShadow = true;
  vec3_set(phantomMesh.position, -128, 0, -64);
  object3d_add(map, phantomMesh);
  entity_add(
    phantomMesh,
    component_create(
      () => (phantomMesh.position.z = 96 * Math.cos(1e-3 * Date.now())),
    ),
  );

  var scannerMaterial = material_create();
  vec3_setScalar(scannerMaterial.color, 0.5);
  vec3_setScalar(scannerMaterial.specular, 1);
  var scannerMesh = physics_add(
    mesh_create(scanner_create(), scannerMaterial),
    BODY_STATIC,
  );
  vec3_set(scannerMesh.position, -64, 52, -128);
  scannerMesh.castShadow = true;
  scannerMesh.receiveShadow = true;
  object3d_rotateZ(scannerMesh, Math.PI / 4);
  object3d_add(map, scannerMesh);
  entity_add(
    scannerMesh,
    component_create(
      () => (scannerMesh.position.z = 96 * Math.sin(1e-3 * Date.now())),
    ),
  );

  var enemyWidth = 0.8 * playerWidth;
  var enemyHeight = 0.8 * playerHeight;
  var enemyMaterial = material_create();
  Object.assign(enemyMaterial.color, vec3_X);
  var enemyMesh = entity_add(
    physics_add(
      mesh_create(
        box([enemyWidth, enemyHeight, enemyWidth], align(ny)),
        enemyMaterial,
      ),
      BODY_DYNAMIC,
    ),
    component_create(dt => {
      var enemyPhysics = get_physics_component(enemyMesh);
      enemyPhysics.velocity.y -= 800 * dt;
      var wishDirection = vec3_subVectors(
        _v0,
        playerMesh.position,
        enemyMesh.position,
      );
      if (vec3_length(wishDirection) > 256) return;
      vec3_normalize(wishDirection);
      var accel = 10;
      var stopSpeed = 100;
      var friction = 6;
      var y = enemyPhysics.velocity.y;
      enemyPhysics.velocity.y = 0;
      var speed = vec3_length(enemyPhysics.velocity);
      var control = Math.max(speed, stopSpeed);
      var newSpeed = Math.max(speed - control * friction * dt, 0);
      vec3_setLength(enemyPhysics.velocity, newSpeed);
      var currentSpeed = vec3_dot(enemyPhysics.velocity, wishDirection);
      enemyPhysics.velocity.y = y;
      var wishSpeed = 160;
      var addSpeed = wishSpeed - currentSpeed;
      if (addSpeed <= 0) return;
      var accelSpeed = Math.min(accel * dt * wishSpeed, addSpeed);
      vec3_addScaledVector(enemyPhysics.velocity, wishDirection, accelSpeed);
      quat_setFromAxisAngle(
        _q0,
        vec3_Y,
        Math.atan2(wishDirection.x, wishDirection.z),
      );
      quat_rotateTowards(enemyMesh.quaternion, _q0, 12 * dt);
    }),
  );
  vec3_set(enemyMesh.position, 128, 32, -640);
  enemyMesh.castShadow = true;
  enemyMesh.receiveShadow = true;
  object3d_add(map, enemyMesh);

  var createExplosion = position => {
    var explosion = explosion_create(4);
    Object.assign(explosion.position, position);
    object3d_add(map, explosion);
  };

  var bulletInterval = interval_create(0.1);

  entity_add(
    map,
    component_create(dt => {
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

      if (bulletInterval(dt, isMouseDown)) {
        playShoot();

        var bulletGeometry = boxGeom_create(2, 2, 8);
        var bulletMaterial = material_create();
        vec3_set(bulletMaterial.emissive, 0.5, 0.5, 2);

        var time = 0;
        var bullet = entity_add(
          physics_add(mesh_create(bulletGeometry, bulletMaterial), BODY_BULLET),
          component_create(dt => {
            time += dt;
            if (time > 4) {
              object3d_remove(map, bullet);
            }
          }),
        );
        bullet.castShadow = true;

        // Bullets land in a box of size 1 that is 16 units away.
        object3d_lookAt(
          bullet,
          vec3_addScaledVector(
            vec3_set(
              _v0,
              randFloatSpread(1),
              randFloatSpread(1),
              randFloatSpread(1),
            ),
            vec3_applyQuaternion(Object.assign(_v1, vec3_Z), camera.quaternion),
            -16,
          ),
        );

        var bulletPhysics = get_physics_component(bullet);
        vec3_addScaledVector(
          Object.assign(bulletPhysics.velocity, playerPhysics.velocity),
          vec3_applyQuaternion(Object.assign(_v0, vec3_Z), bullet.quaternion),
          800,
        );

        vec3_add(
          vec3_applyQuaternion(
            vec3_set(bullet.position, playerWidth / 2, -playerHeight / 8, 0),
            camera.quaternion,
          ),
          playerMesh.position,
        );

        object3d_add(map, bullet);

        bulletPhysics.collide = entity => {
          if (entity === playerMesh) return false;
          createExplosion(bullet.position);
          object3d_remove(map, bullet);
        };
      }
    }),
  );

  addEventListener('mousedown', () => (isMouseDown = true));
  addEventListener('mouseup', () => (isMouseDown = false));

  if (DEBUG) {
    addEventListener('click', () => {
      var ray = ray_create();
      Object.assign(ray.origin, cameraObject.position);
      vec3_applyQuaternion(
        vec3_set(ray.direction, 0, 0, -1),
        camera.quaternion,
      );
      var staticMeshes = physics_bodies(scene)
        .filter(body => body.physics === BODY_STATIC)
        .map(body => body.parent);
      var intersection = ray_intersectObjects(ray, staticMeshes)?.[0];
      if (intersection) {
        console.log(
          [
            intersection.point.x,
            intersection.point.y,
            intersection.point.z,
          ].map(Math.round),
          { distance: Math.round(intersection.distance) },
        );
        var targetMaterial = material_create();
        vec3_set(targetMaterial.emissive, 0, 1, 0);
        var target = mesh_create(box([2, 2, 2]), targetMaterial);
        Object.assign(target.position, intersection.point);
        object3d_add(map, target);
        setTimeout(() => object3d_remove(map, target), 1000);
      }
    });
  }

  return {
    ambient,
    directional,
  };
};
