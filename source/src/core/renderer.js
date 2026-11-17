// The WebGPU renderer: opens the device, sizes the canvas within the preset's pixel budget, builds the sky,
// architecture and water pipelines, draws the scene mirrored in the nearest water, draws the sun shadow map and sky occlusion map once at load, and draws
// one frame per call. Optional GPU timestamps measure the frame for the H stats and the benchmark.
// Depends on meshBuilder.js (vertex layout) and the WGSL in look/shaders/.

import { bytesPerVertex } from './meshBuilder.js';
import { skyWgsl } from '../look/shaders/sky.wgsl.js';
import { architectureWgsl } from '../look/shaders/architecture.wgsl.js';
import { waterWgsl, rippleEventCapacity, waveSourceCapacity } from '../look/shaders/water.wgsl.js';

export const frameUniformFloatCount = 100; // matches FrameUniforms in frameUniforms.wgsl.js
export const sunShadowMatrixOffset = 64;
export const skyOcclusionMatrixOffset = 80;
export const mirrorPlaneOffset = 96;
const depthFormat = 'depth32float';
const timestampReadbackBufferCount = 4;
const lightMapDepthBias = 2;
const lightMapSlopeBias = 2.5;

export async function openGpu() {
  if (!navigator.gpu) throw new Error('This scene needs WebGPU. Try a current Chrome or Edge.', { cause: 'shown as is' });
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('No WebGPU adapter found.', { cause: 'shown as is' });
  const canMeasureGpuTime = adapter.features.has('timestamp-query');
  const device = await adapter.requestDevice({ requiredFeatures: canMeasureGpuTime ? ['timestamp-query'] : [] });
  device.addEventListener('uncapturederror', (event) => console.error('GPU: ' + event.error.message));
  return { adapter, device, canMeasureGpuTime };
}

// detailSelector (lod.js) says which chunks and levels to draw each frame, and with what cross-fade;
// reflectionSelector does the same for the mirrored scene. waterField (square/water.js) holds the water.
export function createRenderer({ device, canMeasureGpuTime, canvas, quality, architectureVertexData, lightMapMatrices, detailSelector, reflectionSelector, waterField }) {
  const context = canvas.getContext('webgpu');
  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  const sampleCount = quality.antialiasingSamples;
  const attribute = (shaderLocation, offset, format) => ({ shaderLocation, offset, format });

  const createBufferWithData = (data, usage) => {
    const buffer = device.createBuffer({ size: Math.max(16, (data.byteLength + 3) & ~3), usage: usage | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(buffer, 0, data);
    return buffer;
  };
  const createUniformBuffer = () => device.createBuffer({ size: frameUniformFloatCount * 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  // ---- light maps: the sun's shadow map and the top-down height map for sky occlusion
  const createDepthMap = (size) => device.createTexture({ size: [size, size], format: depthFormat, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
  const sunShadowMap = createDepthMap(quality.shadowMapSize);
  const skyOcclusionMap = createDepthMap(quality.skyOcclusionMapSize);
  const comparisonSampler = device.createSampler({ compare: 'less-equal', magFilter: 'linear', minFilter: 'linear' });

  // ---- bind group 0: the frame uniforms and the light maps (scene passes), or the uniforms alone (map passes)
  const allStages = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT;
  const sceneBindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: allStages, buffer: {} },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'depth' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'comparison' } },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'depth' } },
      { binding: 4, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
    ],
  });
  const uniformsOnlyBindGroupLayout = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: allStages, buffer: {} }] });
  const createFadeBuffer = () => device.createBuffer({ size: Math.max(16, detailSelector.fades.byteLength), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
  const createSceneBindGroup = (uniforms, fades) => device.createBindGroup({
    layout: sceneBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: uniforms } },
      { binding: 1, resource: sunShadowMap.createView() },
      { binding: 2, resource: comparisonSampler },
      { binding: 3, resource: skyOcclusionMap.createView() },
      { binding: 4, resource: { buffer: fades } },
    ],
  });
  // the camera's view, and the mirrored view drawn into the water reflection
  const uniformBuffer = createUniformBuffer(), lodFadeBuffer = createFadeBuffer();
  const reflectionUniformBuffer = createUniformBuffer(), reflectionFadeBuffer = createFadeBuffer();
  const sceneBindGroup = createSceneBindGroup(uniformBuffer, lodFadeBuffer);
  const reflectionBindGroup = createSceneBindGroup(reflectionUniformBuffer, reflectionFadeBuffer);
  const scenePipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [sceneBindGroupLayout] });
  // water: ripple events, the reflection image and its sampler
  const waterBindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: {} },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
    ],
  });
  const waterPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [sceneBindGroupLayout, waterBindGroupLayout] });
  const lightMapPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [uniformsOnlyBindGroupLayout] });

  // ---- pipelines
  const modules = {};
  const shaderModule = (code) => (modules[code] ??= device.createShaderModule({ code }));
  // options: samples (1 for the reflection), layout, blend (water is drawn over the scene, premultiplied)
  const createScenePipeline = (code, vertexEntry, fragmentEntry, buffers, depthStencil, cullMode = 'back', constants = {}, { samples = sampleCount, layout = scenePipelineLayout, blend } = {}) => device.createRenderPipeline({
    layout,
    vertex: { module: shaderModule(code), entryPoint: vertexEntry, buffers },
    fragment: { module: shaderModule(code), entryPoint: fragmentEntry, targets: [{ format: canvasFormat, blend }], constants },
    primitive: { topology: 'triangle-list', cullMode },
    depthStencil: { format: depthFormat, ...depthStencil },
    multisample: { count: samples },
  });
  // light maps use ordinary depth (nearer is smaller); the scene uses reverse-Z (nearer is greater)
  const createLightMapPipeline = (code, vertexEntry, buffers) => device.createRenderPipeline({
    layout: lightMapPipelineLayout,
    vertex: { module: shaderModule(code), entryPoint: vertexEntry, buffers },
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil: { format: depthFormat, depthWriteEnabled: true, depthCompare: 'less', depthBias: lightMapDepthBias, depthBiasSlopeScale: lightMapSlopeBias },
  });
  const sceneDepth = { depthWriteEnabled: true, depthCompare: 'greater' };

  // the sky sits at the far plane (depth 0) and only fills pixels nothing else has drawn
  const skyPipeline = createScenePipeline(skyWgsl, 'skyVertex', 'skyFragment', [], { depthWriteEnabled: false, depthCompare: 'equal' }, 'none');

  const architectureBuffers = [{
    arrayStride: bytesPerVertex,
    attributes: [attribute(0, 0, 'float32x3'), attribute(1, 12, 'snorm8x4'), attribute(2, 16, 'uint8x4')],
  }];
  const architectureConstants = { shadowTapsPerAxis: quality.shadowTapsPerAxis, skyOcclusionTapCount: quality.skyOcclusionTapCount };
  const architecturePipeline = createScenePipeline(architectureWgsl, 'architectureVertex', 'architectureFragment', architectureBuffers, sceneDepth, 'back', architectureConstants);
  const crossFadingArchitecturePipeline = createScenePipeline(architectureWgsl, 'architectureVertex', 'architectureFragment', architectureBuffers, sceneDepth, 'back', { ...architectureConstants, isCrossFading: 1 });
  // the mirror image flips every triangle's winding, so the reflection culls front faces instead
  const hasReflection = quality.reflectionScale > 0;
  const reflectionArchitecturePipeline = hasReflection && createScenePipeline(architectureWgsl, 'architectureVertex', 'architectureFragment', architectureBuffers, sceneDepth, 'front', { ...architectureConstants, isMirrored: 1 }, { samples: 1 });
  const reflectionSkyPipeline = hasReflection && createScenePipeline(skyWgsl, 'skyVertex', 'skyFragment', [], { depthWriteEnabled: false, depthCompare: 'equal' }, 'none', {}, { samples: 1 });

  const premultipliedBlend = { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' } };
  const waterDepth = { depthWriteEnabled: false, depthCompare: 'greater' };
  const waterOptions = { layout: waterPipelineLayout, blend: premultipliedBlend };
  const waterBodyPipeline = createScenePipeline(waterWgsl, 'waterBodyVertex', 'waterBodyFragment', [{
    arrayStride: 48, stepMode: 'instance', attributes: [attribute(0, 0, 'float32x4'), attribute(1, 16, 'float32x4'), attribute(2, 32, 'float32x4')],
  }], waterDepth, 'none', { hasPlanarReflection: hasReflection ? 1 : 0, shadowTapsPerAxis: 1 }, waterOptions);
  const streamPipeline = createScenePipeline(waterWgsl, 'streamVertex', 'streamFragment', [{
    arrayStride: 32, stepMode: 'instance', attributes: [attribute(0, 0, 'float32x4'), attribute(1, 16, 'float32x4')],
  }], waterDepth, 'none', {}, waterOptions);
  const streamVertexCount = 12 * 6; // streamSegmentCount in water.wgsl.js, six corners per segment
  const waterBodyBuffer = createBufferWithData(waterField.bodyInstances, GPUBufferUsage.VERTEX);
  const streamBuffer = createBufferWithData(waterField.streamInstances, GPUBufferUsage.VERTEX);
  const waterUniforms = new Float32Array((rippleEventCapacity + waveSourceCapacity + 1) * 4);
  const waterSettingsOffset = (rippleEventCapacity + waveSourceCapacity) * 4;
  waterUniforms.set(waterField.waveSources, rippleEventCapacity * 4);
  const waterUniformBuffer = device.createBuffer({ size: waterUniforms.byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const reflectionSampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
  let waterBindGroup; // rebuilt with the reflection image on resize

  const architectureLightMapPipeline = createLightMapPipeline(architectureWgsl, 'architectureDepthVertex', [{
    arrayStride: bytesPerVertex, attributes: [attribute(0, 0, 'float32x3')],
  }]);

  // ---- geometry
  const architectureBuffer = createBufferWithData(architectureVertexData, GPUBufferUsage.VERTEX);
  const architectureVertexCount = architectureVertexData.byteLength / bytesPerVertex;

  // light maps: everything at once
  const drawAllArchitecture = (pass) => {
    pass.setVertexBuffer(0, architectureBuffer);
    pass.draw(architectureVertexCount);
  };
  // the scene: only the chunks and levels lod.js picked, nearest first; cross-fading ones with their own pipeline
  const drawList = (pass, list, count) => {
    for (let draw = 0; draw < count; draw++) pass.draw(list[draw * 3 + 1], 1, list[draw * 3], list[draw * 3 + 2]);
  };
  const drawVisibleArchitecture = (pass) => {
    pass.setVertexBuffer(0, architectureBuffer);
    pass.setPipeline(architecturePipeline);
    drawList(pass, detailSelector.solidDraws, detailSelector.solidDrawCount);
    pass.setPipeline(crossFadingArchitecturePipeline);
    drawList(pass, detailSelector.fadingDraws, detailSelector.fadingDrawCount);
  };
  const drawWater = (pass) => {
    pass.setBindGroup(1, waterBindGroup);
    pass.setPipeline(waterBodyPipeline);
    pass.setVertexBuffer(0, waterBodyBuffer);
    pass.draw(6, waterField.bodyCount);
    pass.setPipeline(streamPipeline);
    pass.setVertexBuffer(0, streamBuffer);
    pass.draw(streamVertexCount, waterField.streamCount);
  };

  // ---- draw both light maps once: the sun and the scene never move
  const drawLightMap = (texture, matrix) => {
    const mapUniforms = createUniformBuffer();
    const uniforms = new Float32Array(frameUniformFloatCount);
    uniforms.set(matrix, 0);
    device.queue.writeBuffer(mapUniforms, 0, uniforms);
    const bindGroup = device.createBindGroup({ layout: uniformsOnlyBindGroupLayout, entries: [{ binding: 0, resource: { buffer: mapUniforms } }] });
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [],
      depthStencilAttachment: { view: texture.createView(), depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'store' },
    });
    pass.setBindGroup(0, bindGroup);
    pass.setPipeline(architectureLightMapPipeline);
    drawAllArchitecture(pass);
    pass.end();
    device.queue.submit([encoder.finish()]);
  };
  drawLightMap(sunShadowMap, lightMapMatrices.sunShadowMatrix);
  drawLightMap(skyOcclusionMap, lightMapMatrices.skyOcclusionMatrix);

  // ---- GPU timing: two timestamps around the scene pass, read back through a small ring of buffers
  // renderScale: share of the preset's pixel budget, per side (lowered by quality.js when the GPU falls behind)
  const renderer = { gpuMilliseconds: 0, measureGpuTime: false, width: 0, height: 0, renderScale: 1 };
  let timestampQuerySet, timestampResolveBuffer;
  const timestampReadbacks = [];
  if (canMeasureGpuTime) {
    timestampQuerySet = device.createQuerySet({ type: 'timestamp', count: 2 });
    timestampResolveBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC });
    for (let index = 0; index < timestampReadbackBufferCount; index++) {
      const readback = { buffer: device.createBuffer({ size: 16, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST }), isBusy: false };
      readback.onMapped = () => {
        const times = new BigInt64Array(readback.buffer.getMappedRange());
        renderer.gpuMilliseconds = Number(times[1] - times[0]) / 1e6;
        readback.buffer.unmap();
        readback.isBusy = false;
      };
      readback.onFailed = () => { readback.isBusy = false; };
      timestampReadbacks.push(readback);
    }
  }

  // ---- render targets, rebuilt when the window size changes
  let multisampleTexture, depthTexture, reflectionTexture, reflectionDepthTexture;
  const reflectionColorAttachment = { view: null, loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] };
  const reflectionDepthAttachment = { view: null, depthClearValue: 0, depthLoadOp: 'clear', depthStoreOp: 'discard' };
  const reflectionPass = { colorAttachments: [reflectionColorAttachment], depthStencilAttachment: reflectionDepthAttachment };
  const colorAttachment = { view: null, resolveTarget: undefined, loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] };
  const depthAttachment = { view: null, depthClearValue: 0, depthLoadOp: 'clear', depthStoreOp: 'discard' };
  const scenePass = { colorAttachments: [colorAttachment], depthStencilAttachment: depthAttachment };
  const timedScenePass = canMeasureGpuTime
    ? { ...scenePass, timestampWrites: { querySet: timestampQuerySet, beginningOfPassWriteIndex: 0, endOfPassWriteIndex: 1 } }
    : scenePass;

  renderer.resize = () => {
    const displayWidth = Math.max(2, Math.round(canvas.clientWidth * devicePixelRatio));
    const displayHeight = Math.max(2, Math.round(canvas.clientHeight * devicePixelRatio));
    const scale = Math.min(1, Math.sqrt(quality.maximumRenderPixels / (displayWidth * displayHeight))) * renderer.renderScale;
    const width = Math.max(2, Math.round(displayWidth * scale)), height = Math.max(2, Math.round(displayHeight * scale));
    if (width === renderer.width && height === renderer.height) return;
    renderer.width = canvas.width = width;
    renderer.height = canvas.height = height;
    context.configure({ device, format: canvasFormat, alphaMode: 'opaque' });
    multisampleTexture?.destroy();
    depthTexture?.destroy();
    depthTexture = device.createTexture({ size: [width, height], format: depthFormat, sampleCount, usage: GPUTextureUsage.RENDER_ATTACHMENT });
    depthAttachment.view = depthTexture.createView();
    if (sampleCount > 1) {
      multisampleTexture = device.createTexture({ size: [width, height], format: canvasFormat, sampleCount, usage: GPUTextureUsage.RENDER_ATTACHMENT });
      colorAttachment.view = multisampleTexture.createView();
      colorAttachment.storeOp = 'discard';
    }
    // the water reflection, at a share of the render size (a 1 x 1 stand-in on Low)
    reflectionTexture?.destroy();
    reflectionDepthTexture?.destroy();
    const reflectionWidth = hasReflection ? Math.max(2, Math.round(width * quality.reflectionScale)) : 1;
    const reflectionHeight = hasReflection ? Math.max(2, Math.round(height * quality.reflectionScale)) : 1;
    reflectionTexture = device.createTexture({ size: [reflectionWidth, reflectionHeight], format: canvasFormat, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
    reflectionDepthTexture = device.createTexture({ size: [reflectionWidth, reflectionHeight], format: depthFormat, usage: GPUTextureUsage.RENDER_ATTACHMENT });
    reflectionColorAttachment.view = reflectionTexture.createView();
    reflectionDepthAttachment.view = reflectionDepthTexture.createView();
    waterBindGroup = device.createBindGroup({
      layout: waterBindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: waterUniformBuffer } }, { binding: 1, resource: reflectionTexture.createView() }, { binding: 2, resource: reflectionSampler }],
    });
  };
  renderer.resize();

  const commandBuffers = [null];
  // with a reflection pass, the timing runs from its start to the end of the scene pass
  const timedReflectionPass = canMeasureGpuTime ? { ...reflectionPass, timestampWrites: { querySet: timestampQuerySet, beginningOfPassWriteIndex: 0 } } : reflectionPass;
  const sceneEndTimedPass = canMeasureGpuTime ? { ...scenePass, timestampWrites: { querySet: timestampQuerySet, endOfPassWriteIndex: 1 } } : scenePass;

  // frameUniforms / reflectionUniforms: the camera and the mirrored camera (main.js); mirrorPlaneHeight: the water
  // surface mirrored this frame, or NaN when no water is in view, which saves the whole reflection pass.
  renderer.render = (frameUniforms, reflectionUniforms, mirrorPlaneHeight) => {
    const drawReflection = mirrorPlaneHeight === mirrorPlaneHeight; // false for NaN
    device.queue.writeBuffer(uniformBuffer, 0, frameUniforms);
    device.queue.writeBuffer(lodFadeBuffer, 0, detailSelector.fades);
    waterUniforms.set(waterField.rippleEvents);
    waterUniforms[waterSettingsOffset] = waterField.rippleCapacity;
    waterUniforms[waterSettingsOffset + 1] = waterField.windGustStrength;
    waterUniforms[waterSettingsOffset + 2] = drawReflection ? mirrorPlaneHeight : 0;
    waterUniforms[waterSettingsOffset + 3] = hasReflection && drawReflection ? 1 : 0;
    device.queue.writeBuffer(waterUniformBuffer, 0, waterUniforms);
    const canvasView = context.getCurrentTexture().createView();
    if (sampleCount > 1) colorAttachment.resolveTarget = canvasView;
    else colorAttachment.view = canvasView;

    let readback = null;
    for (let index = 0; renderer.measureGpuTime && !readback && index < timestampReadbacks.length; index++) {
      if (!timestampReadbacks[index].isBusy) readback = timestampReadbacks[index];
    }
    const encoder = device.createCommandEncoder();
    const withReflection = hasReflection && drawReflection;
    if (withReflection) {
      device.queue.writeBuffer(reflectionUniformBuffer, 0, reflectionUniforms);
      device.queue.writeBuffer(reflectionFadeBuffer, 0, reflectionSelector.fades);
      const mirrorPass = encoder.beginRenderPass(readback ? timedReflectionPass : reflectionPass);
      mirrorPass.setBindGroup(0, reflectionBindGroup);
      mirrorPass.setVertexBuffer(0, architectureBuffer);
      mirrorPass.setPipeline(reflectionArchitecturePipeline);
      drawList(mirrorPass, reflectionSelector.solidDraws, reflectionSelector.solidDrawCount);
      mirrorPass.setPipeline(reflectionSkyPipeline);
      mirrorPass.draw(3);
      mirrorPass.end();
    }
    const pass = encoder.beginRenderPass(readback ? (withReflection ? sceneEndTimedPass : timedScenePass) : scenePass);
    pass.setBindGroup(0, sceneBindGroup);
    // the buildings first, so the depth test skips hidden pixels; the sky fills what is left; water on top
    drawVisibleArchitecture(pass);
    pass.setPipeline(skyPipeline);
    pass.draw(3);
    drawWater(pass);
    pass.end();
    if (readback) {
      encoder.resolveQuerySet(timestampQuerySet, 0, 2, timestampResolveBuffer, 0);
      encoder.copyBufferToBuffer(timestampResolveBuffer, 0, readback.buffer, 0, 16);
    }
    commandBuffers[0] = encoder.finish();
    device.queue.submit(commandBuffers);
    if (readback) {
      readback.isBusy = true;
      readback.buffer.mapAsync(GPUMapMode.READ).then(readback.onMapped, readback.onFailed);
    }
  };

  return renderer;
}
