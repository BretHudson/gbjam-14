const [X, Y, TX, TY, W, H, P] = Array.from({ length: 7 }, (_, i) => i);

export class Sprite {
	static InstanceFloats = 10;

	_data = new Float32Array(Sprite.InstanceFloats);
	palette = this._data.subarray(P, P + 4);

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

	get x() {
		return this._data[X];
	}
	set x(value) {
		this._data[X] = value;
	}

	get y() {
		return this._data[Y];
	}
	set y(value) {
		this._data[Y] = value;
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
}
