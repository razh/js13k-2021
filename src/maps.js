import { findTarget, getRange, RANGE_MELEE } from './ai.js';
import { playEnemyDeath, playShoot } from './audio.js';
import { boxGeom_create } from './boxGeom.js';
import { nx_ny, ny } from './boxIndices.js';
import { align } from './boxTransforms.js';
import { DEBUG, gravity } from './constants.js';
import { light_create } from './directionalLight.js';
import { lightShadow_updateMatrices } from './directionalLightShadow.js';
import { component_create, entity_add } from './entity.js';
import { on } from './events.js';
import { interval_create } from './interval.js';
import { keys_create } from './keys.js';
import { material_create } from './material.js';
import { clamp, randFloat, randFloatSpread } from './math.js';
import { mesh_create } from './mesh.js';
import {
  box,
  bridge_create,
  column_create,
  disintegration_create,
  dreadnought_create,
  explosion_create,
  phantom_create,
  platform_create,
  scanner_create,
  spaceBetween,
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
  object3d_traverse,
  object3d_updateWorldMatrix,
} from './object3d.js';
import { orthoCamera_updateProjectionMatrix } from './orthoCamera.js';
import {
  BODY_BULLET,
  BODY_DYNAMIC,
  BODY_STATIC,
  get_physics_component,
  physics_add,
  physics_bodies,
  physics_update,
} from './physics.js';
import {
  body_trace,
  player_create,
  player_update,
  trace_create,
} from './player.js';
import {
  quat_create,
  quat_rotateTowards,
  quat_setFromAxisAngle,
} from './quat.js';
import { ray_create, ray_intersectObjects } from './ray.js';
import {
  vec3_add,
  vec3_addScaledVector,
  vec3_applyMatrix4,
  vec3_applyQuaternion,
  vec3_create,
  vec3_cross,
  vec3_distanceTo,
  vec3_dot,
  vec3_length,
  vec3_multiplyScalar,
  vec3_normalize,
  vec3_set,
  vec3_setLength,
  vec3_setScalar,
  vec3_subVectors,
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

  var health = 100;
  var score = 0;

  var updateShadowCamera = () => {
    var offset = 512;
    var cameraPosition = vec3_applyMatrix4(
      Object.assign(_v0, cameraObject.position),
      directional.shadow.camera.matrixWorldInverse,
    );
    Object.assign(directional.shadow.camera, {
      left: cameraPosition.x - offset,
      right: cameraPosition.x + offset,
      top: cameraPosition.y + offset,
      bottom: cameraPosition.y - offset,
    });
    // HACK: Reduce shadow jitter.
    orthoCamera_updateProjectionMatrix(directional.shadow.camera);
  };

  object3d_updateWorldMatrix(directional);
  lightShadow_updateMatrices(directional.shadow, directional);
  updateShadowCamera();

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
    [[160, 128, 256], [-512, 0, 128], [align(nx_ny)]],
  ].map(([dimensions, position, transforms = [align(ny)]]) =>
    vec3_set(
      createStaticMeshFromGeometry(box(dimensions, ...transforms)).position,
      ...position,
    ),
  );

  // Platforms
  [
    [
      [1024, 16, 768, 8],
      [0, 0, 0],
    ],
    [
      [128, 8, 256, 8],
      [256, 48, -240],
    ],
    [
      [128, 8, 172, 8],
      [-256, 16, -192],
    ],
    [
      [160, 8, 246, 8],
      [128, 160, 0],
    ],
    [
      [512, 8, 352, 8],
      [0, 32, -544],
    ],
    [
      [128, 8, 128, 8],
      [256, 64, 0],
    ],
    [
      [128, 8, 160, 8],
      [320, 96, 144],
    ],
    [
      [480, 8, 128, 8],
      [0, 128, 256],
    ],
    // Center
    [
      [128, 24, 128, 8],
      [-160, 12, 0],
    ],
    [
      [128, 24, 128, 8],
      [-160, 96, 0],
    ],
  ].map(([dimensions, position]) =>
    vec3_set(
      createStaticMeshFromGeometry(platform_create(...dimensions)).position,
      ...position,
    ),
  );

  // Bridges.
  [
    // [[0, 52, -240], [192, 52, -240], 64, 8]
  ].map(([start, end, width, height]) =>
    createStaticMeshFromGeometry(
      bridge_create(vec3_create(...start), vec3_create(...end), width, height),
    ),
  );

  // Columns.
  spaceBetween(256, 0, 4)
    .map(z => [-340, 0, z])
    .map(position =>
      vec3_set(
        createStaticMeshFromGeometry(column_create(24, 128)).position,
        ...position,
      ),
    );

  var starfieldMaterial = material_create();
  vec3_setScalar(starfieldMaterial.emissive, 1);
  starfieldMaterial.fog = false;
  object3d_add(
    cameraObject,
    mesh_create(starfield_create(15360, 512), starfieldMaterial),
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

  /*
  var createHealthPack = () => {
    var material = material_create();
    vec3_set(material.emissive, 0.5, 0.5, 2);
    vec3_setScalar(material.color, 0.5);
    var mesh = mesh_create(healthPack_create(), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  var healthPack = createHealthPack();
  vec3_set(healthPack.position, 0, 0, -128);
  object3d_add(map, healthPack);
  */

  var createPhantomMesh = () => {
    var material = material_create();
    var mesh = mesh_create(phantom_create(), material);
    vec3_setScalar(material.color, 0.5);
    vec3_setScalar(material.specular, 1);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  var enemyHealth_create = (enemy, initialHealth) => {
    var health = initialHealth;
    var hitTimeout;
    var enemyPhysics = get_physics_component(enemy);
    on(enemy, 'collide', entity => {
      var entityPhysics = get_physics_component(entity).physics;
      if (entityPhysics === BODY_BULLET) {
        health--;
        clearTimeout(hitTimeout);
        if (health <= 0) {
          playEnemyDeath();
          createExplosion(enemy.position);
          var disintegration = disintegration_create(
            enemyPhysics.boundingBox,
            16,
          );
          Object.assign(disintegration.position, enemy.position);
          Object.assign(disintegration.quaternion, enemy.quaternion);
          object3d_add(map, disintegration);
          object3d_remove(map, enemy);
        } else {
          enemy.material.emissive.x = 1;
          hitTimeout = setTimeout(() => (enemy.material.emissive.x = 0), 48);
        }
      }
    });
    return enemy;
  };

  var removeAfter_create = (entity, duration) => {
    var time = 0;
    return entity_add(
      entity,
      component_create(dt => {
        time += dt;
        if (time > duration) {
          object3d_remove(entity.parent, entity);
        }
      }),
    );
  };

  var createScannerMesh = () => {
    var material = material_create();
    vec3_setScalar(material.color, 0.5);
    vec3_setScalar(material.specular, 1);
    var mesh = mesh_create(scanner_create(), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  var debugPoints = (...points) =>
    points.map(([point, color]) => {
      var material = material_create();
      vec3_set(material.emissive, ...color);
      var target = mesh_create(box([2, 2, 2]), material);
      Object.assign(target.position, point);
      object3d_add(map, target);
      setTimeout(() => object3d_remove(map, target), 32);
      return target;
    });

  var fireShipBullet = () => {
    var bulletGeometry = boxGeom_create(16, 16, 48);
    var bulletMaterial = material_create();
    vec3_set(bulletMaterial.emissive, 2, 0.5, 0.5);

    var bullet = removeAfter_create(
      physics_add(mesh_create(bulletGeometry, bulletMaterial), BODY_BULLET),
    );
    bullet.castShadow = true;

    return bullet;
  };

  var fireEnemyBullet = () => {
    var bulletGeometry = boxGeom_create(2, 2, 8);
    var bulletMaterial = material_create();
    vec3_set(bulletMaterial.emissive, 2, 0.5, 0.5);

    var bullet = removeAfter_create(
      physics_add(mesh_create(bulletGeometry, bulletMaterial), BODY_BULLET),
    );
    bullet.castShadow = true;

    return bullet;
  };

  var takeDamage = (damage = 2) => {
    health -= damage;
    if (health <= 0) {
      document.exitPointerLock();
      document.querySelector('.e').hidden = false;
    }
  };

  var createPhantomEnemy = () => {
    var PHANTOM_STATE_NONE = 0;
    var PHANTOM_STATE_IDLE = 1;
    var PHANTOM_STATE_ALERT = 2;
    var PHANTOM_STATE_SHOOT = 3;
    var PHANTOM_STATE_MELEE = 4;

    var PHANTOM_Y = 52;

    var state = PHANTOM_STATE_NONE;
    var positionStart = vec3_create();
    var positionEnd = vec3_create();
    var trace = trace_create();

    var wishSpeed = 160;
    var accel = 10;
    var stopSpeed = 100;
    var friction = 6;

    var enemyBulletInterval = interval_create(1.1);

    var mesh = entity_add(
      enemyHealth_create(physics_add(createPhantomMesh(), BODY_DYNAMIC), 5),
      component_create(dt => {
        if (state === PHANTOM_STATE_NONE && findTarget(mesh, playerMesh)) {
          state === PHANTOM_STATE_ALERT;
        }

        var enemyPhysics = get_physics_component(mesh);
        vec3_addScaledVector(enemyPhysics.velocity, gravity, dt);
        var range = getRange(mesh, playerMesh);
        var wishDirection =
          state === PHANTOM_STATE_ALERT || findTarget(mesh, playerMesh)
            ? vec3_subVectors(_v0, playerMesh.position, mesh.position)
            : vec3_setScalar(_v0, 0);
        wishDirection.y = 0;
        vec3_normalize(wishDirection);

        if (vec3_length(wishDirection)) {
          quat_setFromAxisAngle(
            _q0,
            vec3_Y,
            Math.atan2(wishDirection.x, wishDirection.z),
          );
          quat_rotateTowards(mesh.quaternion, _q0, Math.PI * dt);

          // Check if we can move.
          vec3_setLength(Object.assign(_v1, wishDirection), wishSpeed);
          Object.assign(positionStart, mesh.position);
          vec3_addScaledVector(
            Object.assign(positionEnd, positionStart),
            _v1,
            // 16 frames ahead.
            16 * dt,
          );
          if (DEBUG) {
            body_trace(
              staticBodies,
              enemyPhysics,
              trace,
              positionStart,
              positionEnd,
            );
          }

          // Check if there's ground.
          Object.assign(positionStart, positionEnd);
          positionEnd.y -= 0.25;
          body_trace(
            staticBodies,
            enemyPhysics,
            trace,
            positionStart,
            positionEnd,
          );

          if (!trace.allsolid) {
            // vec3_setScalar(wishDirection, 0);
          }

          if (DEBUG) {
            var debugMeshes = debugPoints(
              [mesh.position, [0, 1, 0]],
              [positionStart, [0, 1, 0]],
              [positionEnd, [0, 1, 0]],
            );

            if (!trace.allsolid) {
              vec3_set(debugMeshes[1].material.emissive, 1, 0, 0);
            }
          }
        }

        // Move towards player.
        if (range !== RANGE_MELEE) {
          var y = enemyPhysics.velocity.y;
          enemyPhysics.velocity.y = 0;
          var speed = vec3_length(enemyPhysics.velocity);
          var control = Math.max(speed, stopSpeed);
          var newSpeed = Math.max(speed - control * friction * dt, 0);
          vec3_setLength(enemyPhysics.velocity, newSpeed);
          var currentSpeed = vec3_dot(enemyPhysics.velocity, wishDirection);
          enemyPhysics.velocity.y = y;
          var addSpeed = wishSpeed - currentSpeed;
          if (addSpeed > 0) {
            var accelSpeed = Math.min(accel * dt * wishSpeed, addSpeed);
            vec3_addScaledVector(
              enemyPhysics.velocity,
              wishDirection,
              accelSpeed,
            );
          }
        }

        var bulletOrigin = Object.assign(_v1, mesh.position);
        bulletOrigin.y += PHANTOM_Y;
        if (enemyBulletInterval(dt, findTarget(mesh, playerMesh))) {
          var bullet = fireEnemyBullet();

          Object.assign(bullet.position, bulletOrigin);

          object3d_lookAt(bullet, playerMesh.position);
          var bulletPhysics = get_physics_component(bullet);
          vec3_multiplyScalar(
            vec3_applyQuaternion(
              Object.assign(bulletPhysics.velocity, vec3_Z),
              bullet.quaternion,
            ),
            400,
          );

          object3d_add(map, bullet);

          bulletPhysics.collide = entity => {
            if (entity.isEnemy) return false;
            if (entity === playerMesh) takeDamage();
            createExplosion(bullet.position);
            object3d_remove(map, bullet);
          };
        }
      }),
    );

    mesh.isEnemy = true;
    mesh.isPhantom = true;

    on(mesh, 'collide', entity => {
      if (get_physics_component(entity).physics === BODY_BULLET) {
        state = PHANTOM_STATE_ALERT;
      }
    });

    return mesh;
  };

  var createScannerEnemy = () => {
    var SCANNER_STATE_NONE = 0;
    var SCANNER_STATE_IDLE = 1;
    var SCANNER_STATE_ALERT = 2;
    var SCANNER_STATE_SHOOT = 2;

    var state = SCANNER_STATE_NONE;
    var forceVelocity = vec3_create();
    var positionStart = vec3_create();
    var positionEnd = vec3_create();
    var trace = trace_create();

    var wishSpeed = 400;
    var accel = 10;
    var stopSpeed = 20;
    var friction = 0.3;

    var enemyBulletInterval = interval_create(1.3);

    var minPlayerDistance = randFloat(64, 128);

    // CNPC_Manhack:MaintainGroundHeight
    var minGroundHeight = 32;

    var mesh = entity_add(
      enemyHealth_create(physics_add(createScannerMesh(), BODY_DYNAMIC), 2),
      component_create(dt => {
        if (state === SCANNER_STATE_NONE && findTarget(mesh, playerMesh)) {
          state = SCANNER_STATE_ALERT;
        }

        var enemyPhysics = get_physics_component(mesh);
        vec3_multiplyScalar(
          Object.assign(forceVelocity, enemyPhysics.velocity),
          -0.5,
        );

        var range = getRange(mesh, playerMesh);
        var wishDirection =
          state === SCANNER_STATE_ALERT || findTarget(mesh, playerMesh)
            ? vec3_subVectors(_v0, playerMesh.position, mesh.position)
            : vec3_setScalar(_v0, 0);
        vec3_normalize(wishDirection);

        if (vec3_length(wishDirection)) {
          quat_setFromAxisAngle(
            _q0,
            vec3_Y,
            Math.atan2(wishDirection.x, wishDirection.z),
          );
          quat_rotateTowards(mesh.quaternion, _q0, Math.PI * dt);
          vec3_setLength(Object.assign(_v1, wishDirection), wishSpeed);
        }

        // Check if we can maintain ground height.
        var y = enemyPhysics.velocity.y;
        if (y <= 32) {
          Object.assign(positionStart, mesh.position);
          Object.assign(positionEnd, positionStart);
          positionEnd.y -= minGroundHeight;
          body_trace(
            staticBodies,
            enemyPhysics,
            trace,
            positionStart,
            positionEnd,
          );

          if (trace.fraction !== 1) {
            var speedAdjustment = Math.max(16, -y * 0.5);
            forceVelocity.y += speedAdjustment * (1 - trace.fraction);
          }
        }

        // Move towards player.
        if (
          range !== RANGE_MELEE &&
          vec3_distanceTo(mesh.position, playerMesh.position) >
            minPlayerDistance
        ) {
          var speed = vec3_length(enemyPhysics.velocity);
          var control = Math.max(speed, stopSpeed);
          var newSpeed = Math.max(speed - control * friction * dt, 0);
          vec3_setLength(enemyPhysics.velocity, newSpeed);
          var currentSpeed = vec3_dot(enemyPhysics.velocity, wishDirection);
          var addSpeed = wishSpeed - currentSpeed;
          if (addSpeed > 0) {
            var accelSpeed = Math.min(accel * dt * wishSpeed, addSpeed);
            vec3_addScaledVector(
              enemyPhysics.velocity,
              wishDirection,
              accelSpeed,
            );
          }
        }

        var bulletOrigin = Object.assign(_v1, mesh.position);
        if (enemyBulletInterval(dt, findTarget(mesh, playerMesh))) {
          var bullet = fireEnemyBullet();

          Object.assign(bullet.position, bulletOrigin);

          object3d_lookAt(bullet, playerMesh.position);
          var bulletPhysics = get_physics_component(bullet);
          vec3_multiplyScalar(
            vec3_applyQuaternion(
              Object.assign(bulletPhysics.velocity, vec3_Z),
              bullet.quaternion,
            ),
            400,
          );

          object3d_add(map, bullet);

          bulletPhysics.collide = entity => {
            if (entity.isEnemy) return false;
            if (entity === playerMesh) takeDamage();
            createExplosion(bullet.position);
            object3d_remove(map, bullet);
          };
        }

        vec3_add(enemyPhysics.velocity, forceVelocity);
      }),
    );

    mesh.isEnemy = true;
    mesh.isScanner = true;

    on(mesh, 'collide', entity => {
      if (get_physics_component(entity).physics === BODY_BULLET) {
        state = SCANNER_STATE_ALERT;
      }
    });

    return mesh;
  };

  if (DEBUG) {
    var phantomMesh = physics_add(createPhantomMesh(), BODY_STATIC);
    vec3_set(phantomMesh.position, -128, 0, -64);
    object3d_add(map, phantomMesh);
    entity_add(
      phantomMesh,
      component_create(
        () => (phantomMesh.position.z = 96 * Math.cos(1e-3 * Date.now())),
      ),
    );
    enemyHealth_create(phantomMesh, 10);

    var scannerMesh = physics_add(createScannerMesh(), BODY_STATIC);
    vec3_set(scannerMesh.position, -64, 52, -128);
    object3d_add(map, scannerMesh);
    entity_add(
      scannerMesh,
      component_create(
        () => (scannerMesh.position.z = 96 * Math.sin(1e-3 * Date.now())),
      ),
    );
    enemyHealth_create(scannerMesh, 5);

    var enemyMesh = createPhantomEnemy();
    vec3_set(enemyMesh.position, 128, 32, -640);
    object3d_add(map, enemyMesh);
  }

  var createExplosion = position => {
    var explosion = explosion_create(4);
    Object.assign(explosion.position, position);
    object3d_add(map, explosion);
  };

  var bulletInterval = interval_create(0.1);
  var shipBulletInterval = interval_create(5);

  var bodies;
  var staticBodies;
  var staticMeshes;

  var phantomSpawnInterval = interval_create(7);
  var scannerSpawnInterval = interval_create(3);

  entity_add(
    map,
    component_create(dt => {
      bodies = physics_bodies(map);
      staticBodies = bodies.filter(body => body.physics === BODY_STATIC);
      staticMeshes = staticBodies.map(body => body.parent);
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

      updateShadowCamera();

      health = clamp(health + 1 * dt, 0, 100);
      document.querySelector('.h').textContent = Math.round(health);
      document.querySelector('.s').textContent = score;

      if (playerMesh.position.y <= -2048) {
        takeDamage(100);
      }

      if (bulletInterval(dt, isMouseDown)) {
        playShoot();

        var bulletGeometry = boxGeom_create(2, 2, 8);
        var bulletMaterial = material_create();
        vec3_set(bulletMaterial.emissive, 0.5, 0.5, 2);

        var bullet = removeAfter_create(
          physics_add(mesh_create(bulletGeometry, bulletMaterial), BODY_BULLET),
          4,
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
          bulletPhysics.velocity,
          // Object.assign(bulletPhysics.velocity, playerPhysics.velocity),
          vec3_applyQuaternion(Object.assign(_v0, vec3_Z), bullet.quaternion),
          800,
        );

        vec3_add(
          vec3_applyQuaternion(
            vec3_set(bullet.position, playerWidth / 4, -playerHeight / 8, 0),
            camera.quaternion,
          ),
          playerMesh.position,
        );

        object3d_add(map, bullet);

        bulletPhysics.collide = entity => {
          if (entity === playerMesh) return false;
          createExplosion(bullet.position);
          object3d_remove(map, bullet);
          if (entity.isPhantom) score += 100;
          if (entity.isScanner) score += 50;
        };
      }

      if (phantomSpawnInterval(dt)) {
        var phantomEnemyMesh = createPhantomEnemy();
        vec3_set(
          phantomEnemyMesh.position,
          randFloat(-160, 150),
          randFloat(128, 32),
          randFloat(-512, -640),
        );
        object3d_add(map, phantomEnemyMesh);
      }

      if (scannerSpawnInterval(dt)) {
        var scannerEnemyMesh = createScannerEnemy();
        vec3_set(
          scannerEnemyMesh.position,
          randFloat(-160, 160),
          randFloat(128, 32),
          randFloat(-512, -720),
        );
        object3d_add(map, scannerEnemyMesh);
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
      var staticMeshes = staticBodies?.map(body => body.parent) || [];
      staticMeshes = [];
      object3d_traverse(
        map,
        object => object.geometry && staticMeshes.push(object),
      );
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

        if (keys.Semicolon) {
          var phantomEnemyMesh = createPhantomEnemy();
          Object.assign(phantomEnemyMesh.position, intersection.point);
          object3d_add(map, phantomEnemyMesh);
        }

        if (keys.Quote) {
          var scannerEnemyMesh = createScannerEnemy();
          Object.assign(scannerEnemyMesh.position, intersection.point);
          object3d_add(map, scannerEnemyMesh);
        }
      }
    });
  }

  return {
    ambient,
    directional,
  };
};
