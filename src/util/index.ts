import { type Vec2 } from 'wgpu-matrix';
import { Camera } from '~/renderer/camera';
import { Sprite, SpriteGroup } from '~/sprite';

export async function loadTexture(device: GPUDevice, url: string) {
	const response = await fetch(url);
	const blob = await response.blob();
	const bitmap = await createImageBitmap(blob);

	const texture = device.createTexture({
		label: 'loadTexture',
		size: [bitmap.width, bitmap.height],
		format: 'rgba8unorm',
		usage:
			GPUTextureUsage.TEXTURE_BINDING |
			GPUTextureUsage.COPY_DST |
			GPUTextureUsage.RENDER_ATTACHMENT,
	});

	device.queue.copyExternalImageToTexture({ source: bitmap }, { texture }, [
		bitmap.width,
		bitmap.height,
	]);

	return texture;
}

export function clamp(v: number, min: number, max: number) {
	return Math.min(Math.max(v, min), max);
}

export interface Player {
	sprite: Sprite;
	pos: Vec2;
	health: number;
}

export enum FSMState {
	NONE,

	MENU,
	INTRO,
	PLAYER_INPUT,
	SEE_PLAY,

	NUM,
}

export const GROUP = {
	BG: 'BG',
	ENEMY: 'ENEMY',
	HUD: 'HUD',
} as const;

// gonna need raw, screen, and local pos
export interface GameState {
	camera: Camera;
	player: Player;
	sprites: Sprite[];
	spriteGroups: Map<keyof typeof GROUP, SpriteGroup>;
	lastState: FSMState;
	state: FSMState;
	nextState: FSMState;
}

export function hexToRgb(hex: string): [number, number, number, number] {
	const str = hex.replace('#', '').trim();
	const rHex = str.substring(0, 2);
	const gHex = str.substring(2, 4);
	const bHex = str.substring(4, 6);

	return [rHex, gHex, bHex, 'FF'].map((h) => parseInt(h, 16) / 255) as [
		number,
		number,
		number,
		number,
	];
}
