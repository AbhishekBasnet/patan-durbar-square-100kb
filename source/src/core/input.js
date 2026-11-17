// Keyboard, mouse and touch input, collected into one plain state object that camera.js reads each frame.
// One-shot keys (stats, sound, film look, menu, viewpoints) call the matching function in `actions`; on touch
// screens an on-screen joystick and buttons do the same.
// Depends on nothing; the page shell (template.html) turns phones held upright into landscape.

const mouseLookRadiansPerPixel = 0.0022;
const touchLookRadiansPerPixel = 0.0035;
const joystickKnobTravel = 60; // how far the knob follows the finger, in percent of its own size

export function createInput(canvas, actions) {
  const state = {
    forward: 0, backward: 0, left: 0, right: 0, fast: 0,
    jumpRequested: false,
    lookYaw: 0, lookPitch: 0, // radians of turn waiting to be applied
    touchForward: 0, touchSide: 0, // the on-screen joystick, -1..1
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
    state.touchForward = state.touchSide = 0;
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

  // touch screens get an on-screen controller (template.html): a joystick bottom left to walk, a drag anywhere
  // else to look around, and buttons for hop, fast, next viewpoint, film look and sound
  const turnedPoint = (touch) => pageIsTurned.matches ? [touch.clientY, -touch.clientX] : [touch.clientX, touch.clientY];
  let lookTouchId = -1, lookX = 0, lookY = 0;
  const onLookTouch = (event) => {
    event.preventDefault();
    actions.onAnyInput();
    if (!state.enabled) return;
    let finger = null;
    for (const touch of event.changedTouches) if (lookTouchId < 0 || touch.identifier === lookTouchId) finger = touch;
    if (!finger) return;
    const [x, y] = turnedPoint(finger);
    if (event.type === 'touchstart') {
      lookTouchId = finger.identifier;
    } else if (event.type === 'touchmove') {
      state.lookYaw += (x - lookX) * touchLookRadiansPerPixel;
      state.lookPitch -= (y - lookY) * touchLookRadiansPerPixel;
    } else {
      lookTouchId = -1;
    }
    lookX = x; lookY = y;
  };
  for (const name of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) canvas.addEventListener(name, onLookTouch, { passive: false });

  const joystick = document.getElementById('joystick'), knob = document.getElementById('joystick-knob');
  let joystickTouchId = -1;
  const onJoystickTouch = (event) => {
    event.preventDefault();
    actions.onAnyInput();
    for (const touch of event.changedTouches) {
      if (event.type === 'touchstart' && joystickTouchId < 0) joystickTouchId = touch.identifier;
      if (touch.identifier !== joystickTouchId) continue;
      if (event.type === 'touchend' || event.type === 'touchcancel') {
        joystickTouchId = -1;
        state.touchForward = state.touchSide = 0;
        knob.style.transform = '';
        continue;
      }
      // the knob's offset from the joystick's centre, as a share of its reach, is the walking direction
      const bounds = joystick.getBoundingClientRect(), reach = Math.min(bounds.width, bounds.height) / 2;
      const [x, y] = turnedPoint(touch);
      const [centreX, centreY] = turnedPoint({ clientX: bounds.left + bounds.width / 2, clientY: bounds.top + bounds.height / 2 });
      let offsetX = (x - centreX) / reach, offsetY = (y - centreY) / reach;
      const length = Math.hypot(offsetX, offsetY);
      if (length > 1) { offsetX /= length; offsetY /= length; }
      state.touchSide = offsetX;
      state.touchForward = -offsetY;
      knob.style.transform = `translate(${offsetX * joystickKnobTravel}%, ${offsetY * joystickKnobTravel}%)`;
    }
  };
  for (const name of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) joystick.addEventListener(name, onJoystickTouch, { passive: false });

  const onButton = (id, press) => document.getElementById(id).addEventListener('touchstart', (event) => {
    event.preventDefault();
    actions.onAnyInput();
    if (state.enabled) press(event.currentTarget);
  }, { passive: false });
  onButton('touch-hop', () => { state.jumpRequested = true; });
  onButton('touch-fast', (button) => { state.fast = state.fast ? 0 : 1; button.classList.toggle('on', !!state.fast); });
  onButton('touch-view', () => actions.nextViewpoint());
  onButton('touch-film', () => actions.toggleFilmLook());
  onButton('touch-sound', () => actions.toggleSound());

  state.capturePointer = capturePointer;
  state.releaseEverything = releaseEverything;
  return state;
}
