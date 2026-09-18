import { fetchShader } from '~/renderer/render-utils';
import type { Renderer, TexturePointer } from '~/renderer/renderer';
import { Sprite } from '~/sprite';
import { loadTexture } from '~/util';
import { Pipeline } from './pipeline';

const shaderFilename = 'sprite.wgsl';

const maxInstances = 128;
const instanceFloats = Sprite.InstanceFloats;
const spriteBufferData = new Float32Array(instanceFloats * maxInstances);

export class SpritePipeline extends Pipeline {
	uniformsBindGroupLayout!: GPUBindGroupLayout;

	spriteBuffer!: GPUBuffer;

	outputTexture!: TexturePointer;

	static texture: GPUTexture;
	textTexture!: GPUTexture;

	async init(renderer: Renderer): Promise<this> {
		const texture = await loadTexture(
			renderer.device,
			'img/spritesheet.png',
		);
		SpritePipeline.texture = texture;

		const { width, height } = renderer.textContext.canvas;
		this.textTexture = renderer.device.createTexture({
			label: 'Text texture',
			size: [width, height],
			format: 'rgba8unorm',
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
		});

		this.outputTexture = renderer.requestTexture();

		this.spriteBuffer = this.device.createBuffer({
			size: spriteBufferData.byteLength,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});

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
			label: 'Sprite pipeline layout',
			bindGroupLayouts: [
				this.uniformsBindGroupLayout,
				this.device.createBindGroupLayout({
					label: 'Sprite pipeline storage layout',
					entries: [
						{
							binding: 0,
							visibility: GPUShaderStage.FRAGMENT,
							sampler: {
								type: 'filtering',
							},
						},
						{
							binding: 1,
							visibility: GPUShaderStage.FRAGMENT,
							texture: {
								sampleType: 'float',
								viewDimension: '2d',
								multisampled: false,
							},
						},
						{
							binding: 2,
							visibility: GPUShaderStage.FRAGMENT,
							texture: {
								sampleType: 'float',
								viewDimension: '2d',
								multisampled: false,
							},
						},
						{
							binding: 3,
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
				depthCompare: 'less-equal',
				format: 'depth24plus',
			},
		});

		const sampler = this.device.createSampler({
			minFilter: 'nearest',
			magFilter: 'nearest',
		});

		const bindGroup = this.device.createBindGroup({
			label: 'Sprite pipeline bind group',
			layout: pipeline.getBindGroupLayout(1),
			entries: [
				{
					binding: 0,
					resource: sampler,
				},
				{
					binding: 1,
					resource: SpritePipeline.texture.createView(),
				},
				{
					binding: 2,
					resource: this.textTexture.createView(),
				},
				{
					binding: 3,
					resource: { buffer: this.spriteBuffer },
				},
			],
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

	render(renderPass: GPURenderPassEncoder, sprites: Sprite[]): void {
		const { device } = this;

		const toRender = sprites.filter((sprite) => sprite.visible);

		toRender.forEach((sprite, i) => {
			spriteBufferData.set([...sprite._data], i * instanceFloats);
		});

		this.device.queue.writeBuffer(this.spriteBuffer, 0, spriteBufferData);

		renderPass.setPipeline(this.pipeline);
		renderPass.setBindGroup(1, this.bindGroup);
		renderPass.draw(6, toRender.length, 0, 0);
	}
}
