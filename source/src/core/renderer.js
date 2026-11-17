// The WebGPU renderer: opens the device, sizes the canvas within the preset's pixel budget, builds the sky and
// block pipelines and draws one frame per call. Optional GPU timestamps measure the frame for the H stats.
// Depends on meshBuilder.js, blocks.js (instance layout) and the WGSL in look/shaders/.

import { createPrismMesh } from './meshBuilder.js';
import { blockShapes, sidesPerShape } from '../square/blocks.js';
import { skyWgsl } from '../look/shaders/sky.wgsl.js';
import { blockoutWgsl } from '../look/shaders/blockout.wgsl.js';

export const frameUniformFloatCount = 64; // matches FrameUniforms in frameUniforms.wgsl.js
const depthFormat = 'depth32float';
const timestampReadbackBufferCount = 4;

export async function openGpu() {
  if (!navigator.gpu) throw new Error('This scene needs WebGPU. Try a current Chrome or Edge.', { cause: 'shown as is' });
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('No WebGPU adapter found.', { cause: 'shown as is' });
  const canMeasureGpuTime = adapter.features.has('timestamp-query');
  const device = await adapter.requestDevice({ requiredFeatures: canMeasureGpuTime ? ['timestamp-query'] : [] });
  device.addEventListener('uncapturederror', (event) => console.error('GPU: ' + event.error.message));
  return { adapter, device, canMeasureGpuTime };
}

export function createRenderer({ device, canMeasureGpuTime, canvas, quality, blockInstancesByShape }) {
  const context = canvas.getContext('webgpu');
  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  const sampleCount = quality.antialiasingSamples;

  const createBufferWithData = (data, usage) => {
    const buffer = device.createBuffer({ size: Math.max(16, (data.byteLength + 3) & ~3), usage: usage | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(buffer, 0, data);
    return buffer;
  };

  // ---- per-frame uniforms, shared by every pipeline through bind group 0
  const uniformBuffer = device.createBuffer({ size: frameUniformFloatCount * 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const frameBindGroupLayout = device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: {} }],
  });
  const frameBindGroup = device.createBindGroup({ layout: frameBindGroupLayout, entries: [{ binding: 0, resource: { buffer: uniformBuffer } }] });
  const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [frameBindGroupLayout] });

  const createScenePipeline = (code, vertexEntry, fragmentEntry, buffers, depthStencil, cullMode = 'none') => {
    const module = device.createShaderModule({ code });
    return device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: { module, entryPoint: vertexEntry, buffers },
      fragment: { module, entryPoint: fragmentEntry, targets: [{ format: canvasFormat }] },
      primitive: { topology: 'triangle-list', cullMode },
      depthStencil: { format: depthFormat, ...depthStencil },
      multisample: { count: sampleCount },
    });
  };

  // the sky fills the screen first; nothing tests against it
  const skyPipeline = createScenePipeline(skyWgsl, 'skyVertex', 'skyFragment', [], { depthWriteEnabled: false, depthCompare: 'always' });

  // reverse-Z depth: nearer is greater
  const attribute = (shaderLocation, offset, format) => ({ shaderLocation, offset, format });
  const blockPipeline = createScenePipeline(blockoutWgsl, 'blockVertex', 'blockFragment', [
    { arrayStride: 12, attributes: [attribute(0, 0, 'float32x3')] },
    { arrayStride: 48, stepMode: 'instance', attributes: [attribute(1, 0, 'float32x4'), attribute(2, 16, 'float32x4'), attribute(3, 32, 'float32x4')] },
  ], { depthWriteEnabled: true, depthCompare: 'greater' }, 'back');

  const blockDraws = blockShapes.map((shape) => {
    const mesh = createPrismMesh(sidesPerShape[shape]);
    const instances = blockInstancesByShape[shape];
    return {
      meshBuffer: createBufferWithData(mesh, GPUBufferUsage.VERTEX),
      vertexCount: mesh.length / 3,
      instanceBuffer: createBufferWithData(instances, GPUBufferUsage.VERTEX),
      instanceCount: instances.length / 12,
    };
  }).filter((draw) => draw.instanceCount > 0);

  // ---- GPU timing: two timestamps around the scene pass, read back through a small ring of buffers
  let timestampQuerySet, timestampResolveBuffer;
  const timestampReadbacks = [];
  const renderer = { gpuMilliseconds: 0, measureGpuTime: false, width: 0, height: 0 };
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
      timestampReadbacks.push(readback);
    }
  }

  // ---- render targets, rebuilt when the window size changes
  let multisampleTexture, depthTexture;
  const colorAttachment = { view: null, resolveTarget: undefined, loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] };
  const depthAttachment = { view: null, depthClearValue: 0, depthLoadOp: 'clear', depthStoreOp: 'discard' };
  const scenePass = { colorAttachments: [colorAttachment], depthStencilAttachment: depthAttachment, timestampWrites: undefined };
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
    pass.setBindGroup(0, frameBindGroup);
    pass.setPipeline(skyPipeline);
    pass.draw(3);
    pass.setPipeline(blockPipeline);
    for (let index = 0; index < blockDraws.length; index++) {
      const draw = blockDraws[index];
      pass.setVertexBuffer(0, draw.meshBuffer);
      pass.setVertexBuffer(1, draw.instanceBuffer);
      pass.draw(draw.vertexCount, draw.instanceCount);
    }
    pass.end();
    if (readback) {
      encoder.resolveQuerySet(timestampQuerySet, 0, 2, timestampResolveBuffer, 0);
      encoder.copyBufferToBuffer(timestampResolveBuffer, 0, readback.buffer, 0, 16);
    }
    commandBuffers[0] = encoder.finish();
    device.queue.submit(commandBuffers);
    if (readback) {
      readback.isBusy = true;
      readback.buffer.mapAsync(GPUMapMode.READ).then(readback.onMapped, () => { readback.isBusy = false; });
    }
  };

  return renderer;
}
