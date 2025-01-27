/*!
 * Copyright (c) 2025 SingChun LEE @ Bucknell University. CC BY-NC 4.0.
 * 
 * This code is provided mainly for educational purposes at Bucknell University.
 *
 * This code is licensed under the Creative Commons Attribution-NonCommerical 4.0
 * International License. To view a copy of the license, visit 
 *   https://creativecommons.org/licenses/by-nc/4.0/
 * or send a letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
 *
 * You are free to:
 *  - Share: copy and redistribute the material in any medium or format.
 *  - Adapt: remix, transform, and build upon the material.
 *
 * Under the following terms:
 *  - Attribution: You must give appropriate credit, provide a link to the license,
 *                 and indicate if changes where made.
 *  - NonCommerical: You may not use the material for commerical purposes.
 *  - No additional restrictions: You may not apply legal terms or technological 
 *                                measures that legally restrict others from doing
 *                                anything the license permits.
 */

// Check your browser supports: https://github.com/gpuweb/gpuweb/wiki/Implementation-Status#implementation-status
// Need to enable experimental flags chrome://flags/
// Chrome & Edge 113+ : Enable Vulkan, Default ANGLE Vulkan, Vulkan from ANGLE, Unsafe WebGPU Support, and WebGPU Developer Features (if exsits)
// Firefox Nightly: sudo snap install firefox --channel=latext/edge or download from https://www.mozilla.org/en-US/firefox/channel/desktop/

import Renderer from '/lib/Viz/2DRenderer.js'
import Standard2DVertexObject from '/lib/DSViz/Standard2DVertexObject.js'


async function init() {
  // Create a canvas tag
  const canvasTag = document.createElement('canvas');
  canvasTag.id = "renderCanvas";
  document.body.appendChild(canvasTag);
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const context = canvasTag.getContext("webgpu");

  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device: device,
    format: canvasFormat,
  });

  // triangle points
  const triangleVertices = new Float32Array([
    0.0, 0.5,  
    -0.5, 0.0,  
    0.5, 0.0,  
  ]);
  // rectangle points
  const rectangleVertices = new Float32Array([
    -0.5, -0.75, 
     0.5, -0.75, 
     0.5,  0.0,  
    -0.5, -0.75, 
     0.5,  0.0,  
    -0.5,  0.0,  
  ]);

  // trying to make a star
  const allStarVertices = new Float32Array([
    0.0, 0.0,
    0.1, -0.2,
    -0.2, -0.4,

    -0.2, -0.1,
    0.2, -0.1,
    0.0, -0.3,

    0.0, -0.3,
    0.2, -0.4,
    0.1, -0.2,
  ]);

  // const secondVertices = new Float32Array([
  //   -0.2,-0.10,
  //   0.2, -0.1,
  //   0.0, -0.3,
  // ]);

  // const thirdVertices = new Float32Array([
  //   0.0,-0.30,
  //   0.2, -0.4,
  //   0.1, -0.2,
  // ]);
  
  const triangleBuffer = device.createBuffer({
    size: triangleVertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(triangleBuffer, 0, triangleVertices);

  const rectangleBuffer = device.createBuffer({
    size: rectangleVertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(rectangleBuffer, 0, rectangleVertices);

  const starBuffer = device.createBuffer({
    size: allStarVertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(starBuffer, 0, allStarVertices);

  // const secondBuffer = device.createBuffer({
  //   size: secondVertices.byteLength,
  //   usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  // });
  // device.queue.writeBuffer(secondBuffer, 0, secondVertices);

  // const thirdBuffer = device.createBuffer({
  //   size: thirdVertices.byteLength,
  //   usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  // });
  // device.queue.writeBuffer(thirdBuffer, 0, thirdVertices);

  const triangleColorBuffer = device.createBuffer({
    size: 4 * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(triangleColorBuffer, 0, new Float32Array([1.0, 0.0, 0.0, 1.0])); // Red color

  const rectangleColorBuffer = device.createBuffer({
    size: 4 * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(rectangleColorBuffer, 0, new Float32Array([0.0, 1.0, 0.0, 1.0])); // Green color

  const starColorBuffer = device.createBuffer({
    size: 4 * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(starColorBuffer, 0, new Float32Array([1.0, 1.0, 1.0, 1.0])); // White color

  // Define shaders
  const vertCode = `
    struct VertexOutput {
        @builtin(position) pos: vec4f,
    };

    @vertex
    fn vertexMain(@location(0) pos: vec2f) -> VertexOutput {
        var output: VertexOutput;
        output.pos = vec4f(pos, 0.0, 1.0);
        return output;
    }
  `;

  const fragCode = `
    struct Uniforms {
        color: vec4f,
    };

    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    @fragment
    fn fragmentMain() -> @location(0) vec4f {
        return uniforms.color; // Use the uniform color
    }
  `;

  const shaderModule = device.createShaderModule({
    code: vertCode + fragCode,
  });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" },
      },
    ],
  });

  const triangleBindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: { buffer: triangleColorBuffer },
      },
    ],
  });

  const rectangleBindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: { buffer: rectangleColorBuffer },
      },
    ],
  });

  const starBindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: { buffer: starColorBuffer },
      },
    ],
  });

  const renderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    }),
    vertex: {
      module: shaderModule,
      entryPoint: "vertexMain",
      buffers: [{
        arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT,
        attributes: [
          {
            format: "float32x2",
            offset: 0,
            shaderLocation: 0,
          },
        ],
      }],
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fragmentMain",
      targets: [{ format: canvasFormat }],
    },
  });

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      view: context.getCurrentTexture().createView(),
      clearValue: { r: 0.0, g: 0.0, b: 0.5, a: 1.0 }, 
      loadOp: "clear",
      storeOp: "store",
    }],
  });

  //triangle
  pass.setPipeline(renderPipeline);
  pass.setBindGroup(0, triangleBindGroup); 
  pass.setVertexBuffer(0, triangleBuffer); 
  pass.draw(triangleVertices.length / 2);

  // rectangle
  pass.setBindGroup(0, rectangleBindGroup);
  pass.setVertexBuffer(0, rectangleBuffer);
  pass.draw(rectangleVertices.length / 2);

  // star
  pass.setBindGroup(0, starBindGroup);
  pass.setVertexBuffer(0, starBuffer); 
  pass.draw((allStarVertices.length) / 2);

  pass.end();

  device.queue.submit([encoder.finish()]);
}

init().then(() => {
  console.log("Rendering complete.");
}).catch((error) => {
  console.error("Error initializing WebGPU:", error.message);
  const pTag = document.createElement('p');
  pTag.innerHTML = error.message;
  document.body.appendChild(pTag);
});

