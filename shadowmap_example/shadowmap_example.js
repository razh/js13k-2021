/* global THREE */

var container = document.createElement('div');
document.body.append(container);

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
container.append(renderer.domElement);

var scene = new THREE.Scene();
scene.fog = new THREE.Fog(0);
var camera = new THREE.PerspectiveCamera(90, innerWidth / innerHeight);
camera.position.set(16, 16, 32);

var ambientLight = new THREE.AmbientLight(new THREE.Color(0.5, 0.5, 0.5));
scene.add(ambientLight);

var directionalLight = new THREE.DirectionalLight();
Object.assign(directionalLight.shadow.camera, {
  left: -128,
  right: 128,
  top: 128,
  bottom: -128,
});
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.position.set(64, 256, -64);
directionalLight.castShadow = true;
scene.add(directionalLight);

var mesh = new THREE.Mesh(
  new THREE.BoxGeometry(8, 8, 8),
  new THREE.MeshPhongMaterial(),
);
mesh.position.y = 4;
mesh.castShadow = true;
mesh.receiveShadow = true;
scene.add(mesh);

var mesh2 = new THREE.Mesh(
  new THREE.BoxGeometry(8, 24, 8),
  new THREE.MeshPhongMaterial(),
);
mesh2.position.set(6, 12, -8);
mesh2.castShadow = true;
mesh2.receiveShadow = true;
scene.add(mesh2);

var plane = new THREE.Mesh(
  new THREE.BoxGeometry(256, 8, 256),
  new THREE.MeshPhongMaterial(),
);
plane.position.y = -4;
plane.castShadow = true;
plane.receiveShadow = true;
scene.add(plane);

var render = () => renderer.render(scene, camera);

render();

container.addEventListener('click', render);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(innerWidth, innerHeight);
  render();
});
