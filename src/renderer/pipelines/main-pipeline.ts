import type { Renderer } from '~/renderer/renderer';
import { fetchShader } from '../render-utils';
import { Pipeline } from './pipeline';

const shaderFilename = 'main.wgsl';

// prettier-ignore
const faces = [
	[0, 0, 0, 0,], // +X
	[0, 0, 0, 1,], // -X
	[0, 0, 0, 2,], // +Y
	[0, 0, 0, 3,], // -Y
	[0, 0, 0, 4,], // +Z
	[0, 0, 0, 5,], // -Z
] as const;

const faceBufferData = new ArrayBuffer(faces.length * 16);
const floatView = new Float32Array(faceBufferData);
const uintView = new Uint32Array(faceBufferData);

const maxInstances = 32;
const instanceFloats = 20;
const modelBufferData = new Float32Array(maxInstances * instanceFloats);

faces.forEach(([x, y, z, face], i) => {
	const offset = i * 4;
	floatView[offset + 0] = x;
	floatView[offset + 1] = y;
	floatView[offset + 2] = z;
	uintView[offset + 3] = face;
});

let instanceCount = 0;
export class MainPipeline extends Pipeline {
	uniformsBindGroupLayout!: GPUBindGroupLayout;

	modelBuffer!: GPUBuffer;
	faceBuffer!: GPUBuffer;

	async init(renderer: Renderer): Promise<this> {
		this.modelBuffer = this.device.createBuffer({
			size: modelBufferData.byteLength,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});

		this.faceBuffer = this.device.createBuffer({
			size: faceBufferData.byteLength,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});

		this.device.queue.writeBuffer(this.faceBuffer, 0, faceBufferData);

		this.uniformsBindGroupLayout = renderer.uniformsBindGroupLayout;

		const { pipeline, bindGroup } = await this.buildPipeline();

		this.pipeline = pipeline;
		this.bindGroup = bindGroup;

		this.initHMR();

		return this;
	}

	initHMR(): void {
		import.meta.hot?.on('shader-update', (data: { file: string }) => {
			if (data.file.endsWith(`shaders/${shaderFilename}`)) {
				void this.buildPipeline().then(({ pipeline, bindGroup }) => {
					this.pipeline = pipeline;
					this.bindGroup = bindGroup;
				});
			}
		});
	}

	pipeline!: GPURenderPipeline;
	bindGroup!: GPUBindGroup;

	async _buildPipeline(): Promise<{
		pipeline: GPURenderPipeline;
		bindGroup: GPUBindGroup;
	}> {
		const shaderSrc = await fetchShader(shaderFilename);

		this.device.pushErrorScope('validation');
		const module = this.device.createShaderModule({
			label: 'shader module',
			code: shaderSrc,
		});
		const error = await this.device.popErrorScope();

		if (error) {
			const info = await module.getCompilationInfo();
			for (const msg of info.messages) {
				console.warn(
					`[WGSL ${msg.type}] ${msg.message} at line ${msg.lineNum}:${msg.linePos}`,
				);
			}
			throw new Error(`Shader compilation failed: ${error.message}`);
		}

		const pipelineLayout = this.device.createPipelineLayout({
			label: 'Main pipeline layout',
			bindGroupLayouts: [
				this.uniformsBindGroupLayout,
				this.device.createBindGroupLayout({
					label: 'Main pipeline storage layout',
					entries: [
						{
							binding: 0,
							visibility: GPUShaderStage.VERTEX,
							buffer: { type: 'read-only-storage' },
						},
					],
				}),
			],
		});

		const format = this.presentationFormat;
		const pipeline = await this.device.createRenderPipelineAsync({
			layout: pipelineLayout,
			vertex: { module },
			fragment: {
				module,
				targets: [
					{
						format,
						blend: {
							color: {
								srcFactor: 'src-alpha',
								dstFactor: 'one-minus-src-alpha',
								operation: 'add',
							},
							alpha: {
								srcFactor: 'one',
								dstFactor: 'one-minus-src-alpha',
								operation: 'add',
							},
						},
					},
				],
			},
			primitive: {
				topology: 'triangle-list',
				cullMode: 'back',
			},
			depthStencil: {
				depthWriteEnabled: true,
				depthCompare: 'less',
				format: 'depth24plus',
			},
		});

		const bindGroup = this.device.createBindGroup({
			label: 'Main pipeline bind group',
			layout: pipeline.getBindGroupLayout(1),
			entries: [{ binding: 0, resource: { buffer: this.faceBuffer } }],
		});

		return { pipeline, bindGroup };
	}

	async buildPipeline(): Promise<{
		pipeline: GPURenderPipeline;
		bindGroup: GPUBindGroup;
	}> {
		try {
			return this._buildPipeline();
		} catch (e) {
			console.error('failed to compile pipeline');

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- this can happen
			if (!this.pipeline) throw e;

			return { pipeline: this.pipeline, bindGroup: this.bindGroup };
		}
	}

	render(renderPass: GPURenderPassEncoder): void {
		const { device } = this;

		const faceCount = faces.length;

		instanceCount = 1;

		device.queue.writeBuffer(
			this.modelBuffer,
			0,
			modelBufferData.subarray(0, instanceCount * instanceFloats),
		);

		renderPass.setPipeline(this.pipeline);
		renderPass.setBindGroup(1, this.bindGroup);
		renderPass.draw(6, faceCount * instanceCount, 0, 0);
	}
}
