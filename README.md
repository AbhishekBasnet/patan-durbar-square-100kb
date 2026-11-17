# Patan Durbar Square, 1985

A walkable recreation of Patan Durbar Square (Lalitpur, Nepal) as it was on an ordinary afternoon in the mid-1980s. It runs in the browser. Everything is made from code: no images, models or sound files. The whole square is one HTML file.

> **Work in progress: step 1 of 7.** The monuments are plain blocks at their estimated positions and heights. Real architecture starts in step 2.

## Try it

Open `index.html` in Chrome or Edge (it needs WebGPU), wait for the loading bar to fill, then press **Enter the square**.

| Key | Action |
|---|---|
| `W` `A` `S` `D` | Walk |
| Mouse | Look around |
| `Shift` | Walk faster |
| `Space` | Small hop |
| `1`–`6` | Jump to a viewpoint |
| `Esc` | Menu (detail level, controls) |
| `H` | Performance stats |
| `V` / `M` | Film look / sound (coming in later steps) |

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

Hard limit: **150 KB** minified. Current size: **28.7 KB** minified, 11.9 KB gzipped.

The build shortens every JS and WGSL name, so the readable names in the source cost nothing in the output.

## Source files

| File | What it does |
|---|---|
| `source/build.mjs` | Bundles to `../index.html`, minifies JS, minifies and renames WGSL, reports sizes |
| `source/template.html` | Page shell: loading bar, start menu, controls help |
| `src/main.js` | Entry point: builds the square, runs the frame loop and the menu |
| `src/dev.js` | Dev build only: scripted walk-through (F) and benchmark (B) |
| `src/core/math.js` | Scalars, seeded random, value noise, matrices |
| `src/core/meshBuilder.js` | Geometry helpers (prisms for now) |
| `src/core/renderer.js` | WebGPU device, render targets, pipelines, frame drawing, GPU timing |
| `src/core/camera.js` | Walking camera: eye height, head bob, hop, collision with steps and walls |
| `src/core/input.js` | Keyboard, mouse and touch |
| `src/core/quality.js` | High / Medium / Low presets and the first-visit pick |
| `src/square/layout.js` | The map: every monument's position, facing and size, and the 6 viewpoints |
| `src/square/blocks.js` | The plain block (box, octagon, cylinder) and its GPU packing |
| `src/square/blockout.js` | Temporary: rough massing of each monument, replaced in steps 2–3 |
| `src/square/surroundings.js` | The houses around the square, with alleys |
| `src/look/lighting.js` | The golden-hour sun, sky and haze |
| `src/look/shaders/*.wgsl.js` | WGSL: shared uniforms, sky, blockout |

## Easy first tweaks

| What | Where |
|---|---|
| Sun angle | `sunAzimuthDegrees`, `sunElevationDegrees` in `src/look/lighting.js` |
| Sun colour | `goldenHourSunColor` in `src/look/lighting.js` |
| Walking speed | `walkingSpeedMetresPerSecond` in `src/core/camera.js` |
| Haze | `hazeDensityPerMetre` in `src/look/lighting.js` |

Crowd size, number of vendors and film look strength arrive in later steps.

## Status

| Step | State |
|---|---|
| 1. References, layout, walkable blockout | done |
| 2. Lighting, paving, architecture parts (one pagoda, Krishna Mandir) | |
| 3. All monuments, palace, houses | |
| 4. Detail levels, performance on Medium | |
| 5. Puddles, Manga Hiti water | |
| 6. People, vendors, animals, vehicles, sound | |
| 7. Film look, polish, verification | |

See [REFERENCES.md](REFERENCES.md) for what each monument is based on, and [LICENSE](LICENSE). This project adapts parts of [Abyssal Garden](https://github.com/Noniv/abyssal-garden).
