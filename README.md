# Patan Durbar Square, 1985

A walkable recreation of Patan Durbar Square (Lalitpur, Nepal) as it was on an ordinary afternoon in the mid-1980s. It runs in the browser. Everything is made from code: no images, models or sound files. The whole square is one HTML file.

> **Work in progress: step 6 of 7.** The square is kept quiet and empty: no people, animals or vehicles, by choice. Every monument, the palace and the houses are built, with detail levels by distance. One big puddle from a passing shower mirrors Krishna Mandir, and Manga Hiti's spouts pour into knee-deep water you can wade into. It holds a steady 60 fps on Medium on Intel Iris Xe (see [PERFORMANCE.md](PERFORMANCE.md)). Next: street life.

## Try it

Open `index.html` in Chrome or Edge (it needs WebGPU), wait for the loading bar to fill, then press **Enter the square**.

| Key | Action |
|---|---|
| `W` `A` `S` `D` | Walk |
| Mouse | Look around |
| `Shift` | Walk 30% faster |
| `Space` | Small hop |
| `1`–`6` | Jump to a viewpoint |
| `Esc` | Menu (detail level, controls) |
| `H` | Performance stats |
| `V` | Film look on / off |
| `M` | Sound on / off |

On a touchscreen, hold one finger down to walk and slide it to look around. A second finger walks faster.

## Building

You need Node.js 18 or newer:

```bash
cd source
npm install
npm run build          # ../index.html, minified, with a size report
npm run build:readable # ../index.html, unminified, for debugging
npm run build:dev      # ../dev.html, with F (scripted walk-through) and B (benchmark)
```

## Size budget

Hard limit: **150 KB** minified. Current size: **89.3 KB** minified, 33.6 KB gzipped.

The build shortens every JS and WGSL name, so the readable names in the source cost nothing in the output.

## Source files

| File | What it does |
|---|---|
| `source/build.mjs` | Bundles to `../index.html`, minifies JS, minifies and renames WGSL, reports sizes |
| `source/template.html` | Page shell: loading bar, start menu, controls help |
| `src/main.js` | Entry point: builds the square, runs the frame loop and the menu |
| `src/dev.js` | Dev build only: scripted walk-through (F) and benchmark (B) |
| `src/core/math.js` | Scalars, seeded random, value noise, matrices |
| `src/core/meshBuilder.js` | Geometry helpers: transform stack, boxes, prisms, lathes, tubes, vertex packing |
| `src/core/renderer.js` | WebGPU device, render targets, pipelines, frame drawing, GPU timing |
| `src/core/camera.js` | Walking camera: eye height, head bob, hop, collision with steps and walls |
| `src/core/input.js` | Keyboard, mouse and touch |
| `src/core/quality.js` | High / Medium / Low presets, the first-visit pick, automatic resolution scaling |
| `src/core/lod.js` | Distance levels of detail per chunk, view culling, dithered cross-fades |
| `src/architecture/plinths.js` | Stepped plinths with front stairs, and guardians placed beside them |
| `src/architecture/statues.js` | Lions, elephants, Garuda, King Yoganarendra under the cobra hood, makara spouts |
| `src/architecture/newarBuilding.js` | An ordinary Newar building: the palace wings |
| `src/architecture/mudHouse.js` | An old mud house: red clay and limewash, pidhi, aangan, tulsi pedestal |
| `src/architecture/brickWall.js` | Brick cores with glazed base bands and stepped cornices |
| `src/architecture/doorways.js` | Carved nested door frames, closed doors, toranas |
| `src/architecture/windows.js` | Latticed windows and window rows |
| `src/architecture/roofStruts.js` | Carved roof struts with deity figures |
| `src/architecture/pagodaRoof.js` | Tiered tile roofs, gilded finial, eave bells, the pataka banner |
| `src/architecture/pagodaTemple.js` | Assembles a whole pagoda temple from a table of numbers |
| `src/architecture/shikhara.js` | Stone shikhara towers, pillars, colonnades, kiosks |
| `src/monuments/*.js` | One file per monument, mostly numbers: Bhimsen, Vishwanath, Krishna Mandir, Char Narayan, Hari Shankar, the octagonal Krishna temple, the Garuda and King Yoganarendra pillars, the Taleju bell, Manga Hiti with the Mani Mandaps, the royal palace (three chowks, the golden gate, Tusha Hiti), Degutale and the Taleju tower |
| `src/monuments/allMonuments.js` | Places every monument from the layout, collects its collision and its sunken pits |
| `src/square/paving.js` | The ground, with the pits cut out |
| `src/square/water.js` | The puddle and Manga Hiti's pool and streams; the ripple event pool fed by the streams and footsteps |
| `src/square/layout.js` | The map: every monument's position, facing and size, and the 6 viewpoints |
| `src/square/blocks.js` | Solid blocks for collision, placed relative to a monument |
| `src/square/surroundings.js` | Two rows of mud houses beyond the square's invisible wall |
| `src/look/lighting.js` | The golden-hour sun, sky and haze; the shadow and sky occlusion map matrices |
| `src/look/materials.js` | Named materials: colour, roughness, metalness, weathering |
| `src/look/shaders/frameUniforms.wgsl.js` | Per-frame uniforms, haze, tone mapping |
| `src/look/shaders/lighting.wgsl.js` | Sun shadows, sky occlusion under eaves, bounce light, highlights |
| `src/look/shaders/brick, wood, stone, gold, tile .wgsl.js` | One file per material look |
| `src/look/shaders/architecture.wgsl.js` | Picks the material per vertex and lights it |
| `src/look/shaders/water.wgsl.js` | The puddle and Manga Hiti's water: outlines, Fresnel reflections, steady rings where the streams land, foam, footstep ripples, wind, the spout streams |
| `src/look/shaders/postProcess.wgsl.js` | The film look: warm faded 1980s colour, grain, vignette (V) |
| `src/look/shaders/sky.wgsl.js`, `noise.wgsl.js` | Sky, shared noise |
| `src/audio/ambientSounds.js` | Synthesized wind, bells and running water |
| `src/audio/soundscape.js` | The mix: gusts, eave bells heard only near their temple, temple and Taleju bells, Manga Hiti's water placed in space |

## Easy first tweaks

| What | Where |
|---|---|
| Sun angle | `sunAzimuthDegrees`, `sunElevationDegrees` in `src/look/lighting.js` |
| Sun colour | `goldenHourSunColor` in `src/look/lighting.js` |
| Walking speed | `walkingSpeedMetresPerSecond` in `src/core/camera.js` |
| Haze | `hazeDensityPerMetre` in `src/look/lighting.js` |
| Wind on the water | `windGustStrength` in `src/square/water.js` (0 for still water) |
| Detail switching distances | `lodSwitchDistances` in `src/core/lod.js` |
| Move or turn a monument | its row (`x`, `z`, `facingDegrees`) in `src/square/layout.js` |

| Film look strength | `filmLookStrength` in `src/look/shaders/postProcess.wgsl.js` (0 none, 1 full) |

## Status

| Step | State |
|---|---|
| 1. References, layout, walkable blockout | done |
| 2. Lighting, paving, architecture parts (one pagoda, Krishna Mandir) | done |
| 3. All monuments, palace, houses | done |
| 4. Detail levels, performance on Medium | done |
| 5. Water: one showcase puddle, knee-deep water at Manga Hiti | done |
| 6. Street life: left out by choice (no people, animals, vehicles or sound) | done |
| 7. Film look, polish, verification | |

See [REFERENCES.md](REFERENCES.md) for what each monument is based on, and [LICENSE](LICENSE). This project adapts parts of [Abyssal Garden](https://github.com/Noniv/abyssal-garden).
