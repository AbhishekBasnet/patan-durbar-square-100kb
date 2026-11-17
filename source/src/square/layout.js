// The single map of Patan Durbar Square: where every monument stands, which way it faces and how big it is,
// plus the six fixed viewpoints. Every other file places things by reading this table. Depends on nothing.
//
// Coordinates are metres. x runs east, z runs south (north is -z), y is up; the origin is the middle of the
// open square, in front of the Char Narayan temple. Positions and sizes are estimated from period photos,
// tourist maps and modern satellite views (see REFERENCES.md); no measured plan was available.
//
// facingDegrees: compass direction of the main entrance (0 north, 90 east, 180 south, 270 west).
// width: size across the entrance front. depth: size from front to back. height: ground to finial tip.

export const monumentLayout = [
  // the temples on the west side, all facing roughly east toward the palace, north to south. They are not on
  // one ruler line: each was built by a different king over two centuries, so they stand forward and back,
  // at uneven gaps, turned a few degrees off one another.
  { name: 'bhimsenTemple', x: -7, z: -63.5, facingDegrees: 88, width: 9, depth: 12, height: 17 },
  { name: 'vishwanathTemple', x: -4.2, z: -47, facingDegrees: 93, width: 9, depth: 9, height: 15 },
  { name: 'krishnaMandir', x: -2.2, z: -31.5, facingDegrees: 90, width: 10.5, depth: 10.5, height: 20 },
  { name: 'charNarayanTemple', x: -6.3, z: -14.5, facingDegrees: 87, width: 10, depth: 10, height: 15.5 },
  { name: 'hariShankarTemple', x: -3.4, z: 1.5, facingDegrees: 92, width: 8.5, depth: 8.5, height: 16 },
  { name: 'octagonalKrishnaTemple', x: 0.8, z: 21.5, facingDegrees: 84, width: 8.5, depth: 8.5, height: 14 },

  // pillars and the bell in the open square between the temples and the palace
  { name: 'garudaPillar', x: 6.2, z: -30.8, facingDegrees: 268, width: 1.4, depth: 1.4, height: 3.6 },
  { name: 'kingYoganarendraPillar', x: 7.6, z: -6.5, facingDegrees: 94, width: 2.2, depth: 2.2, height: 11 },
  { name: 'talejuBell', x: 6.4, z: 9.5, facingDegrees: 80, width: 4.4, depth: 2.6, height: 5.2 },

  // the north end: the sunken water spout and the two Mani Mandap pavilions beside it
  { name: 'mangaHiti', x: 18, z: -72, facingDegrees: 270, width: 10, depth: 12, height: 0 },
  { name: 'maniMandapNorth', x: 5.2, z: -76.5, facingDegrees: 90, width: 6.5, depth: 4.5, height: 5.5 },
  { name: 'maniMandapSouth', x: 6.4, z: -68.8, facingDegrees: 90, width: 6.5, depth: 4.5, height: 5.5 },

  // the royal palace along the east side; its west front runs along x = 16
  { name: 'keshavNarayanChowk', x: 31, z: -47, facingDegrees: 270, width: 30, depth: 30, height: 12 },
  { name: 'mulChowk', x: 31, z: -18, facingDegrees: 270, width: 24, depth: 30, height: 12 },
  { name: 'sundariChowk', x: 31, z: 11, facingDegrees: 270, width: 30, depth: 30, height: 11 },
  { name: 'degutaleTemple', x: 26, z: -32, facingDegrees: 270, width: 8, depth: 8, height: 30 },
  { name: 'talejuOctagonalTower', x: 19.5, z: -28, facingDegrees: 270, width: 6, depth: 6, height: 25 },
];

// Outline of the walkable area: the house fronts around the square. Used by surroundings.js to line the
// edges with houses and by camera.js as the last line of collision.
export const squareBounds = { west: -15, east: 48, north: -84, south: 38 };

// Viewpoints for keys 1-6: where you stand (feet on the ground) and where you look.
// yawDegrees: compass direction of the view; pitchDegrees: up is positive.
export const viewpoints = [
  { x: 9, z: 36, yawDegrees: 345, pitchDegrees: 5 }, // 1 south end: the line of temples running north
  { x: 12, z: -23, yawDegrees: 292, pitchDegrees: 13 }, // 2 Krishna Mandir behind its Garuda pillar
  { x: 10, z: -80, yawDegrees: 175, pitchDegrees: 2 }, // 3 north end by Manga Hiti, looking down the square
  { x: -1, z: -6, yawDegrees: 95, pitchDegrees: 8 }, // 4 the palace front seen from the temple steps
  { x: 31, z: 18, yawDegrees: 330, pitchDegrees: 12 }, // 5 inside Sundari Chowk
  { x: 9, z: 16, yawDegrees: 305, pitchDegrees: -6 }, // 6 low over the paving toward Hari Shankar
];
