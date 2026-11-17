// Named materials of the square: their ids (stored in every vertex) and their look (colour, roughness,
// metalness, weathering). architecture.wgsl.js turns the table into WGSL constants.
// Depends on nothing.

// Material ids: the order matches the rows of materialTable below.
export const material = {
  brick: 0, // red brick walls, mortar lines drawn by brick.wgsl.js
  glazedBrick: 1, // dark glazed "dachi apa" bricks in cornices and bands
  wood: 2, // weathered dark sal wood: struts, windows, doors, eave boards
  stone: 3, // grey stone: shikhara towers, plinths, statues, steps
  gilded: 4, // gilded copper: finials, banners, the king's statue
  roofTile: 5, // clay tiles with moss and grass
  plaster: 6, // whitewashed plaster, patched and faded
  paving: 7, // the square's brick paving
  darkRecess: 8, // the dark inside of doorways and window openings
  bronze: 9, // bells and old brass, darker than gilding
  redCloth: 10, // faded red and ochre paint, offering cloth
  carvedStone: 11, // statues and carved stone: like stone, without the block joints
  clothRed: 12, // cloth, mats and goods
  clothBlue: 13,
  produceGreen: 14,
  produceRed: 15,
  produceOrange: 16, // oranges, marigolds
  produceYellow: 17, // corn, lentils, turmeric
  terracotta: 18, // clay pots
  straw: 19, // straw mats, bamboo trays and baskets
  rice: 20,
  paintedSign: 21, // hand-painted signboards with Devanagari lettering (drawn by the shader)
  darkMetal: 22, // sewing machines, kettles, braziers
};

// Each row: base colour (linear red, green, blue), roughness, metalness, weathering (dirt, moss and wear).
export const materialTable = [
  [0.40, 0.13, 0.075, 0.85, 0, 0.6], // brick
  [0.055, 0.045, 0.04, 0.35, 0, 0.3], // glazed brick
  [0.12, 0.072, 0.042, 0.75, 0, 0.7], // wood: dark sal, warm where the sun catches it
  [0.22, 0.2, 0.17, 0.85, 0, 0.8], // stone: weathered grey sandstone
  [0.95, 0.62, 0.22, 0.32, 1, 0.35], // gilded copper
  [0.21, 0.11, 0.07, 0.9, 0, 1.0], // roof tile
  [0.62, 0.56, 0.46, 0.9, 0, 0.7], // plaster
  [0.33, 0.16, 0.085, 0.92, 0, 0.8], // paving
  [0.012, 0.009, 0.007, 1.0, 0, 0], // dark recess
  [0.45, 0.30, 0.13, 0.45, 1, 0.6], // bronze
  [0.45, 0.10, 0.05, 0.9, 0, 0.5], // red cloth and paint
  [0.2, 0.185, 0.16, 0.8, 0, 0.9], // carved stone
  [0.5, 0.1, 0.07, 0.9, 0, 0.4], // red cloth
  [0.12, 0.2, 0.4, 0.9, 0, 0.4], // blue cloth
  [0.14, 0.3, 0.06, 0.6, 0, 0.2], // greens
  [0.55, 0.08, 0.05, 0.5, 0, 0.2], // tomatoes, chillies
  [0.8, 0.35, 0.05, 0.5, 0, 0.1], // oranges, marigolds
  [0.75, 0.6, 0.15, 0.7, 0, 0.2], // corn, lentils
  [0.45, 0.2, 0.1, 0.85, 0, 0.5], // terracotta
  [0.5, 0.4, 0.2, 0.9, 0, 0.5], // straw and bamboo
  [0.75, 0.72, 0.62, 0.9, 0, 0.2], // rice
  [0.15, 0.25, 0.42, 0.8, 0, 0.7], // painted signboard
  [0.05, 0.05, 0.055, 0.5, 0.6, 0.5], // dark metal
];
