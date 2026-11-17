// What the vendors wore in Patan in the mid-1980s, as colours and accessories for the person mesh (figures.js):
// daura-suruwal with a dhaka topi, saris and shawls, the black haku patasi with its red border, an old man's
// shawl, shirt and trousers. Colours are faded, as on period film.
// Depends on figures.js (the accessory bits).

import { accessory } from './figures.js';

const bit = (accessoryId) => 1 << accessoryId;
const skinTones = [[0.55, 0.37, 0.25], [0.48, 0.31, 0.2], [0.6, 0.42, 0.29], [0.42, 0.27, 0.17]];
const dhakaTopiColors = [[0.55, 0.2, 0.15], [0.3, 0.25, 0.45], [0.5, 0.35, 0.15], [0.15, 0.15, 0.15]]; // printed dhaka cloth, read from afar as one hue
const sariColors = [[0.62, 0.12, 0.1], [0.75, 0.48, 0.1], [0.2, 0.35, 0.55], [0.55, 0.15, 0.35], [0.25, 0.42, 0.25], [0.7, 0.55, 0.4]];
const shawlColors = [[0.42, 0.36, 0.3], [0.55, 0.5, 0.42], [0.35, 0.28, 0.22], [0.6, 0.15, 0.1]];

// Each outfit: colours for top, bottom, hat and accent, and which accessories are on.
export const outfits = {
  dauraSuruwal: (pick) => ({ top: [0.75, 0.72, 0.62], bottom: [0.72, 0.68, 0.58], hat: pick(dhakaTopiColors), accent: pick(shawlColors), accessories: bit(accessory.dhakaTopi) }),
  oldManInShawl: (pick) => ({ top: [0.7, 0.66, 0.56], bottom: [0.68, 0.64, 0.55], hat: pick(dhakaTopiColors), accent: pick(shawlColors), accessories: bit(accessory.dhakaTopi) | bit(accessory.shawl) }),
  sari: (pick) => { const color = pick(sariColors); return { top: color.map((channel) => channel * 0.85), bottom: color, hat: [0, 0, 0], accent: pick(shawlColors), accessories: bit(accessory.skirt) | bit(accessory.hairBun) }; },
  sariWithShawl: (pick) => { const color = pick(sariColors); return { top: color, bottom: color, hat: [0, 0, 0], accent: pick(shawlColors), accessories: bit(accessory.skirt) | bit(accessory.hairBun) | bit(accessory.shawl) }; },
  hakuPatasi: () => ({ top: [0.08, 0.07, 0.07], bottom: [0.06, 0.05, 0.05], hat: [0, 0, 0], accent: [0.55, 0.08, 0.06], accessories: bit(accessory.skirt) | bit(accessory.hairBun) | bit(accessory.shawl) }),
  shirtAndTrousers: (pick) => ({ top: pick([[0.6, 0.6, 0.62], [0.55, 0.45, 0.35], [0.35, 0.4, 0.5]]), bottom: [0.3, 0.28, 0.27], hat: [0, 0, 0], accent: [0, 0, 0], accessories: 0 }),
};

// Dresses a person: the outfit's colours plus a skin tone and a little fading per garment.
export function dress(outfitName, random) {
  const pick = (choices) => choices[Math.floor(random() * choices.length)];
  const look = outfits[outfitName](pick);
  const fade = () => random.between(0.85, 1.05);
  return {
    ...look,
    top: look.top.map((channel) => channel * fade()),
    bottom: look.bottom.map((channel) => channel * fade()),
    skin: pick(skinTones),
  };
}
