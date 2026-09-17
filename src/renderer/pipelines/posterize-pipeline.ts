import { fetchShader } from '~/renderer/render-utils';
import type { Renderer, TexturePointer } from '~/renderer/renderer';
import { Pipeline } from './pipeline';

const shaderFilename = 'posterize.wgsl';

export class PosterizePipeline extends Pipeline {
	uniformsBindGroupLayout!: GPUBindGroupLayout;

	outputTexture!: TexturePointer;

	async init(renderer: Renderer): Promise<this> {
		this.outputTexture = renderer.requestTexture();

		this.uniformsBindGroupLayout = renderer.uniformsBindGroupLayout;

		const { pipeline } = await this.buildPipeline();

		this.pipeline = pipeline;

		this.initHMR();

		return this;
	}

	initHMR(): void {
		import.meta.hot?.on('shader-update', (data: { file: string }) => {
			if (data.file.endsWith(`shaders/${shaderFilename}`)) {
				void this.buildPipeline().then(({ pipeline }) => {
					this.pipeline = pipeline;
				});
			}
		});
	}

	pipeline!: GPURenderPipeline;

	async _buildPipeline(): Promise<{
		pipeline: GPURenderPipeline;
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
				targets: [{ format }],
			},
			primitive: {
				topology: 'triangle-list',
				cullMode: 'back',
			},
		});

		return { pipeline };
	}

	async buildPipeline(): Promise<{
		pipeline: GPURenderPipeline;
	}> {
		try {
			return this._buildPipeline();
		} catch (e) {
			console.error('failed to compile pipeline');

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- this can happen
			if (!this.pipeline) throw e;

			return { pipeline: this.pipeline };
		}
	}

	render(renderPass: GPURenderPassEncoder, texture: TexturePointer): void {
		const sampler = this.device.createSampler({
			minFilter: 'nearest',
			magFilter: 'nearest',
		});

		const bindGroup = this.device.createBindGroup({
			label: 'Posterize pipeline bind group',
			layout: this.pipeline.getBindGroupLayout(1),
			entries: [
				{
					binding: 0,
					resource: sampler,
				},
				{
					binding: 1,
					resource: texture.texture,
				},
			],
		});

		renderPass.setPipeline(this.pipeline);
		renderPass.setBindGroup(1, bindGroup);
		renderPass.draw(6, 1, 0, 0);
	}
}
