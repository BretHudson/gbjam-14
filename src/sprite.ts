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

		this.palette.set([0, 1, 2, 3]);
	}

	setPalette(c0: number, c1: number = c0, c2: number = c1, c3: number = c2) {
		this.palette.set([c0, c1, c2, c3]);
	}

	resetPalette() {
		this.setPalette(0, 1, 2, 3);
	}

	cyclePalette() {
		const palette = [...this.palette] as [number, number, number, number];
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
