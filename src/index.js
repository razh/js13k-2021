/* global canvas */

import { bufferGeom_fromGeom } from './bufferGeom.js';
import { camera_create, camera_updateProjectionMatrix } from './camera.js';
import { controls_create } from './controls.js';
import { lightShadow_updateMatrices } from './directionalLightShadow.js';
import { entity_update } from './entity.js';
import { map0 } from './maps.js';
import { mat4_invert, mat4_multiplyMatrices } from './mat4.js';
import {
  object3d_create,
  object3d_traverse,
  object3d_updateWorldMatrix,
} from './object3d.js';
import { orthoCamera_updateProjectionMatrix } from './orthoCamera.js';
import { pointerLock_create } from './pointerLock.js';
import {
  createFloat32Buffer,
  createShaderProgram,
  getAttributeLocations,
  getUniformLocations,
  setFloat32Attribute,
  setMat4Uniform,
  setVec3Uniform,
} from './shader.js';
import depthFrag from './shaders/depth_frag.glsl.js';
import depthVert from './shaders/depth_vert.glsl.js';
import frag from './shaders/phong_frag.glsl.js';
import vert from './shaders/phong_vert.glsl.js';
import {
  vec3_create,
  vec3_multiplyScalar,
  vec3_setFromMatrixPosition,
  vec3_sub,
  vec3_transformDirection,
} from './vec3.js';

var gl = canvas.getContext('webgl2');

gl.clearColor(0, 0, 0, 0);
gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.depthFunc(gl.LEQUAL);

var running = false;

// Scene
var scene = object3d_create();
scene.fogColor = vec3_create();
scene.fogNear = 1;
scene.fogFar = 1000;

// Camera
var camera = camera_create(90);
pointerLock_create(controls_create(camera), canvas);

var { ambient, directional } = map0(gl, scene, camera);

// Shader
var program = createShaderProgram(gl, vert, frag);
var depthProgram = createShaderProgram(gl, depthVert, depthFrag);

var attributes = getAttributeLocations(gl, program);
var uniforms = getUniformLocations(gl, program);

var depthAttributes = getAttributeLocations(gl, depthProgram);
var depthUniforms = getUniformLocations(gl, depthProgram);

var depthTexture = gl.createTexture();
var depthTextureSize = 1024;
gl.bindTexture(gl.TEXTURE_2D, depthTexture);
gl.texImage2D(
  gl.TEXTURE_2D,
  0,
  gl.RGBA8,
  depthTextureSize,
  depthTextureSize,
  0,
  gl.RGBA,
  gl.UNSIGNED_BYTE,
  null,
);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

var depthFramebuffer = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
gl.framebufferTexture2D(
  gl.FRAMEBUFFER,
  gl.COLOR_ATTACHMENT0,
  gl.TEXTURE_2D,
  depthTexture,
  0,
);

var renderBuffer = gl.createRenderbuffer();
gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer);
gl.renderbufferStorage(
  gl.RENDERBUFFER,
  gl.DEPTH_COMPONENT16,
  depthTextureSize,
  depthTextureSize,
);
gl.framebufferRenderbuffer(
  gl.FRAMEBUFFER,
  gl.DEPTH_ATTACHMENT,
  gl.RENDERBUFFER,
  renderBuffer,
);

var dt = 1 / 60;
var accumulatedTime = dt;
var previousTime;

var update = () => {
  var time = (performance.now() || 0) * 1e-3;
  if (!previousTime) {
    previousTime = time;
  }

  var frameTime = Math.min(time - previousTime, 0.1);
  accumulatedTime += frameTime;
  previousTime = time;

  while (accumulatedTime >= dt) {
    object3d_traverse(scene, object => {
      entity_update(object, dt, scene);
    });

    accumulatedTime -= dt;
  }
};

var bufferGeomBuffers = new WeakMap();

var setFloat32AttributeBuffer = (name, location, bufferGeom, size) => {
  var buffers = bufferGeomBuffers.get(bufferGeom) || {};
  bufferGeomBuffers.set(bufferGeom, buffers);

  var buffer = buffers[name] || createFloat32Buffer(gl, bufferGeom[name]);
  buffers[name] = buffer;

  setFloat32Attribute(gl, location, buffer, size);
};

var bufferGeoms = new WeakMap();

var getBufferGeom = geometry => {
  var bufferGeom = bufferGeoms.get(geometry) || bufferGeom_fromGeom(geometry);
  bufferGeoms.set(geometry, bufferGeom);
  return bufferGeom;
};

var renderShadow = mesh => {
  var { geometry } = mesh;

  setMat4Uniform(
    gl,
    depthUniforms.modelViewMatrix,
    mat4_multiplyMatrices(
      mesh.modelViewMatrix,
      directional.shadow.camera.matrixWorldInverse,
      mesh.matrixWorld,
    ),
  );
  setMat4Uniform(
    gl,
    depthUniforms.projectionMatrix,
    directional.shadow.camera.projectionMatrix,
  );

  var bufferGeom = getBufferGeom(geometry);

  setFloat32AttributeBuffer(
    'position',
    depthAttributes.position,
    bufferGeom,
    3,
  );

  gl.drawArrays(gl.TRIANGLES, 0, bufferGeom.position.length / 3);
};

var renderMesh = mesh => {
  var { geometry, material } = mesh;

  gl.uniform1i(uniforms.fog, material.fog);
  setVec3Uniform(gl, uniforms.fogColor, scene.fogColor);
  gl.uniform1f(uniforms.fogNear, scene.fogNear);
  gl.uniform1f(uniforms.fogFar, scene.fogFar);

  setVec3Uniform(gl, uniforms.diffuse, material.color);
  setVec3Uniform(gl, uniforms.specular, material.specular);
  gl.uniform1f(uniforms.shininess, material.shininess);
  setVec3Uniform(gl, uniforms.emissive, material.emissive);

  gl.uniform1i(uniforms.receiveShadow, mesh.receiveShadow);
  setMat4Uniform(gl, uniforms.modelMatrix, mesh.matrixWorld);
  setMat4Uniform(
    gl,
    uniforms.modelViewMatrix,
    mat4_multiplyMatrices(
      mesh.modelViewMatrix,
      camera.matrixWorldInverse,
      mesh.matrixWorld,
    ),
  );
  setMat4Uniform(gl, uniforms.projectionMatrix, camera.projectionMatrix);

  var bufferGeom = getBufferGeom(geometry);

  setFloat32AttributeBuffer('position', attributes.position, bufferGeom, 3);
  setFloat32AttributeBuffer('color', attributes.color, bufferGeom, 3);

  gl.drawArrays(gl.TRIANGLES, 0, bufferGeom.position.length / 3);
};

var vector3 = vec3_create();
var direction = vec3_create();

var render = () => {
  object3d_updateWorldMatrix(scene);
  camera.matrixWorldInverse.set(camera.matrixWorld);
  mat4_invert(camera.matrixWorldInverse);

  gl.useProgram(depthProgram);
  gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
  gl.viewport(0, 0, depthTextureSize, depthTextureSize);
  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.frontFace(gl.CW);

  lightShadow_updateMatrices(directional.shadow, directional);
  orthoCamera_updateProjectionMatrix(directional.shadow.camera);

  object3d_traverse(scene, object => {
    if (object.visible && object.geometry && object.castShadow) {
      renderShadow(object);
    }
  });

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  gl.useProgram(program);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.frontFace(gl.CCW);

  // Ambient light.
  setVec3Uniform(gl, uniforms.ambient, ambient);

  // Directional light.
  vec3_setFromMatrixPosition(direction, directional.matrixWorld);
  vec3_setFromMatrixPosition(vector3, directional.target.matrixWorld);
  vec3_transformDirection(
    vec3_sub(direction, vector3),
    camera.matrixWorldInverse,
  );

  var color = vec3_multiplyScalar(
    Object.assign(vector3, directional.color),
    directional.intensity,
  );

  setVec3Uniform(gl, uniforms['directionalLight.direction'], direction);
  setVec3Uniform(gl, uniforms['directionalLight.color'], color);
  setMat4Uniform(
    gl,
    uniforms.directionalShadowMatrix,
    directional.shadow.matrix,
  );

  // Objects.
  object3d_traverse(scene, object => {
    if (object.visible && object.geometry && object.material) {
      renderMesh(object);
    }
  });
};

var animate = () => {
  update();
  render();

  if (running) {
    requestAnimationFrame(animate);
  }
};

var setSize = (width, height) => {
  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  gl.viewport(0, 0, canvas.width, canvas.height);

  camera.aspect = width / height;
  camera_updateProjectionMatrix(camera);
};

setSize(innerWidth, innerHeight);
animate();

addEventListener('resize', () => {
  setSize(innerWidth, innerHeight);
  render();
});

addEventListener('keypress', event => {
  // Pause/play.
  if (event.code === 'KeyP') {
    running = !running;
    if (running) {
      animate();
    } else {
      document.exitPointerLock();
    }
  }
});

addEventListener('click', () => {
  if (!running) {
    running = true;
    animate();
  }
});
