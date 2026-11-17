// The mix: starts Web Audio on the first click (browsers require a gesture), places each sound where it comes
// from and moves the listener with the camera. The wind blows everywhere in slow gusts; the eave bells of the
// temples chime more when it gusts; Manga Hiti's water grows as you come near and fills the pit when you walk
// down into it. Sound is on by default and M toggles it. Depends on ambientSounds.js, layout.js and math.js.

import { createNoiseBuffer, startWind, startRunningWater, strikeBell } from './ambientSounds.js';
import { monumentLayout } from '../square/layout.js';
import { createRandom } from '../core/math.js';

const masterVolume = 0.8;
const windGustSeconds = [11, 17]; // two slow cycles beating against each other
const windCalmLevel = 0.06;
const windGustLevel = 0.22;
const eaveChimesPerSecondInGust = 1.6;
const templeBellEverySeconds = [9, 22];
const talejuBellEverySeconds = [45, 100];
const pitWaterBoost = 2.2; // down in the pit the water fills your ears
const templeNames = ['bhimsenTemple', 'vishwanathTemple', 'krishnaMandir', 'charNarayanTemple', 'hariShankarTemple', 'octagonalKrishnaTemple', 'degutaleTemple'];

export function createSoundscape(camera) {
  const random = createRandom(1990);
  const rows = Object.fromEntries(monumentLayout.map((row) => [row.name, row]));
  let context = null, master, wind, water, isMuted = false, time = 0, nextTempleBell = 6, nextTalejuBell = 30;

  const createPanner = (x, y, z, referenceDistance) => {
    const panner = context.createPanner();
    panner.panningModel = 'equalpower';
    panner.distanceModel = 'inverse';
    panner.refDistance = referenceDistance;
    panner.rolloffFactor = 1.3;
    panner.positionX.value = x; panner.positionY.value = y; panner.positionZ.value = z;
    panner.connect(master);
    return panner;
  };
  const ringAt = (row, height, referenceDistance, bell) => {
    const panner = createPanner(row.x + random.between(-2, 2), height, row.z + random.between(-2, 2), referenceDistance);
    strikeBell(context, panner, bell);
    setTimeout(() => panner.disconnect(), (bell.decaySeconds + 1) * 1000); // once the bell has died away
  };

  return {
    start() {
      if (context) return;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = isMuted ? 0 : masterVolume;
      master.connect(context.destination);
      const noise = createNoiseBuffer(context);
      wind = startWind(context, noise, master);
      const pit = rows.mangaHiti;
      water = startRunningWater(context, noise, createPanner(pit.x - 5, -1.6, pit.z, 1.5));
    },
    toggleMute() {
      isMuted = !isMuted;
      if (context) master.gain.setTargetAtTime(isMuted ? 0 : masterVolume, context.currentTime, 0.1);
    },
    update(secondsElapsed) {
      if (!context) return;
      time += secondsElapsed;
      const listener = context.listener, eye = camera.eyePosition;
      listener.positionX.value = eye[0]; listener.positionY.value = eye[1]; listener.positionZ.value = eye[2];
      listener.forwardX.value = Math.sin(camera.yaw); listener.forwardY.value = 0; listener.forwardZ.value = -Math.cos(camera.yaw);
      // the wind: gusts swell and fade, and grow brighter as they swell
      const gust = Math.max(0, 0.5 * Math.sin(time * 2 * Math.PI / windGustSeconds[0]) + 0.5 * Math.sin(time * 2 * Math.PI / windGustSeconds[1] + 1.3));
      wind.level.gain.setTargetAtTime(windCalmLevel + (windGustLevel - windCalmLevel) * gust, context.currentTime, 0.4);
      wind.filter.frequency.setTargetAtTime(280 + 500 * gust, context.currentTime, 0.4);
      // the eave bells chime in the gusts
      if (random() < eaveChimesPerSecondInGust * gust * secondsElapsed) {
        ringAt(rows[templeNames[Math.floor(random() * templeNames.length)]], 7, 4, { fundamental: random.between(1900, 3200), loudness: 0.05, decaySeconds: 1.4 });
      }
      if (time > nextTempleBell) {
        nextTempleBell = time + random.between(...templeBellEverySeconds);
        ringAt(rows[templeNames[Math.floor(random() * templeNames.length)]], 2, 3, { fundamental: random.between(650, 950), loudness: 0.12, decaySeconds: 3 });
      }
      if (time > nextTalejuBell) {
        nextTalejuBell = time + random.between(...talejuBellEverySeconds);
        ringAt(rows.talejuBell, 3, 8, { fundamental: 92, loudness: 0.35, decaySeconds: 9 });
      }
      // down in Manga Hiti the walls hold the sound of the water in
      water.gain.setTargetAtTime(eye[1] < 0 ? 0.5 * pitWaterBoost : 0.5, context.currentTime, 0.3);
    },
  };
}
