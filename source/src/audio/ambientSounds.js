// The square's sounds, synthesized live (no recordings): a slow wind that rises and falls in gusts, the small
// bells under the temple eaves chiming in it, now and then a temple bell struck by a worshipper or the deep
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
