/**
 * Rebuilds the raster favicon/app icons from the SVG brand sources.
 * Run with `bun scripts/generate-brand-assets.ts` after editing
 * `public/goCart.svg` or `public/brand/gocart-mark-maskable.svg`.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const publicDir = path.join(process.cwd(), 'public');
const roundedMark = path.join(publicDir, 'goCart.svg');
const fullBleedMark = path.join(publicDir, 'brand', 'gocart-mark-maskable.svg');

function renderPng(source: string, size: number): Promise<Buffer> {
	return sharp(source, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
}

/** ICO container with embedded PNG frames (supported by every modern browser). */
function encodeIco(frames: { size: number; png: Buffer }[]): Buffer {
	const header = Buffer.alloc(6);
	header.writeUInt16LE(0, 0);
	header.writeUInt16LE(1, 2);
	header.writeUInt16LE(frames.length, 4);

	const entries: Buffer[] = [];
	let offset = header.length + frames.length * 16;
	for (const { size, png } of frames) {
		const entry = Buffer.alloc(16);
		entry.writeUInt8(size >= 256 ? 0 : size, 0);
		entry.writeUInt8(size >= 256 ? 0 : size, 1);
		entry.writeUInt8(0, 2);
		entry.writeUInt8(0, 3);
		entry.writeUInt16LE(1, 4);
		entry.writeUInt16LE(32, 6);
		entry.writeUInt32LE(png.length, 8);
		entry.writeUInt32LE(offset, 12);
		entries.push(entry);
		offset += png.length;
	}

	return Buffer.concat([header, ...entries, ...frames.map((frame) => frame.png)]);
}

async function main() {
	const icoFrames = await Promise.all([16, 32, 48].map(async (size) => ({ size, png: await renderPng(roundedMark, size) })));

	const outputs: [string, Buffer][] = [
		['favicon.ico', encodeIco(icoFrames)],
		['icon-192.png', await renderPng(roundedMark, 192)],
		['icon-512.png', await renderPng(roundedMark, 512)],
		['apple-touch-icon.png', await renderPng(fullBleedMark, 180)],
		['icon-maskable-512.png', await renderPng(fullBleedMark, 512)],
	];

	for (const [file, data] of outputs) {
		await writeFile(path.join(publicDir, file), data);
		console.log(`public/${file} (${data.length} bytes)`);
	}
}

main().catch((error: unknown) => {
	console.error(error);
	process.exit(1);
});
