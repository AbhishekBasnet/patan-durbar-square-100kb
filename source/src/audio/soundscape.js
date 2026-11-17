// The mix: starts Web Audio on the first click (browsers require a gesture), places each sound where it comes
// from and moves the listener with the camera. The wind blows everywhere in slow gusts; the small eave bells of
// a temple ring only when you are near it, more often when it gusts; Manga Hiti's water grows as you come near and fills the pit when you walk
// down into it. Sound is on by default and M toggles it. Depends on ambientSounds.js, layout.js and math.js.

import { createNoiseBuffer, startWind, startRunningWater, strikeBell, strikeEaveBell } from './ambientSounds.js';
import { monumentLayout } from '../square/layout.js';
import { createRandom } from '../core/math.js';

const masterVolume = 1.0;
const windGustSeconds = [11, 17]; // two slow cycles beating against each other
const windCalmLevel = 0.12;
const windGustLevel = 0.42;
const eaveBellStrikesPerSecond = [0.25, 1.4]; // per nearby temple, in calm air and in a full gust
const eaveBellHertz = [1250, 2300]; // small bells, each cast a little differently
const eaveBellLoudness = 0.22;
const eaveBellRadiusMetres = 4.5; // they hang around the eaves, this far from the temple's centre
const eaveBellHeightMetres = 5;
const eaveBellHearingMetres = 25; // beyond this a temple's little bells are not heard at all
const clapperBounceChance = 0.35; // the clapper often taps the bell again, softer
const clapperBounceSeconds = [0.06, 0.14];
const templeBellEverySeconds = [9, 22];
const talejuBellEverySeconds = [45, 100];
const pitWaterBoost = 2.2; // down in the pit the water fills your ears
const templeNames = ['bhimsenTemple', 'vishwanathTemple', 'krishnaMandir', 'charNarayanTemple', 'hariShankarTemple', 'octagonalKrishnaTemple', 'degutaleTemple'];

export function createSoundscape(camera) {
  const random = createRandom(1990);
  const rows = Object.fromEntries(monumentLayout.map((row) => [row.name, row]));
  let context = null, master, wind, water, noise, isMuted = false, time = 0, nextTempleBell = 6, nextTalejuBell = 30;

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
  // a little bell somewhere around a temple's eaves: loud close by, gone within eaveBellHearingMetres
  const ringEaveBell = (row, loudness) => {
    const angle = random() * 2 * Math.PI;
    const panner = context.createPanner();
    panner.panningModel = 'equalpower';
    panner.distanceModel = 'linear';
    panner.refDistance = 2;
    panner.maxDistance = eaveBellHearingMetres;
    panner.positionX.value = row.x + Math.cos(angle) * eaveBellRadiusMetres;
    panner.positionY.value = eaveBellHeightMetres;
    panner.positionZ.value = row.z + Math.sin(angle) * eaveBellRadiusMetres;
    panner.connect(master);
    const bell = { fundamental: random.between(eaveBellHertz[0], eaveBellHertz[1]), loudness };
    strikeEaveBell(context, noise, panner, bell);
    if (random() < clapperBounceChance) {
      setTimeout(() => strikeEaveBell(context, noise, panner, { ...bell, loudness: loudness * 0.4 }), random.between(clapperBounceSeconds[0], clapperBounceSeconds[1]) * 1000);
    }
    setTimeout(() => panner.disconnect(), 2500);
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
      noise = createNoiseBuffer(context);
      wind = startWind(context, noise, master);
      const pit = rows.mangaHiti;
      water = startRunningWater(context, noise, createPanner(pit.x - 5, -1.6, pit.z, 4));
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
      // the eave bells of each temple within earshot, swung by the wind: now and then in calm air, often in a gust
      const strikeRate = eaveBellStrikesPerSecond[0] + (eaveBellStrikesPerSecond[1] - eaveBellStrikesPerSecond[0]) * gust;
      for (let index = 0; index < templeNames.length; index++) {
        const temple = rows[templeNames[index]];
        if (Math.hypot(temple.x - eye[0], temple.z - eye[2]) > eaveBellHearingMetres) continue;
        if (random() < strikeRate * secondsElapsed) ringEaveBell(temple, eaveBellLoudness * random.between(0.5, 1));
      }
      if (time > nextTempleBell) {
        nextTempleBell = time + random.between(...templeBellEverySeconds);
        ringAt(rows[templeNames[Math.floor(random() * templeNames.length)]], 2, 12, { fundamental: random.between(650, 950), loudness: 0.3, decaySeconds: 3.5 });
      }
      if (time > nextTalejuBell) {
        nextTalejuBell = time + random.between(...talejuBellEverySeconds);
        ringAt(rows.talejuBell, 3, 20, { fundamental: 92, loudness: 0.6, decaySeconds: 9 });
      }
      // down in Manga Hiti the walls hold the sound of the water in
      water.gain.setTargetAtTime(eye[1] < 0 ? 0.8 * pitWaterBoost : 0.8, context.currentTime, 0.3);
    },
  };
}
