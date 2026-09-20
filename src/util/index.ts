import { Camera } from '~/renderer/camera';
import type { BattleState } from '~/scenes/battle-scene';
import type { DebugState } from '~/scenes/debug-scene';
import type { MenuState } from '~/scenes/menu-scene';
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

export type Palette = [number, number, number, number];

type GameScene = 'DEBUG' | 'MENU' | 'BATTLE' | null;

export interface Game {
	scene: GameScene;
	nextScene: GameScene;
	swapPalette: boolean;
	debugState: DebugState;
	menuState: MenuState;
	battleState: BattleState;

	frameId: number;
	curGenerator: Generator | null;
}

export interface SceneState {
	camera: Camera;
	spriteGroups: SpriteGroup[];
	sprites: Sprite[];
}

export function hexToRgb(hex: string): Palette {
	const str = hex.replace('#', '').trim();
	const rHex = str.substring(0, 2);
	const gHex = str.substring(2, 4);
	const bHex = str.substring(4, 6);

	return [rHex, gHex, bHex, 'FF'].map(
		(h) => parseInt(h, 16) / 255,
	) as Palette;
}
