import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** GIF の画像セパレータを数える。圧縮データの 0x2C はブロック長で飛ばす。 */
function gifFrames(buf) {
	const sig = buf.toString('ascii', 0, 6);
	assert.ok(sig === 'GIF89a' || sig === 'GIF87a');
	let i = 13;
	const packed = buf[10];
	if (packed & 0x80) i += 3 * (1 << ((packed & 7) + 1));
	let frames = 0;
	while (i < buf.length) {
		const b = buf[i];
		if (b === 0x3b) break;
		if (b === 0x21) {
			i += 2;
			while (i < buf.length && buf[i] !== 0) i += buf[i] + 1;
			i += 1;
			continue;
		}
		if (b === 0x2c) {
			frames += 1;
			const ip = buf[i + 9];
			i += 10;
			if (ip & 0x80) i += 3 * (1 << ((ip & 7) + 1));
			i += 1;
			while (i < buf.length && buf[i] !== 0) i += buf[i] + 1;
			i += 1;
			continue;
		}
		throw new Error(`GIF の未知ブロック ${b} at ${i}`);
	}
	return frames;
}

test('破線のあるアーキテクチャ図は自己改善図と同じ 8 フレームで流れる', () => {
	const animated = ['self-improve-flow', 'runtime-overview', 'review-overview', 'host-entry-as-is-to-be'];
	for (const name of animated) {
		const buf = readFileSync(join(ROOT, 'docs/architecture', `${name}.gif`));
		assert.equal(gifFrames(buf), 8, name);
	}
	const audit = readFileSync(join(ROOT, 'docs/architecture/audit-overview.gif'));
	assert.equal(gifFrames(audit), 1, '監査図の辺は実線だけなので動かない');
});
