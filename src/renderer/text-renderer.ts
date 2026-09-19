import { GAME_H, GAME_W } from '~/util/constants';
import { extractFontAtlas } from './font-atlas';

let fontAtlas: any;

export class TextRenderer {
	ctx: CanvasRenderingContext2D;
	fontTexture: HTMLImageElement;

	constructor(textCanvas: HTMLCanvasElement) {
		const ctx = textCanvas.getContext('2d', { willReadFrequently: true });
		if (!ctx) throw new Error('Failed to create 2D context');
		ctx.imageSmoothingEnabled = false;
		this.ctx = ctx;

		const image = new Image();
		image.onload = function () {
			fontAtlas = extractFontAtlas(image);
		};
		image.src = 'fonts/aseprite_mini.png';
		this.fontTexture = image;
	}
}

export function reset(textRenderer: TextRenderer) {
	const { ctx } = textRenderer;
	ctx.clearRect(0, 0, GAME_W, GAME_H);
}

export function renderText(
	textRenderer: TextRenderer,
	text: string,
	x: number,
	y: number,
	color = 3,
) {
	const { ctx, fontTexture } = textRenderer;

	let drawX = x;
	let drawY = y;

	let percentage = color / 3;
	switch (color) {
		case 0:
			percentage = 0;
			break;
		case 1:
			percentage = 0.22;
			break;
		case 2:
			percentage = 0.66;
			break;
		case 3:
			percentage = 1;
	}

	ctx.filter = `invert(1) brightness(${percentage * 100}%)`;

	text.split('').forEach((key) => {
		// const { x, y, w, h } = fontAtlas.get(str)!;
		// const { x, y, w, h } = FONT_ATLAS[key];
		const { x, y, w, h } = fontAtlas[key];
		ctx.drawImage(fontTexture, x, y, w, h, drawX, drawY, w, h);
		drawX += w;
		// ++drawY;
	});

	ctx.filter = 'none';

	// ctx.globalCompositeOperation = 'source-in';
	// ctx.fillStyle = 'white';
	// ctx.fillRect(0, 0, GAME_W, GAME_H);

	// ctx.globalCompositeOperation = 'source-over';
}
