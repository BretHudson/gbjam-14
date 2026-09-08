import type { Renderer } from '~/renderer/renderer';

export abstract class Pipeline {
	device: GPUDevice;
	presentationFormat: GPUTextureFormat;

	constructor(device: GPUDevice, presentationFormat: GPUTextureFormat) {
		this.device = device;
		this.presentationFormat = presentationFormat;
	}

	abstract init(renderer: Renderer): Promise<this>;
}
