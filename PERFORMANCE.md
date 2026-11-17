# Performance

Measured on the target hardware: **Intel Iris Xe (12th gen Core, WebGPU reports `intel gen-12lp`)**, Chrome headless with WebGPU on Vulkan, 1920x1080. These are real measurements, not estimates.

Method: `npm run build:dev`, open `dev.html`, enter the square, press **B**. The camera walks the scripted 60 s path through the whole square at full preset resolution. Every frame time and GPU timestamp is logged, and the result shows average, 99th percentile and worst.

## Step 4 (no people, water or film look yet)

At the display's 60 Hz:

| Preset | Resolution | Frame avg / p99 / worst | GPU avg / p99 / worst |
|---|---|---|---|
| High | 1920x1080, 4x MSAA | 16.67 / 16.80 / 16.80 ms | 10.37 / 12.81 / 13.76 ms |
| **Medium (target)** | 1920x1080, 4x MSAA | **16.67 / 16.80 / 16.80 ms** | **10.45 / 12.86 / 14.29 ms** |
| Low | 1280x720, no MSAA | 16.67 / 16.80 / 16.80 ms | 9.17 / 12.06 / 12.72 ms |

All three hold a steady 60 fps. No frame went over 16.8 ms, and the target allows up to 25 ms.

The GPU times look the same on every preset because the Intel GPU **lowers its clock** when the work fits easily into a 60 Hz frame. The timestamps then stretch to fill the frame. To see the real cost, the same walk-through was run with Chrome's frame-rate cap off (`--disable-gpu-vsync --disable-frame-rate-limit`), so the GPU runs at full clock:

| Preset | Frames per second (uncapped) | GPU avg / p99 / worst |
|---|---|---|
| **Medium** | **124 fps** (8.07 ms average frame) | **7.81 / 13.01 / 13.27 ms** |
| High | 121 fps (8.26 ms) | 8.02 / 14.35 / 16.50 ms |

At full clock, Medium uses about 8 ms of the 14 ms budget. That leaves about 6 ms for puddles, people and the film look in steps 5–7. Frame-time p99 in the uncapped runs is not meaningful: without vsync, headless Chrome stalls now and then.

## What made it fit

- **Distance levels of detail (`core/lod.js`):** every monument and house is a chunk. Near detail (carved strut figures, bells, rafters) is dropped first. Frames, statues and shutters follow further away. A plain strut board stands in for the carved one. Chunks cross-fade with a 4x4 dither over 5 m.
- **Culling:** chunks outside the view are skipped. Visible ones are drawn nearest first, so the depth test rejects hidden pixels early.
- **No `discard` in the main pipeline:** on this Intel driver, a shader that can discard loses early depth testing even when it never discards. That cost 15–25 fps. Only chunks in the middle of a cross-fade use the dithering pipeline.
- **Shadows and sky occlusion are drawn once at load:** the sun never moves.
- **Per-preset filtering:** 3x3 shadow taps on High, 2x2 on Medium, 1 on Low. Sky-occlusion taps go 4, 3, 2.
- **Automatic resolution scaling (`core/quality.js`):** if the GPU goes over 14 ms, the render resolution drops in steps of 8% per side, down to 70%. If that is still too slow for 5 seconds, the next visit starts one preset lower.

## Step 5 (the showcase puddle, Manga Hiti's knee-deep pool, Medium upgraded)

At your request, the scattered street puddles were replaced by one big puddle in front of Krishna Mandir and knee-deep water in Manga Hiti. The GPU time freed went to the temples on Medium:
- High's 3x3 soft shadows, instead of 2x2
- full four-tap sky light under the eaves
- carved detail kept on out to 32 m, instead of 24 m

| Preset | Frame avg / p99 / worst at 60 Hz | GPU avg / p99 / worst at 60 Hz |
|---|---|---|
| **Medium** | **16.67 / 16.80 / 16.80 ms** | **10.52 / 12.72 / 13.68 ms** |

Steady 60 fps. An earlier run of the same build had one hiccup (p99 33 ms, worst 67 ms) with normal GPU times: a stall outside the GPU in headless Chrome that the rerun did not show. Uncapped, Medium averages 118 fps (8.49 ms frame, 8.41 ms GPU).

Reflections: the scene is drawn mirrored in the surface of the nearest water in view, at far detail, into a texture a third of the render size per side. The pass is skipped when no water is in view. On Low, water mirrors the sky and a tint of the buildings.
