# Code review

One review round, as agreed with the user. A separate agent read only `source/`. Its verdict: "Well-structured and readable, with solid headers and a clean frame loop. It falls short mainly on the magic-number rule (WGSL and geometry files) and has a small amount of dead and duplicated code."

## Fixed after the review

| Finding | Severity | What changed |
|---|---|---|
| Dead code: `smoothStep`, `hash2D`, `valueNoise2D` in math.js (a JS copy of the WGSL noise) | major | Deleted; header updated. |
| Unnamed tuning values in the material shaders | major | Named constants for the noise octaves, wood grain and carving, stone streaks and lichen, gold tarnish and hammering, and plaster stains. |
| Unnamed numbers in `builder.material(id, variant)` calls | major | These are tint seeds (0–255) that keep neighbouring parts from matching, not tuning values. materials.js now says so. |
| Gravity written three ways (9.8, 9.81, 4.905) | minor | One `gravityMetresPerSecondSquared` in math.js, used by the camera, water.js and the stream shader. |
| Stride 0.75 duplicated in camera.js and water.js | minor | water.js uses the camera's `headBobStrideMetres`. |
| Exports nothing else imports | minor | Now private: lighting constants, quality presets, LOD distances, `levelsPerChunk`, `floatsPerWaterBody`, `maniMandap`, `krishnaMandirShikharaTiers`, `addTorana`, `carveRoofStrut`. |
| Short names | minor | `m`, `a`, `b`, `c`, `t` in meshBuilder.js, `a`, `b`, `s`, `s0`/`s1`/`t0`/`t1` in pagodaRoof.js, `xs`/`zs` in allMonuments.js, `p0`–`p3` in dev.js all renamed. |

## Left as they are

- **Remaining inline numbers in geometry builders, water.wgsl.js and soundscape.js:** the listed ones are local shape proportions (a bell's profile, a spout's reach). Naming each would make those files longer without making them clearer. This is a judgement call, kept for a later round if wanted.
- **Bare uniform offsets in main.js; renderer.js at 360 lines:** both work and are under the 400-line guideline. Splitting the GPU timing and the light-map bake into their own files is a reasonable next refactor.
- **Frame-loop allocations:** the reviewer confirmed the frame loop is clean. The only allocations are unavoidable WebGPU objects, plus the occasional sound when a bell rings.
