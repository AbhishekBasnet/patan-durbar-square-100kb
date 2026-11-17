// The vendors: men and women sitting on the paving with their goods spread in front of them on cloth, straw
// mats and round bamboo trays (nanglo): vegetables, oranges, spices, rice and lentils, clay and brass pots,
// bangles, cloth, roasted corn and peanuts, sugarcane, tea in glass tumblers, Newar snacks, a curio and thangka
// stall, and grain drying on mats. The goods are built into the scene once; only the sellers are figures.
// Depends on meshBuilder.js (through the builder), clothing.js, figures.js, lod.js, materials.js and math.js.

import { material } from '../look/materials.js';
import { detailGroup } from '../core/lod.js';
import { dress } from './clothing.js';
import { figureKind, pose } from './figures.js';
import { createRandom } from '../core/math.js';

const vendorSeed = 1985;
const goodsBlockHeightMetres = 0.6; // goods are a low obstacle: you walk round them, not over them

// [x, z, facing (radians), goods, seller's outfit]
const vendorSpots = [
  [15.0, -14.0, Math.PI, 'vegetables', 'sari'],
  [15.0, -2.0, Math.PI, 'brassPots', 'dauraSuruwal'],
  [14.8, 5.5, Math.PI, 'clayPots', 'hakuPatasi'],
  [15.0, 15.0, Math.PI, 'bangles', 'sariWithShawl'],
  [2.5, -40.0, 0, 'oranges', 'dauraSuruwal'],
  [3.5, -8.0, 0, 'spices', 'sari'],
  [2.8, 8.5, 0, 'riceAndLentils', 'oldManInShawl'],
  [16.5, 28.0, Math.PI, 'roastedCorn', 'shirtAndTrousers'],
  [6.0, -58.0, 0, 'sugarcane', 'dauraSuruwal'],
  [6.5, 30.5, -Math.PI / 2, 'tea', 'dauraSuruwal'],
  [14.5, -50.0, Math.PI, 'curios', 'shirtAndTrousers'],
  [3.5, -56.0, 0, 'snacks', 'hakuPatasi'],
  [14.8, -30.5, Math.PI, 'cloth', 'oldManInShawl'],
  [-1.5, 30.5, -Math.PI / 2, 'grainDrying', 'sari'],
];

// ---- what lies on the ground, in the seller's frame: they sit at the origin facing +x
const cloth = (builder, halfX, halfZ, materialId) => builder.material(materialId, 128).occlusion(0.9).addBox(0.4, 0, -halfZ, 0.4 + halfX * 2, 0.012, halfZ);
const nanglo = (builder, x, z, radius) => builder.material(material.straw, 140).push().translate(x, 0, z).addLathe([[radius, 0], [radius, 0.03], [radius * 0.9, 0.035], [0, 0.03]], 14).pop();
const pile = (builder, random, x, z, radius, count, size, materials) => {
  for (let index = 0; index < count; index++) {
    const angle = random() * 6.28, reach = Math.sqrt(random()) * radius;
    builder.material(materials[index % materials.length], Math.floor(random() * 255));
    builder.push().translate(x + Math.cos(angle) * reach, size * (1 + (1 - reach / radius) * 1.2), z + Math.sin(angle) * reach).scale(size).addSphere(5, 3).pop();
  }
};
const heap = (builder, x, z, radius, height, materialId) => builder.material(materialId, 128).push().translate(x, 0, z).addLathe([[radius, 0], [radius * 0.6, height * 0.6], [0, height]], 8).pop();
const pot = (builder, x, z, size, materialId) => builder.material(materialId, 120).push().translate(x, 0, z).scale(size).addLathe([[0.12, 0], [0.22, 0.12], [0.24, 0.22], [0.14, 0.36], [0.1, 0.4], [0.13, 0.44]], 10).pop();

const goodsBuilders = {
  vegetables(builder, random) {
    nanglo(builder, 0.8, -0.35, 0.38); nanglo(builder, 0.8, 0.45, 0.38);
    pile(builder, random, 0.8, -0.35, 0.28, 14, 0.05, [material.produceGreen]);
    pile(builder, random, 0.8, 0.45, 0.28, 16, 0.04, [material.produceRed, material.rice]);
  },
  oranges(builder, random) {
    builder.material(material.straw, 120).push().translate(0.8, 0, 0).addLathe([[0.18, 0], [0.3, 0.22], [0.32, 0.25], [0, 0.22]], 12).pop();
    pile(builder, random, 0.8, 0, 0.24, 22, 0.045, [material.produceOrange]);
    nanglo(builder, 0.85, 0.65, 0.3); pile(builder, random, 0.85, 0.65, 0.2, 10, 0.045, [material.produceOrange]);
  },
  spices(builder) {
    cloth(builder, 0.45, 0.6, material.clothRed);
    [material.produceRed, material.produceYellow, material.terracotta, material.produceOrange].forEach((materialId, index) => heap(builder, 0.65 + (index % 2) * 0.4, -0.3 + (index >> 1) * 0.6, 0.15, 0.12, materialId));
  },
  riceAndLentils(builder) {
    for (const [z, materialId] of [[-0.45, material.rice], [0, material.produceYellow], [0.45, material.terracotta]]) {
      builder.material(material.straw, 100).push().translate(0.85, 0, z).addLathe([[0.17, 0], [0.19, 0.32], [0.2, 0.34]], 10).pop();
      heap(builder, 0.85, z, 0.18, 0.06, materialId);
      builder.push().translate(0, 0.32, 0); heap(builder, 0.85, z, 0.18, 0.06, materialId); builder.pop();
    }
  },
  clayPots(builder, random) {
    cloth(builder, 0.6, 0.8, material.straw);
    for (let index = 0; index < 7; index++) pot(builder, 0.6 + (index % 3) * 0.38, -0.6 + Math.floor(index / 3) * 0.55 + random() * 0.1, random.between(0.6, 1.1), material.terracotta);
  },
  brassPots(builder, random) {
    cloth(builder, 0.55, 0.75, material.clothBlue);
    for (let index = 0; index < 6; index++) pot(builder, 0.6 + (index % 2) * 0.45, -0.55 + Math.floor(index / 2) * 0.55, random.between(0.6, 0.9), material.bronze);
  },
  bangles(builder, random) {
    cloth(builder, 0.45, 0.6, material.clothRed);
    builder.withDetail(detailGroup.nearOnly, () => {
      for (let index = 0; index < 18; index++) {
        const x = 0.6 + (index % 3) * 0.25, z = -0.5 + Math.floor(index / 3) * 0.2, ring = [];
        for (let step = 0; step <= 8; step++) ring.push([x + Math.cos(step * 0.785) * 0.05, 0.03, z + Math.sin(step * 0.785) * 0.05]);
        builder.material([material.produceRed, material.clothBlue, material.gilded, material.produceGreen][index % 4], Math.floor(random() * 255)).addTube(ring, 0.008, 3);
      }
    });
  },
  roastedCorn(builder, random) {
    builder.material(material.darkMetal, 100).addBox(0.55, 0, -0.25, 1.05, 0.3, 0.25); // brazier
    builder.material(material.produceOrange, 220).addBox(0.6, 0.3, -0.2, 1.0, 0.31, 0.2); // embers
    for (let cob = 0; cob < 5; cob++) builder.material(material.produceYellow, 100).addTube([[0.62, 0.34, -0.18 + cob * 0.09], [0.98, 0.35, -0.16 + cob * 0.09]], 0.025, 5);
    nanglo(builder, 0.8, 0.6, 0.3); pile(builder, random, 0.8, 0.6, 0.22, 18, 0.025, [material.terracotta]);
  },
  sugarcane(builder, random) {
    for (let stick = 0; stick < 9; stick++) {
      const z = -0.4 + stick * 0.1;
      builder.material(stick % 2 ? material.produceGreen : material.produceYellow, 120).addTube([[0.6 + random() * 0.1, 0, z], [0.9 + random() * 0.15, 2.1, z + random.between(-0.1, 0.1)]], 0.02, 4);
    }
  },
  tea(builder) {
    builder.material(material.darkMetal, 100).addBox(0.55, 0, -0.2, 0.85, 0.25, 0.2); // stove
    builder.push().translate(0.7, 0.25, 0).addLathe([[0.1, 0], [0.12, 0.08], [0.08, 0.18], [0.03, 0.2]], 10).pop(); // kettle
    builder.withDetail(detailGroup.nearAndMiddle, () => {
      for (let glass = 0; glass < 5; glass++) builder.material(material.rice, 220).push().translate(1.0, 0, -0.3 + glass * 0.15).addLathe([[0.025, 0], [0.032, 0.09]], 6).pop();
    });
  },
  curios(builder, random) {
    builder.material(material.wood, 60).addBox(0.6, 0, -0.75, 0.66, 1.5, 0.75); // stand
    for (let panel = 0; panel < 3; panel++) builder.material(material.paintedSign, Math.floor(random() * 255)).addBox(0.67, 0.5, -0.65 + panel * 0.45, 0.69, 1.4, -0.3 + panel * 0.45); // thangkas
    cloth(builder, 0.4, 0.6, material.clothRed);
    for (let statue = 0; statue < 4; statue++) builder.material(material.bronze, 150).push().translate(0.95, 0, -0.45 + statue * 0.3).scale(0.08, 0.2, 0.08).addSphere(6, 4).pop();
  },
  snacks(builder, random) {
    nanglo(builder, 0.8, 0, 0.42);
    builder.withDetail(detailGroup.nearAndMiddle, () => {
      for (let piece = 0; piece < 12; piece++) {
        const angle = piece * 0.52, reach = 0.12 + (piece % 3) * 0.1;
        builder.material(piece % 3 ? material.terracotta : material.rice, Math.floor(random() * 255)).push().translate(0.8 + Math.cos(angle) * reach, 0.04, Math.sin(angle) * reach).addLathe([[0.05, 0], [0.05, 0.012], [0, 0.015]], 8).pop();
      }
    });
  },
  cloth(builder) {
    cloth(builder, 0.5, 0.7, material.straw);
    [material.clothRed, material.clothBlue, material.produceYellow, material.produceGreen, material.clothRed, material.rice].forEach((materialId, index) => {
      builder.material(materialId, 120 + index * 15).addBox(0.55 + (index % 2) * 0.45, 0.012, -0.6 + Math.floor(index / 2) * 0.42, 0.95 + (index % 2) * 0.45, 0.05 + (index % 3) * 0.04, -0.25 + Math.floor(index / 2) * 0.42);
    });
  },
  grainDrying(builder) {
    builder.material(material.straw, 110).occlusion(0.95).addBox(0.4, 0, -1.6, 2.6, 0.012, 1.6);
    builder.material(material.produceYellow, 160).addBox(0.55, 0.012, -1.45, 2.45, 0.03, 1.45);
  },
};

// Builds every stall's goods into `builder` (world space) and returns their collision blocks, as monuments do.
export function addVendorStalls(builder, quality) {
  const random = createRandom(vendorSeed), solids = [];
  for (const [x, z, facing, goods] of vendorSpots.slice(0, quality.vendorCount)) {
    builder.beginChunk().push().translate(x, 0, z).rotateY(facing);
    builder.withDetail(detailGroup.nearAndMiddle, () => goodsBuilders[goods](builder, random));
    builder.pop();
    const reach = goods === 'grainDrying' ? 1.5 : 0.75, centre = 0.4 + reach;
    solids.push({ x: x + Math.cos(facing) * centre, z: z + Math.sin(facing) * centre, y: 0, rotation: facing, alongFront: reach * 2, across: goods === 'grainDrying' ? 3.2 : 1.6, height: goodsBlockHeightMetres, shape: 'box', isSolid: true });
  }
  return solids;
}

// The sellers, sitting behind their goods.
export function createVendors(quality, addFigure) {
  const random = createRandom(vendorSeed + 1);
  for (const [x, z, facing, , outfit] of vendorSpots.slice(0, quality.vendorCount)) {
    const look = dress(outfit, random);
    const seller = addFigure({ kind: figureKind.person, x, z, facing, scale: random.between(1.5, 1.7), colors: look, accessories: look.accessories });
    seller.pose = pose.sit;
    seller.phase = random() * 10;
  }
}
