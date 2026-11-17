// The square's sounds, synthesized live (no recordings): a slow wind that rises and falls in gusts, the small
// bronze bells under the temple eaves struck by their wind-swung clappers, now and then a temple bell struck by a worshipper or the deep
// Taleju bell, and the water running from Manga Hiti's spouts. Depends on nothing (Web Audio only).

// One second of white noise, shared by the wind and the water.
export function createNoiseBuffer(context) {
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
  return buffer;
}

function loopNoise(context, noise) {
  const source = context.createBufferSource();
  source.buffer = noise;
  source.loop = true;
  source.start();
  return source;
}

// The wind: low noise whose loudness and brightness the soundscape moves with each gust.
export function startWind(context, noise, output) {
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 350;
  const level = context.createGain();
  level.gain.value = 0;
  loopNoise(context, noise).connect(filter).connect(level).connect(output);
  return { level, filter };
}

// Running water: a bright splash band and a softer, lower churn of the pool.
export function startRunningWater(context, noise, output) {
  const level = context.createGain();
  level.gain.value = 0.5;
  for (const [type, frequency, loudness] of [['highpass', 1800, 0.7], ['bandpass', 500, 0.5]]) {
    const filter = context.createBiquadFilter(), bandLevel = context.createGain();
    filter.type = type;
    filter.frequency.value = frequency;
    bandLevel.gain.value = loudness;
    loopNoise(context, noise).connect(filter).connect(bandLevel).connect(level);
  }
  level.connect(output);
  return level;
}

// A struck bell: inharmonic partials (in the ratios of real bronze bells), each dying away at its own rate.
const bellPartials = [[0.5, 0.6, 1], [1, 1, 0.8], [1.19, 0.5, 0.5], [1.5, 0.4, 0.4], [2.0, 0.3, 0.3], [2.74, 0.2, 0.2]];
export function strikeBell(context, output, { fundamental, loudness, decaySeconds }) {
  const start = context.currentTime;
  for (const [ratio, share, decayShare] of bellPartials) {
    const tone = context.createOscillator(), level = context.createGain();
    tone.frequency.value = fundamental * ratio;
    level.gain.setValueAtTime(loudness * share, start);
    level.gain.exponentialRampToValueAtTime(0.0001, start + decaySeconds * decayShare);
    tone.connect(level).connect(output);
    tone.start(start);
    tone.stop(start + decaySeconds * decayShare + 0.05);
  }
}

// A small eave bell struck once by its clapper: a tiny metallic click, then the ring of a small cast bronze
// bell. Its partials are inharmonic (as on real small bells); each is doubled and slightly detuned, so it
// shimmers; the higher ones die first.
const eaveBellPartials = [[1, 1, 1.6], [2.32, 0.55, 0.9], [4.25, 0.3, 0.5], [6.63, 0.16, 0.28]]; // ratio, loudness, seconds
const shimmerHertz = 1.6; // the slow beating of a slightly uneven casting
const clapperClickSeconds = 0.012;
const clapperClickHertz = 4500;

export function strikeEaveBell(context, noise, output, { fundamental, loudness }) {
  const start = context.currentTime;
  for (const [ratio, share, decaySeconds] of eaveBellPartials) {
    for (const detune of [-shimmerHertz / 2, shimmerHertz / 2]) {
      const tone = context.createOscillator(), level = context.createGain();
      tone.frequency.value = fundamental * ratio + detune * ratio;
      level.gain.setValueAtTime(0, start);
      level.gain.linearRampToValueAtTime(loudness * share * 0.5, start + 0.002);
      level.gain.exponentialRampToValueAtTime(0.0001, start + decaySeconds);
      tone.connect(level).connect(output);
      tone.start(start);
      tone.stop(start + decaySeconds + 0.05);
    }
  }
  // the clapper's tap: a very short burst of bright noise
  const click = context.createBufferSource(), clickFilter = context.createBiquadFilter(), clickLevel = context.createGain();
  click.buffer = noise;
  clickFilter.type = 'highpass';
  clickFilter.frequency.value = clapperClickHertz;
  clickLevel.gain.setValueAtTime(loudness * 0.6, start);
  clickLevel.gain.exponentialRampToValueAtTime(0.0001, start + clapperClickSeconds);
  click.connect(clickFilter).connect(clickLevel).connect(output);
  click.start(start, Math.random() * 0.9, clapperClickSeconds);
}
