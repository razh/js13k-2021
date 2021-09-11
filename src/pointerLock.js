export var pointerLock_create = (controls, element) => {
  document.addEventListener(
    'pointerlockchange',
    () => (controls.enabled = element === document.pointerLockElement),
  );

  addEventListener('click', () => element.requestPointerLock());
};
