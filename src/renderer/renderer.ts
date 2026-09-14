import { hexToRgb, Player } from '../util';
import { GAME_H, GAME_W } from '../util/constants';
import type { Camera } from './camera';
import { PaletteSwapPipeline } from './pipelines/palette-swap-pipeline';
import type { Pipeline } from './pipelines/pipeline';
import { PosterizePipeline } from './pipelines/posterize-pipeline';
import { SpritePipeline } from './pipelines/sprite-pipeline';

type PipelineConstructor<T extends Pipeline> = new (
	device: GPUDevice,
	presentationFormat: GPUTextureFormat,
) => T;

const instanceFloats = 16 + 16 + 4;

const palettes: [number, number, number, number][][] = [];
function createPalette(...colors: string[]) {
	const palette = colors.map((c) => hexToRgb(c));
	palettes.push(palette);
	return palette;
}

createPalette('#071821', '#306850', '#86c06c', '#e0f8cf');
createPalette('#393829', '#7b7162', '#b4a56a', '#e6d69c');
createPalette('#003049', '#d62828', '#f77f00', '#fcbf49');
createPalette('#663333', '#0000aa', '#cc0000', '#00dd00');

export interface TexturePointer {
	texture: GPUTexture;
	view: GPUTextureView;
}

export class Renderer {
	device: GPUDevice;
	presentationFormat: GPUTextureFormat;
	context: GPUCanvasContext;

	uniformBuffer!: GPUBuffer;
	uniformData = new Float32Array(instanceFloats);

	constructor(canvas: HTMLCanvasElement, device: GPUDevice) {
		this.device = device;

		const context = canvas.getContext('webgpu');
		if (!context) throw new Error('Failed to create WebGPU context');

		const format = navigator.gpu.getPreferredCanvasFormat();
		context.configure({
			device,
			format,
			alphaMode: 'opaque',
			usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST,
		});

		this.presentationFormat = format;

		this.context = context;
	}

	depthTexture!: GPUTexture;

	spritePipeline!: SpritePipeline;
	posterizePipeline!: PosterizePipeline;
	paletteSwapPipeline!: PaletteSwapPipeline;

	uniformsBindGroupLayout!: GPUBindGroupLayout;
	uniformsBindGroup!: GPUBindGroup;

	entries!: GPUBindGroupEntry[];

	async initPipeline<T extends Pipeline>(
		PipelineClass: PipelineConstructor<T>,
	): Promise<T> {
		return new PipelineClass(this.device, this.presentationFormat).init(
			this,
		);
	}

	contexts: GPUCanvasContext[] = [];

	async init(): Promise<void> {
		const { width, height } = this.context.canvas;
		this.onCanvasSizeUpdate(width, height);

		this.uniformBuffer = this.device.createBuffer({
			size: instanceFloats * 4, // 4x4 matrix + f32
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});

		this.uniformsBindGroupLayout = this.device.createBindGroupLayout({
			label: 'Uniforms bind group layout',
			entries: [
				{
					binding: 0,
					visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
					buffer: { type: 'uniform' },
				},
			],
		});

		const passesWrapper = document.getElementById('render-passes');
		if (!passesWrapper) throw new Error('#render-passes missing');
		for (let i = 0; i < 3; ++i) {
			const canvas = document.createElement(
				'canvas',
			) as HTMLCanvasElement;

			canvas.width = GAME_W;
			canvas.height = GAME_H;

			const context = canvas.getContext('webgpu');
			if (!context) throw new Error('Failed to create WebGPU context');
			this.contexts.push(context);

			context.configure({
				device: this.device,
				format: this.presentationFormat,
				alphaMode: 'opaque',
				usage:
					GPUTextureUsage.RENDER_ATTACHMENT |
					GPUTextureUsage.COPY_DST,
			});

			passesWrapper.append(canvas);
		}

		this.uniformsBindGroup = this.device.createBindGroup({
			label: 'Uniforms bind group',
			layout: this.uniformsBindGroupLayout,
			entries: [
				{
					binding: 0,
					resource: { buffer: this.uniformBuffer },
				},
			],
		});

		this.entries = [
			{
				binding: 0,
				resource: { buffer: this.uniformBuffer },
			},
		];

		this.spritePipeline = await this.initPipeline(SpritePipeline);
		this.posterizePipeline = await this.initPipeline(PosterizePipeline);
		this.paletteSwapPipeline = await this.initPipeline(PaletteSwapPipeline);

		if (import.meta.hot) {
			this.initHMR();
		}
	}

	initHMR(): void {
		if (import.meta.hot) {
			import.meta.hot.accept('./pipelines/sprite-pipeline', (mod) => {
				if (mod) {
					void this.initPipeline(
						mod.SpritePipeline as typeof SpritePipeline,
					).then((p) => (this.spritePipeline = p));
				}
			});

			import.meta.hot.accept('./pipelines/posterize-pipeline', (mod) => {
				if (mod) {
					void this.initPipeline(
						mod.PosterizePipeline as typeof PosterizePipeline,
					).then((p) => (this.posterizePipeline = p));
				}
			});

			import.meta.hot.accept(
				'./pipelines/palette-swap-pipeline',
				(mod) => {
					if (mod) {
						void this.initPipeline(
							mod.PaletteSwapPipeline as typeof PaletteSwapPipeline,
						).then((p) => (this.paletteSwapPipeline = p));
					}
				},
			);
		}
	}

	onCanvasSizeUpdate(width: number, height: number): void {
		// update depth texture
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- it is undefined the first time
		if (this.depthTexture) this.depthTexture.destroy();

		this.depthTexture = this.device.createTexture({
			size: [width, height],
			format: 'depth24plus',
			usage:
				GPUTextureUsage.RENDER_ATTACHMENT |
				GPUTextureUsage.TEXTURE_BINDING,
		});
	}

	textures: TexturePointer[] = [];
	requestTexture(): TexturePointer {
		const pointer: TexturePointer = {
			texture: undefined!,
			view: undefined!,
		};
		this.textures.push(pointer);
		return pointer;
	}

	makeNewTextureIfSizeDifferent(
		pointer: TexturePointer,
		size: { width: number; height: number },
		options: {
			label?: string;
			format: GPUTextureFormat;
			usage: number;
		},
	): boolean {
		const { label = '[unlabelled]', format, usage } = options;

		const { texture } = pointer as { texture: GPUTexture | undefined };
		if (
			!texture ||
			texture.width !== size.width ||
			texture.height !== size.height
		) {
			texture?.destroy();
			pointer.texture = this.device.createTexture({
				label: `${label} texture`,
				format,
				size,
				usage,
			});
			pointer.view = pointer.texture.createView();

			return true;
		}

		return false;
	}

	updateTextures() {
		const size = { width: GAME_W, height: GAME_H };

		const options = {
			label: '???',
			format: navigator.gpu.getPreferredCanvasFormat(),
			usage:
				GPUTextureUsage.RENDER_ATTACHMENT |
				GPUTextureUsage.TEXTURE_BINDING |
				GPUTextureUsage.COPY_SRC,
		};

		this.textures.forEach((pointer) => {
			this.makeNewTextureIfSizeDifferent(pointer, size, options);
		});
	}

	executePipeline() {
		//
	}
}

let palette = 0;
function updateUniforms(renderer: Renderer, camera: Camera): void {
	const { uniformData } = renderer;
	uniformData.set(camera.viewProjMatrix);
	uniformData.set(palettes[palette].flat(), 16);
	uniformData[32] = elapsed / 1e3;

	renderer.device.queue.writeBuffer(renderer.uniformBuffer, 0, uniformData);
}

export function render(
	renderer: Renderer,
	camera: Camera,
	player: Player,
): void {
	const {
		context,
		device,
		depthTexture,
		spritePipeline,
		posterizePipeline,
		paletteSwapPipeline,
		uniformsBindGroup,
	} = renderer;

	updateUniforms(renderer, camera);

	// textures
	renderer.updateTextures();

	const _canvasTexture = context.getCurrentTexture();
	const canvasGameTexture: TexturePointer = {
		texture: _canvasTexture,
		view: _canvasTexture.createView(),
	};

	const passSpritesTexture = spritePipeline.outputTexture;
	const passPosterizeTexture = posterizePipeline.outputTexture;
	const passPaletteTexture = paletteSwapPipeline.outputTexture;

	const [canvasSpritesTexture, canvasPosterizeTexture, canvasPaletteTexture] =
		renderer.contexts.map((c): TexturePointer => {
			const texture = c.getCurrentTexture();
			return {
				texture,
				view: texture.createView(),
			};
		});

	const depthTextureView = depthTexture.createView();

	// render time
	const commandEncoder = device.createCommandEncoder();

	// main pass
	{
		doRenderPass(
			commandEncoder,
			passSpritesTexture.view,
			depthTextureView,
			(renderPass) => {
				renderPass.setBindGroup(0, uniformsBindGroup);

				spritePipeline.render(renderPass, camera, player);
			},
		);

		copyPassTexture(
			commandEncoder,
			passSpritesTexture,
			canvasSpritesTexture,
		);
	}

	{
		doRenderPass(
			commandEncoder,
			passPosterizeTexture.view,
			undefined,
			(renderPass) => {
				renderPass.setBindGroup(0, uniformsBindGroup);

				posterizePipeline.render(renderPass, passSpritesTexture);
			},
		);

		copyPassTexture(
			commandEncoder,
			passPosterizeTexture,
			canvasPosterizeTexture,
		);
	}

	{
		doRenderPass(
			commandEncoder,
			passPaletteTexture.view,
			undefined,
			(renderPass) => {
				renderPass.setBindGroup(0, uniformsBindGroup);

				paletteSwapPipeline.render(renderPass, passPosterizeTexture);
			},
		);

		copyPassTexture(
			commandEncoder,
			passPaletteTexture,
			canvasPaletteTexture,
		);
	}

	// render to main canvas texture
	copyPassTexture(commandEncoder, passPaletteTexture, canvasGameTexture);

	device.queue.submit([commandEncoder.finish()]);
}

function doRenderPass(
	commandEncoder: GPUCommandEncoder,
	passTexture: GPUTextureView,
	depthTexture: GPUTextureView | undefined,
	callback: (renderPass: GPURenderPassEncoder) => void,
): void {
	const renderPass = commandEncoder.beginRenderPass({
		colorAttachments: [
			{
				view: passTexture,
				clearValue: { r: 0.05, g: 0.05, b: 0.1, a: 1.0 },
				loadOp: 'clear',
				storeOp: 'store',
			},
		],
		depthStencilAttachment: depthTexture
			? {
					view: depthTexture,
					depthClearValue: 1,
					depthLoadOp: 'clear',
					depthStoreOp: 'store',
				}
			: undefined,
	});

	callback(renderPass);

	renderPass.end();
}

function copyPassTexture(
	commandEncoder: GPUCommandEncoder,
	src: TexturePointer,
	dst: TexturePointer,
) {
	commandEncoder.copyTextureToTexture(
		{ texture: src.texture },
		{ texture: dst.texture },
		[GAME_W, GAME_H],
	);
}

let elapsed = 0;
export function updateTime(dt: number): void {
	elapsed += dt;
}

export function nextPalette() {
	palette = ++palette % palettes.length;
}
