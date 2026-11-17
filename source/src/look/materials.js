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
  redClay: 12, // the red clay (rato mato) plastered on the lower walls and pidhi of mud houses
  earth: 13, // the swept earth of a house's aangan
  greenery: 14, // the tulsi plant on its pedestal
};

// Each row: base colour (linear red, green, blue), roughness, metalness, weathering (dirt, moss and wear).
export const materialTable = [
  [0.40, 0.13, 0.075, 0.85, 0, 0.6], // brick
  [0.055, 0.045, 0.04, 0.35, 0, 0.3], // glazed brick
  [0.12, 0.072, 0.042, 0.75, 0, 0.7], // wood: dark sal, warm where the sun catches it
  [0.185, 0.168, 0.143, 0.85, 0, 0.8], // stone: weathered grey sandstone, darker than it looks in full sun
  [0.95, 0.62, 0.22, 0.32, 1, 0.35], // gilded copper
  [0.21, 0.11, 0.07, 0.9, 0, 1.0], // roof tile
  [0.62, 0.56, 0.46, 0.9, 0, 0.7], // plaster
  [0.33, 0.16, 0.085, 0.92, 0, 0.8], // paving
  [0.012, 0.009, 0.007, 1.0, 0, 0], // dark recess
  [0.45, 0.30, 0.13, 0.45, 1, 0.6], // bronze
  [0.45, 0.10, 0.05, 0.9, 0, 0.5], // red cloth and paint
  [0.17, 0.157, 0.136, 0.8, 0, 0.9], // carved stone
  [0.42, 0.15, 0.085, 0.95, 0, 0.7], // red clay
  [0.34, 0.23, 0.14, 0.95, 0, 0.6], // swept earth
  [0.12, 0.24, 0.07, 0.8, 0, 0.3], // tulsi leaves
];
