export class Sprite {
	static InstanceFloats = 6;

	_data = new Float32Array(Sprite.InstanceFloats);

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
	}

	get x() {
		return this._data[0];
	}
	set x(value) {
		this._data[0] = value;
	}

	get y() {
		return this._data[1];
	}
	set y(value) {
		this._data[1] = value;
	}

	get textureX() {
		return this._data[2];
	}
	set textureX(value) {
		this._data[2] = value;
	}

	get textureY() {
		return this._data[3];
	}
	set textureY(value) {
		this._data[3] = value;
	}

	get width() {
		return this._data[4];
	}
	set width(value) {
		this._data[4] = value;
	}

	get height() {
		return this._data[5];
	}
	set height(value) {
		this._data[5] = value;
	}
}
