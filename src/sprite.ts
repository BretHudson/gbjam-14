import { clamp, type Palette } from './util';

const INSTANCE_FLOATS = 11 + 1; // + 2 is padding

// prettier-ignore
const [
	P0, _P1, _P2, _P3,
	X, Y,
	TX, TY,
	W, H,
	TEX_ID,
] = Array.from(
	{ length: INSTANCE_FLOATS },
	(_, i) => i,
);

export class Sprite {
	static InstanceFloats = INSTANCE_FLOATS;

	_data = new Float32Array(Sprite.InstanceFloats);
	#defaultPalette = new Float32Array(4);
	palette = this._data.subarray(P0, P0 + 4);
	visible = true;

	_x: number = 0;
	_y: number = 0;

	_offsetX: number = 0;
	_offsetY: number = 0;

	constructor(
		textureX: number,
		textureY: number,
		width: number,
		height: number,
	) {
		this.x = 0;
		this.y = 0;

		this.textureX = textureX;
		this.textureY = textureY;

		this.width = width;
		this.height = height;

		this.#defaultPalette.set([0, 1, 2, 3]);
		this.palette.set(this.#defaultPalette);
	}

	setPalette(c0: number, c1: number = c0, c2: number = c1, c3: number = c2) {
		this.palette.set([c0, c1, c2, c3]);
	}

	setDefaultPalette(
		c0: number,
		c1: number = c0,
		c2: number = c1,
		c3: number = c2,
	) {
		this.#defaultPalette.set([c0, c1, c2, c3]);
		this.resetPalette();
	}

	setMinLevel(level: number) {
		const palette = Array.from({ length: 4 }, (_, i) => {
			return Math.max(this.#defaultPalette[i], level);
		}) as Palette;

		this.setPalette(...palette);
	}

	setMaxLevel(level: number) {
		const palette = Array.from({ length: 4 }, (_, i) => {
			return Math.min(this.#defaultPalette[i], level);
		}) as Palette;

		this.setPalette(...palette);
	}

	setShift(shift: number) {
		const palette = Array.from({ length: 4 }, (_P1, i) => {
			return clamp(this.#defaultPalette[i] - shift, 0, 3);
		}) as Palette;

		this.setPalette(...palette);
	}

	setInvShift(shift: number) {
		const palette = Array.from({ length: 4 }, (_P1, i) => {
			return clamp(this.#defaultPalette[i] + shift, 0, 3);
		}) as Palette;

		this.setPalette(...palette);
	}

	setMax(level: number) {
		this.setPalette(
			clamp(this.#defaultPalette[0], 0, 3),
			clamp(this.#defaultPalette[1], 0, 3),
			clamp(this.#defaultPalette[2], 0, 3),
			clamp(this.#defaultPalette[3], 0, 3),
		);
	}

	setMin(level: number) {
		//
	}

	resetPalette() {
		this.setPalette(
			this.#defaultPalette[0],
			this.#defaultPalette[1],
			this.#defaultPalette[2],
			this.#defaultPalette[3],
		);
	}

	cyclePalette() {
		const palette = [...this.palette] as Palette;
		palette.push(palette.shift() as number);
		this.setPalette(...palette);
	}

	get x() {
		return this._x;
	}
	set x(value) {
		this._x = value;
		this._updateX();
	}

	get offsetX() {
		return this._offsetX;
	}
	set offsetX(value) {
		this._offsetX = value;
		this._updateX();
	}

	_updateX() {
		this._data[X] = this._x + this._offsetX;
	}

	get y() {
		return this._y;
	}
	set y(value) {
		this._y = value;
		this._updateY();
	}

	get offsetY() {
		return this._offsetY;
	}
	set offsetY(value) {
		this._offsetY = value;
		this._updateY();
	}

	_updateY() {
		this._data[Y] = this._y + this._offsetY;
	}

	get textureX() {
		return this._data[TX];
	}
	set textureX(value) {
		this._data[TX] = value;
	}

	get textureY() {
		return this._data[TY];
	}
	set textureY(value) {
		this._data[TY] = value;
	}

	get width() {
		return this._data[W];
	}
	set width(value) {
		this._data[W] = value;
	}

	get height() {
		return this._data[H];
	}
	set height(value) {
		this._data[H] = value;
	}

	get textureId() {
		return this._data[TEX_ID];
	}
	set textureId(value) {
		this._data[TEX_ID] = value;
	}
}

export class SpriteGroup {
	sprites: Sprite[] = [];

	set visible(value: boolean) {
		this.sprites.forEach((sprite) => {
			sprite.visible = value;
		});
	}

	constructor(...sprites: Sprite[]) {
		this.sprites = sprites;
	}

	setPalette(c0: number, c1: number = c0, c2: number = c1, c3: number = c2) {
		this.sprites.forEach((sprite) => {
			sprite.palette.set([c0, c1, c2, c3]);
		});
	}

	resetPalette() {
		this.setPalette(0, 1, 2, 3);
	}
}

export interface Frame {
	frame: { x: number; y: number; w: number; h: number };
	rotated: boolean;
	trimmed: boolean;
	spriteSourceSize: { x: number; y: number; w: number; h: number };
	sourceSize: { w: number; h: number };
}

export interface Layer {
	name: string;
	group?: string;
	opacity?: number;
	blendMode?: 'normal' | 'additive' | 'multiply';
}

export type SpriteGroupName =
	| 'Group 2'
	| 'PREPARE SPRITE'
	| 'HURT'
	| 'Right ATK - WIP'
	| 'Left ATK - WIP'
	| 'Left ATK - WIP Copy'
	| 'Down ATK'
	| 'Up ATK'
	| 'Neutral/Idle WIP'
	| 'UI ELEMENTS'
	| 'Hearts'
	| 'DIRECT ARROWS - PRESSED'
	| 'DIRECT ARROWS'
	| 'ACTION BOUNDARY';

export type SpriteData = Record<
	SpriteGroupName,
	{ name: string; items: Layer[]; sprites: Frame[] }
>;
