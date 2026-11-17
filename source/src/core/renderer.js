// The WebGPU renderer: opens the device, sizes the canvas within the preset's pixel budget, builds the sky,
// architecture and block pipelines, draws the sun shadow map and sky occlusion map once at load, and draws
// one frame per call. Optional GPU timestamps measure the frame for the H stats and the benchmark.
// Depends on meshBuilder.js, blocks.js (instance layout), lighting.js and the WGSL in look/shaders/.

import { createPrismMesh, bytesPerVertex } from './meshBuilder.js';
import { blockShapes, sidesPerShape, floatsPerBlockInstance } from '../square/blocks.js';
import { skyWgsl } from '../look/shaders/sky.wgsl.js';
import { blockoutWgsl } from '../look/shaders/blockout.wgsl.js';
import { architectureWgsl } from '../look/shaders/architecture.wgsl.js';

export const frameUniformFloatCount = 96; // matches FrameUniforms in frameUniforms.wgsl.js
export const sunShadowMatrixOffset = 64;
export const skyOcclusionMatrixOffset = 80;
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

export function createRenderer({ device, canMeasureGpuTime, canvas, quality, blockInstancesByShape, architectureVertexData, lightMapMatrices }) {
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
    ],
  });
  const uniformsOnlyBindGroupLayout = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: allStages, buffer: {} }] });
  const uniformBuffer = createUniformBuffer();
  const sceneBindGroup = device.createBindGroup({
    layout: sceneBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: sunShadowMap.createView() },
      { binding: 2, resource: comparisonSampler },
      { binding: 3, resource: skyOcclusionMap.createView() },
    ],
  });
  const scenePipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [sceneBindGroupLayout] });
  const lightMapPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [uniformsOnlyBindGroupLayout] });

  // ---- pipelines
  const modules = {};
  const shaderModule = (code) => (modules[code] ??= device.createShaderModule({ code }));
  const createScenePipeline = (code, vertexEntry, fragmentEntry, buffers, depthStencil, cullMode = 'back') => device.createRenderPipeline({
    layout: scenePipelineLayout,
    vertex: { module: shaderModule(code), entryPoint: vertexEntry, buffers },
    fragment: { module: shaderModule(code), entryPoint: fragmentEntry, targets: [{ format: canvasFormat }] },
    primitive: { topology: 'triangle-list', cullMode },
    depthStencil: { format: depthFormat, ...depthStencil },
    multisample: { count: sampleCount },
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

  const blockBuffers = [
    { arrayStride: 12, attributes: [attribute(0, 0, 'float32x3')] },
    { arrayStride: floatsPerBlockInstance * 4, stepMode: 'instance', attributes: [attribute(1, 0, 'float32x4'), attribute(2, 16, 'float32x4'), attribute(3, 32, 'float32x4')] },
  ];
  const blockPipeline = createScenePipeline(blockoutWgsl, 'blockVertex', 'blockFragment', blockBuffers, sceneDepth);
  const blockLightMapPipeline = createLightMapPipeline(blockoutWgsl, 'blockVertex', blockBuffers);

  const architectureBuffers = [{
    arrayStride: bytesPerVertex,
    attributes: [attribute(0, 0, 'float32x3'), attribute(1, 12, 'snorm8x4'), attribute(2, 16, 'uint8x4')],
  }];
  const architecturePipeline = createScenePipeline(architectureWgsl, 'architectureVertex', 'architectureFragment', architectureBuffers, sceneDepth);
  const architectureLightMapPipeline = createLightMapPipeline(architectureWgsl, 'architectureDepthVertex', [{
    arrayStride: bytesPerVertex, attributes: [attribute(0, 0, 'float32x3')],
  }]);

  // ---- geometry
  const blockDraws = blockShapes.map((shape) => {
    const mesh = createPrismMesh(sidesPerShape[shape]);
    const instances = blockInstancesByShape[shape];
    return {
      meshBuffer: createBufferWithData(mesh, GPUBufferUsage.VERTEX), vertexCount: mesh.length / 3,
      instanceBuffer: createBufferWithData(instances, GPUBufferUsage.VERTEX), instanceCount: instances.length / floatsPerBlockInstance,
    };
  }).filter((draw) => draw.instanceCount > 0);
  const architectureBuffer = createBufferWithData(architectureVertexData, GPUBufferUsage.VERTEX);
  const architectureVertexCount = architectureVertexData.byteLength / bytesPerVertex;

  const drawBlocks = (pass) => {
    for (let index = 0; index < blockDraws.length; index++) {
      const draw = blockDraws[index];
      pass.setVertexBuffer(0, draw.meshBuffer);
      pass.setVertexBuffer(1, draw.instanceBuffer);
      pass.draw(draw.vertexCount, draw.instanceCount);
    }
  };
  const drawArchitecture = (pass) => {
    pass.setVertexBuffer(0, architectureBuffer);
    pass.draw(architectureVertexCount);
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
    drawArchitecture(pass);
    pass.setPipeline(blockLightMapPipeline);
    drawBlocks(pass);
    pass.end();
    device.queue.submit([encoder.finish()]);
  };
  drawLightMap(sunShadowMap, lightMapMatrices.sunShadowMatrix);
  drawLightMap(skyOcclusionMap, lightMapMatrices.skyOcclusionMatrix);

  // ---- GPU timing: two timestamps around the scene pass, read back through a small ring of buffers
  const renderer = { gpuMilliseconds: 0, measureGpuTime: false, width: 0, height: 0 };
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
  let multisampleTexture, depthTexture;
  const colorAttachment = { view: null, resolveTarget: undefined, loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] };
  const depthAttachment = { view: null, depthClearValue: 0, depthLoadOp: 'clear', depthStoreOp: 'discard' };
  const scenePass = { colorAttachments: [colorAttachment], depthStencilAttachment: depthAttachment };
  const timedScenePass = canMeasureGpuTime
    ? { ...scenePass, timestampWrites: { querySet: timestampQuerySet, beginningOfPassWriteIndex: 0, endOfPassWriteIndex: 1 } }
    : scenePass;

  renderer.resize = () => {
    const displayWidth = Math.max(2, Math.round(canvas.clientWidth * devicePixelRatio));
    const displayHeight = Math.max(2, Math.round(canvas.clientHeight * devicePixelRatio));
    const scale = Math.min(1, Math.sqrt(quality.maximumRenderPixels / (displayWidth * displayHeight)));
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
  };
  renderer.resize();

  const commandBuffers = [null];
  renderer.render = (frameUniforms) => {
    device.queue.writeBuffer(uniformBuffer, 0, frameUniforms);
    const canvasView = context.getCurrentTexture().createView();
    if (sampleCount > 1) colorAttachment.resolveTarget = canvasView;
    else colorAttachment.view = canvasView;

    let readback = null;
    for (let index = 0; renderer.measureGpuTime && !readback && index < timestampReadbacks.length; index++) {
      if (!timestampReadbacks[index].isBusy) readback = timestampReadbacks[index];
    }
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(readback ? timedScenePass : scenePass);
    pass.setBindGroup(0, sceneBindGroup);
    // nearest and biggest first, so the depth test skips most hidden pixels; the sky fills what is left
    pass.setPipeline(architecturePipeline);
    drawArchitecture(pass);
    pass.setPipeline(blockPipeline);
    drawBlocks(pass);
    pass.setPipeline(skyPipeline);
    pass.draw(3);
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
