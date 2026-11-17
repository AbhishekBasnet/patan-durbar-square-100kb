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
  // the line of temples on the west side, all facing east toward the palace, north to south
  { name: 'bhimsenTemple', x: -6, z: -62, facingDegrees: 90, width: 9, depth: 12, height: 17 },
  { name: 'vishwanathTemple', x: -5, z: -46, facingDegrees: 90, width: 9, depth: 9, height: 15 },
  { name: 'krishnaMandir', x: -4, z: -30, facingDegrees: 90, width: 10.5, depth: 10.5, height: 20 },
  { name: 'charNarayanTemple', x: -5, z: -13, facingDegrees: 90, width: 10, depth: 10, height: 15.5 },
  { name: 'hariShankarTemple', x: -4, z: 3, facingDegrees: 90, width: 8.5, depth: 8.5, height: 16 },
  { name: 'octagonalKrishnaTemple', x: -1, z: 23, facingDegrees: 90, width: 8.5, depth: 8.5, height: 14 },

  // pillars and the bell in the open square between the temples and the palace
  { name: 'garudaPillar', x: 5.5, z: -30, facingDegrees: 270, width: 1.4, depth: 1.4, height: 3.6 },
  { name: 'kingYoganarendraPillar', x: 6, z: -8, facingDegrees: 90, width: 2.2, depth: 2.2, height: 11 },
  { name: 'talejuBell', x: 7, z: 10, facingDegrees: 90, width: 4.4, depth: 2.6, height: 5.2 },

  // the north end: the sunken water spout and the two Mani Mandap pavilions beside it
  { name: 'mangaHiti', x: 18, z: -72, facingDegrees: 270, width: 10, depth: 12, height: 0 },
  { name: 'maniMandapNorth', x: 6, z: -76, facingDegrees: 90, width: 6.5, depth: 4.5, height: 5.5 },
  { name: 'maniMandapSouth', x: 6, z: -68, facingDegrees: 90, width: 6.5, depth: 4.5, height: 5.5 },

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
  { x: 11, z: -24, yawDegrees: 290, pitchDegrees: 14 }, // 2 Krishna Mandir behind its Garuda pillar
  { x: 10, z: -80, yawDegrees: 175, pitchDegrees: 2 }, // 3 north end by Manga Hiti, looking down the square
  { x: -1, z: -6, yawDegrees: 95, pitchDegrees: 8 }, // 4 the palace front seen from the temple steps
  { x: 31, z: 18, yawDegrees: 330, pitchDegrees: 12 }, // 5 inside Sundari Chowk
  { x: 9, z: 16, yawDegrees: 305, pitchDegrees: -6 }, // 6 low over the paving toward Hari Shankar
];
