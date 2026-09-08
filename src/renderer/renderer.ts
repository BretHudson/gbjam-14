import type { Camera } from './camera';
import { MainPipeline } from './pipelines/main-pipeline';
import type { Pipeline } from './pipelines/pipeline';

type PipelineConstructor<T extends Pipeline> = new (
	device: GPUDevice,
	presentationFormat: GPUTextureFormat,
) => T;

const instanceFloats = 20;

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
		context.configure({ device, format, alphaMode: 'opaque' });

		this.presentationFormat = format;

		this.context = context;
	}

	depthTexture!: GPUTexture;

	mainPipeline!: MainPipeline;

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

		this.mainPipeline = await this.initPipeline(MainPipeline);

		if (import.meta.hot) {
			this.initHMR();
		}
	}

	initHMR(): void {
		if (import.meta.hot) {
			import.meta.hot.accept('./pipelines/main-pipeline', (mod) => {
				if (mod) {
					void this.initPipeline(
						mod.MainPipeline as typeof MainPipeline,
					).then((p) => (this.mainPipeline = p));
				}
			});
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
}

function updateUniforms(renderer: Renderer, camera: Camera): void {
	const { uniformData } = renderer;
	uniformData.set(camera.viewProjMatrix);
	uniformData[16] = elapsed / 1e3;

	renderer.device.queue.writeBuffer(renderer.uniformBuffer, 0, uniformData);
}

export function render(renderer: Renderer, camera: Camera): void {
	const { context, device, depthTexture, mainPipeline, uniformsBindGroup } =
		renderer;

	updateUniforms(renderer, camera);

	const canvasTexture = context.getCurrentTexture();
	const canvasTextureView = canvasTexture.createView();

	const depthTextureView = depthTexture.createView();

	const commandEncoder = device.createCommandEncoder();

	const renderPass = commandEncoder.beginRenderPass({
		colorAttachments: [
			{
				view: canvasTextureView,
				clearValue: { r: 0.05, g: 0.05, b: 0.1, a: 1.0 },
				loadOp: 'clear',
				storeOp: 'store',
			},
		],
		depthStencilAttachment: {
			view: depthTextureView,
			depthClearValue: 1,
			depthLoadOp: 'clear',
			depthStoreOp: 'store',
		},
	});

	renderPass.setBindGroup(0, uniformsBindGroup);

	mainPipeline.render(renderPass);

	renderPass.end();

	device.queue.submit([commandEncoder.finish()]);
}

let elapsed = 0;
export function updateTime(dt: number): void {
	elapsed += dt;
}
