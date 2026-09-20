import { Sprite } from '~/sprite';

export function* pause(duration = 15) {
	for (let i = 0; i < duration; ++i) yield;
}

export function* fadeIn(sprites: Sprite[], duration = 15) {
	sprites.forEach((sprite) => {
		sprite.visible = true;
		sprite.setPalette(0);
	});

	const palette = Array.from({ length: 4 }, (_, i) => i) as [
		number,
		number,
		number,
		number,
	];

	for (let c = 3; c >= 0; --c) {
		yield* pause(duration);

		for (let i = 0; i < 4; ++i) {
			palette[i] = Math.max(0, i - c);
		}
		sprites.forEach((sprite) => sprite.setPalette(...palette));
	}
}

export function* fadeInReverse(sprites: Sprite[], duration = 15) {
	sprites.forEach((sprite) => {
		sprite.visible = true;
		sprite.setPalette(0);
	});
	yield* pause(duration);
	sprites.forEach((sprite) => {
		sprite.visible = true;
		sprite.setPalette(1);
	});
	yield* pause(duration);
	sprites.forEach((sprite) => {
		sprite.visible = true;
		sprite.setPalette(0, 1);
	});
	yield* pause(duration);

	const palette = Array.from({ length: 4 }, (_, i) => i) as [
		number,
		number,
		number,
		number,
	];

	for (let c = 3; c >= 0; --c) {
		yield* pause(duration);

		for (let i = 1; i < 4; ++i) {
			palette[i] = Math.max(i, c);
		}
		sprites.forEach((sprite) => sprite.setPalette(...palette));
	}
}

export function* fadeIn2(sprites: Sprite[], duration = 15) {
	sprites.forEach((sprite) => {
		sprite.visible = true;
		sprite.setPalette(0);
	});

	const palette = Array.from({ length: 4 }, (_, i) => i) as [
		number,
		number,
		number,
		number,
	];

	for (let c = 0; c < 4; ++c) {
		yield* pause(duration);

		for (let i = 0; i < 4; ++i) {
			palette[i] = Math.min(i, c);
		}
		sprites.forEach((sprite) => sprite.setPalette(...palette));
	}
}
