// Keyboard, mouse and touch input, collected into one plain state object that camera.js reads each frame.
// One-shot keys (stats, sound, film look, menu, viewpoints) call the matching function in `actions`.
// Depends on nothing; the page shell (template.html) turns phones held upright into landscape.

const mouseLookRadiansPerPixel = 0.0022;
const touchLookRadiansPerPixel = 0.0035;
const touchJoystickTurnSpeed = 1.5; // radians per second at full finger offset
const touchJoystickReachFraction = 0.25; // finger offset (share of the short screen side) for full turn speed

export function createInput(canvas, actions) {
  const state = {
    forward: 0, backward: 0, left: 0, right: 0, fast: 0,
    jumpRequested: false,
    lookYaw: 0, lookPitch: 0, // radians of turn waiting to be applied
    touchWalking: false,
    enabled: false, // false while the menu is open
  };
  const pageIsTurned = matchMedia('(orientation:portrait) and (pointer:coarse)');

  const setMovementKey = (code, isDown) => {
    switch (code) {
      case 'KeyW': case 'ArrowUp': state.forward = isDown; return true;
      case 'KeyS': case 'ArrowDown': state.backward = isDown; return true;
      case 'KeyA': case 'ArrowLeft': state.left = isDown; return true;
      case 'KeyD': case 'ArrowRight': state.right = isDown; return true;
      case 'ShiftLeft': case 'ShiftRight': state.fast = isDown; return true;
    }
    return false;
  };

  addEventListener('keydown', (event) => {
    actions.onAnyInput();
    if (event.code === 'KeyH') return actions.toggleStats();
    if (event.code === 'KeyM') return actions.toggleSound();
    if (!state.enabled) return;
    if (setMovementKey(event.code, 1) || event.repeat) return;
    if (event.code === 'Space') state.jumpRequested = true;
    else if (event.code === 'KeyV') actions.toggleFilmLook();
    else if (event.code === 'Escape') actions.openMenu();
    else if (event.code >= 'Digit1' && event.code <= 'Digit6') actions.jumpToViewpoint(event.code.charCodeAt(5) - 49);
    else actions.onOtherKey?.(event.code);
  });
  addEventListener('keyup', (event) => setMovementKey(event.code, 0));

  const releaseEverything = () => {
    state.forward = state.backward = state.left = state.right = state.fast = 0;
    state.touchWalking = false;
    touchId = -1;
  };
  addEventListener('blur', releaseEverything);

  // mouse look while the pointer is captured
  const capturePointer = () => {
    const request = canvas.requestPointerLock({ unadjustedMovement: true });
    // some systems refuse raw mouse input: fall back to the ordinary pointer lock
    request?.catch?.(() => canvas.requestPointerLock())?.catch?.(() => {});
  };
  canvas.addEventListener('click', () => state.enabled && capturePointer());
  addEventListener('mousemove', (event) => {
    if (document.pointerLockElement !== canvas) return;
    state.lookYaw += event.movementX * mouseLookRadiansPerPixel;
    state.lookPitch -= event.movementY * mouseLookRadiansPerPixel;
  });

  // touch: one finger walks forward and steers (the view follows the finger, and holding it away from
  // where it went down keeps turning like a joystick); a second finger walks faster
  let touchId = -1, touchStartX = 0, touchStartY = 0, touchX = 0, touchY = 0;
  const onTouch = (event) => {
    event.preventDefault();
    actions.onAnyInput();
    if (!state.enabled) return;
    let finger = null, isNewFinger = false;
    for (const touch of event.touches) if (touch.identifier === touchId) finger = touch;
    if (!finger && event.touches.length) {
      finger = event.touches[0];
      touchId = finger.identifier;
      isNewFinger = true;
    }
    state.touchWalking = !!finger;
    state.fast = event.touches.length > 1 ? 1 : 0;
    if (!finger) { touchId = -1; return; }
    // the touch axes turn with the page when it lies on its side
    const x = pageIsTurned.matches ? finger.clientY : finger.clientX;
    const y = pageIsTurned.matches ? -finger.clientX : finger.clientY;
    if (isNewFinger) { touchStartX = x; touchStartY = y; }
    else {
      state.lookYaw += (x - touchX) * touchLookRadiansPerPixel;
      state.lookPitch -= (y - touchY) * touchLookRadiansPerPixel;
    }
    touchX = x; touchY = y;
  };
  for (const name of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
    canvas.addEventListener(name, onTouch, { passive: false });
  }

  // called every frame: the joystick part of touch steering
  state.applyTouchJoystick = (secondsElapsed) => {
    if (touchId < 0) return;
    const reachPixels = Math.min(innerWidth, innerHeight) * touchJoystickReachFraction;
    const offsetX = Math.max(-1, Math.min(1, (touchX - touchStartX) / reachPixels));
    const offsetY = Math.max(-1, Math.min(1, (touchY - touchStartY) / reachPixels));
    state.lookYaw += offsetX * touchJoystickTurnSpeed * secondsElapsed;
    state.lookPitch -= offsetY * touchJoystickTurnSpeed * 0.5 * secondsElapsed;
  };

  state.capturePointer = capturePointer;
  state.releaseEverything = releaseEverything;
  return state;
}
