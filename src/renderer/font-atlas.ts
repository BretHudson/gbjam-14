interface Letter {
	x: number;
	y: number;
	w: number;
	h: number;
}

export function extractFontAtlas(img: HTMLImageElement) {
	const width = img.naturalWidth || img.width;
	const height = img.naturalHeight || img.height;
	const canvas = new OffscreenCanvas(width, height);
	const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
	ctx.drawImage(img, 0, 0);

	const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
	const isCharacter = (x: number, y: number) => {
		const i = (y * width + x) * 4;
		return data[i] === 0 || data[i + 3] === 0;
	};

	const layout = [
		' !"#$%&\'()*+,-./',
		'0123456789:;<=>?',
		'@ABCDEFGHIJKLMNO',
		'PQRSTUVWXYZ[\\]^_',
		'`abcdefghijklmno',
		'pqrstuvwxyz',
	];

	const xStride = 11;
	const yStride = 11;
	const xStart = 0;
	const yStart = 0;

	const fontAtlas: Record<string, Letter> = {};

	layout.forEach((rowStr, ri) => {
		for (let ci = 0; ci < rowStr.length; ci++) {
			const char = rowStr[ci];

			const cellX = xStart + ci * xStride;
			const cellY = yStart + ri * yStride;

			let minX = xStride,
				maxX = -1;
			let minY = yStride,
				maxY = -1;

			for (let y = 0; y < yStride; y++) {
				for (let x = 0; x < xStride; x++) {
					if (isCharacter(cellX + x, cellY + y)) {
						if (x < minX) minX = x;
						if (x > maxX) maxX = x;
						if (y < minY) minY = y;
						if (y > maxY) maxY = y;
					}
				}
			}

			if (maxX >= 0) {
				fontAtlas[char] = {
					x: cellX + minX,
					y: cellY + minY,
					w: maxX - minX + 1,
					h: maxY - minY + 1,
				};
			}
		}
	});

	return fontAtlas;
}
