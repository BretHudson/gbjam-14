import {
	type Frame,
	Layer,
	Sprite,
	SpriteData,
	SpriteGroup,
	SpriteGroupName,
} from '~/sprite';

export const fetchShader = async (shaderSrc: string): Promise<string> => {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- safety check
	if (shaderSrc === undefined) {
		console.trace();
		throw new Error('wtf');
	}
	const path = `./shaders/${shaderSrc}`;
	const url = new URL(path, window.location.href);
	return fetch(url.href).then((res) => res.text());
};

type Callback = (width: number, height: number) => void;
export const initCanvasResize = (
	canvas: HTMLCanvasElement,
	callback: Callback,
): void => {
	const observer = new ResizeObserver((entries) => {
		for (const entry of entries) {
			const width = entry.contentBoxSize[0].inlineSize;
			const height = entry.contentBoxSize[0].blockSize;
			const _canvas = entry.target as HTMLCanvasElement;
			callback(width, height);
		}
	});
	observer.observe(canvas);
};

export function parseAsepriteData(spritesheet: any): SpriteData {
	const _groups: any[] = [];
	spritesheet.meta.layers.forEach((layer: Layer) => {
		if (!('opacity' in layer)) {
			_groups.push({
				...layer,
				items: [],
				sprites: [],
			});
		} else {
			const sprite =
				spritesheet.frames[
					layer.name as keyof typeof spritesheet.frames
				];

			if (sprite === undefined)
				console.warn(`Sprite not found for layer: ${layer.name}`);

			if ('group' in layer) {
				const parent = _groups.find(
					(group) => group.name === layer.group,
				);
				if (!parent) throw new Error('No parent group found');
				parent.items.push(layer);
				parent.sprites.push(sprite);
			} else {
				_groups.push({
					...layer,
					items: [layer],
					sprites: [sprite],
				});
			}
		}
	});

	const entries = _groups.map((group) => [group.name, group]);
	return Object.fromEntries(entries) as SpriteData;
}

export function spriteFromData(data: Frame): Sprite {
	const { frame } = data;
	const sprite = new Sprite(frame.x, frame.y, frame.w, frame.h);
	if (data.trimmed) {
		sprite.offsetX = data.spriteSourceSize.x;
		sprite.offsetY = data.spriteSourceSize.y;
	}
	return sprite;
}

export function getSpriteGroups(
	spriteData: SpriteData,
	...groups: SpriteGroupName[]
): SpriteGroup[] {
	return groups.map((groupName) => {
		const sprites = spriteData[groupName].sprites.map(spriteFromData);

		return new SpriteGroup(...sprites);
	});
}
