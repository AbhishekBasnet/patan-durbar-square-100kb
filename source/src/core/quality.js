// Quality presets (High / Medium / Low) and the first-visit pick from the detected GPU and screen.
// The chosen preset is remembered in localStorage; the menu buttons change it and reload the page.
// Depends on nothing; main.js reads the preset before anything is built.

const storageKey = 'patanDurbarQuality';

// Every preset shows the same square; lower ones only remove fine detail and pixels.
export const qualityPresets = {
  high: {
    name: 'high',
    antialiasingSamples: 4,
    maximumRenderPixels: 2560 * 1440,
  },
  // the target: Intel Iris Xe (12th gen Core) and Radeon 680M at 1920x1080, 60 fps
  medium: {
    name: 'medium',
    antialiasingSamples: 4,
    maximumRenderPixels: 1920 * 1080,
  },
  // older integrated graphics and phones: starts below full resolution
  low: {
    name: 'low',
    antialiasingSamples: 1,
    maximumRenderPixels: 1280 * 720,
  },
};

export const qualityNames = ['low', 'medium', 'high'];

function readStoredQuality() {
  try {
    return localStorage[storageKey];
  } catch {
    return undefined; // storage blocked: pick again every visit
  }
}

export function storeQuality(name) {
  try {
    localStorage[storageKey] = name;
  } catch {
    // storage blocked: the choice lasts for this visit only
  }
}

// First visit: guess from the GPU. adapterInfo is GPUAdapter.info (vendor and architecture strings).
function guessQualityFromHardware(adapterInfo) {
  const isTouchDevice = matchMedia('(pointer:coarse)').matches;
  if (isTouchDevice) return 'low';
  const vendor = (adapterInfo.vendor || '').toLowerCase();
  const architecture = (adapterInfo.architecture || '').toLowerCase();
  if (vendor.includes('nvidia')) return 'high';
  // Radeon 780M and newer (RDNA 3) manage High; older AMD integrated graphics get the target preset
  if (vendor.includes('amd') && /rdna-?[34]/.test(architecture)) return 'high';
  return 'medium';
}

export function pickQuality(adapterInfo) {
  const stored = readStoredQuality();
  if (qualityPresets[stored]) return qualityPresets[stored];
  const guessed = guessQualityFromHardware(adapterInfo || {});
  storeQuality(guessed);
  return qualityPresets[guessed];
}
