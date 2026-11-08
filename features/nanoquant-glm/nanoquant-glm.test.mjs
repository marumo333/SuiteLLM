import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	GLM_53_FLASH_PARAMS,
	HOST,
	NANOQUANT_LLAMA70_FROM_BYTES,
	NANOQUANT_LLAMA70_TO_BYTES,
	fits,
	scaleBytes,
	weightBytes
} from './estimate.mjs';
import { decodeE4m3, dequantBlock, matrixRank, storedBits, writeReconstructionRecord } from './rank.mjs';

const BF16_BYTES = 641_640_000_000;

test('nanoquant-glm', () => {
	const at055 = weightBytes(GLM_53_FLASH_PARAMS, 550);
	assert.equal(at055, 22_090_958_409);
	assert.equal(fits(at055 + HOST.ramReserveBytes, HOST.ramBytes), true);
	assert.equal(fits(at055, HOST.vramBytes), false);

	const at080 = weightBytes(GLM_53_FLASH_PARAMS, 800);
	assert.equal(at080, 32_132_303_139);
	assert.equal(fits(at080 + HOST.ramReserveBytes, HOST.ramBytes), false);
	assert.equal(fits(at080, HOST.vramBytes), false);

	const likeLlama70 = scaleBytes(BF16_BYTES, NANOQUANT_LLAMA70_FROM_BYTES, NANOQUANT_LLAMA70_TO_BYTES);
	assert.equal(likeLlama70, 26_744_690_105);
	assert.equal(fits(likeLlama70 + HOST.ramReserveBytes, HOST.ramBytes), true);
	assert.equal(fits(likeLlama70, HOST.vramBytes), false);
});

test('4096×2048 を bitsPerWeightMilli 550 で見るとランク 704、格納ビット 4423680', () => {
	const rank = matrixRank(4096, 2048, 550);
	assert.equal(rank, 704);
	assert.equal(storedBits(4096, 2048, rank), 4_423_680);
});

test('復元が非有限、またはノルムが 0 のときは再構成誤差を記録しない', () => {
	const n = 4096 * 2048;
	const finite = new Float64Array(n);
	finite[0] = 1;
	const nonFinite = new Float64Array(n);
	nonFinite[0] = Number.NaN;
	const zero = new Float64Array(n);
	const errors = {
		relativeError: 0.5,
		continuousRelativeError: 0.4,
		device: 'NVIDIA GeForce RTX 4060'
	};
	const path = join(mkdtempSync(join(tmpdir(), 'nq-one-')), 'one-matrix.json');
	const shape = { rows: 4096, cols: 2048 };

	assert.equal(writeReconstructionRecord(path, { ...shape, data: nonFinite }, errors), null);
	assert.equal(existsSync(path), false);
	assert.equal(writeReconstructionRecord(path, { ...shape, data: zero }, errors), null);
	assert.equal(existsSync(path), false);
	assert.equal(
		writeReconstructionRecord(path, { ...shape, data: finite }, { ...errors, relativeError: Number.NaN }),
		null
	);
	assert.equal(existsSync(path), false);

	const written = writeReconstructionRecord(path, { ...shape, data: finite }, errors);
	assert.equal(written.rank, 704);
	assert.equal(written.storedBits, 4_423_680);
	assert.equal(written.solverCommit, 'a9e0a430881ff80d83b622c3129e330dc33c04f5');
	assert.equal(written.seed, 0);
	assert.equal(written.device, 'NVIDIA GeForce RTX 4060');
	assert.equal(existsSync(path), true);
});

test('16×32 の因子に足す表は、パックの機械を置き換えない', () => {
	const design = readFileSync(new URL('./design.md', import.meta.url), 'utf8');
	const vocab = 154_880;
	const embed = vocab * 32;
	const head = vocab * 16;
	const factor = 16 * 32;
	const params = embed + head + factor;
	const bytes = params * 2;
	const macs = 32 * 16 + 16 * vocab;
	const requirements = readFileSync(new URL('./requirements.md', import.meta.url), 'utf8');
	assert.equal(factor, 512);
	assert.equal(embed, 4_956_160);
	assert.equal(head, 2_478_080);
	assert.equal(params, 7_434_752);
	assert.equal(bytes, 14_869_504);
	assert.equal(macs, 2_478_592);
	assert.match(design, /## 16×32 の因子に表を足す場合/);
	assert.match(design, /パックの契約を変えない/);
	assert.match(design, /ゲートはこの節を見ない/);
	assert.match(design, /学習も推論も開始しない/);
	assert.match(design, /実行ファイルは足さない/);
	assert.match(design, /因子列はこのリポジトリへ入れない/);
	assert.match(design, /この節ではその学習を始めない/);
	assert.match(design, /推論の実行は PyTorch である/);
	assert.match(design, /binary_kernels` は、この形を読まない/);
	assert.match(design, /秒数と tok\/s は未計測である/);
	assert.match(design, /1\.958784297641366e-10/);
	assert.match(design, /154,880/);
	assert.match(design, /14,869,504 バイト/);
	assert.match(design, /2,478,592 回/);
	assert.match(design, /残差の本数/);
	assert.match(design, /RTX 5060 Ti/);
	assert.match(design, /NVIDIA GeForce RTX 4060 8GiB/);
	assert.match(design, /この節はそちらを置き換えない/);
	assert.match(design, /パックの校正手順は変えない/);
	assert.doesNotMatch(requirements, /16×32 の因子に表を足す場合/);
});

test('e4m3 の 1 にブロック尺度を掛けると復元になる', () => {
	assert.equal(decodeE4m3(Uint8Array.of(0x00))[0], 0);
	assert.equal(decodeE4m3(Uint8Array.of(0x38))[0], 1);
	assert.equal(decodeE4m3(Uint8Array.of(0x40))[0], 2);
	assert.equal(decodeE4m3(Uint8Array.of(0xb8))[0], -1);
	assert.equal(decodeE4m3(Uint8Array.of(0x7e))[0], 448);
	assert.equal(Number.isNaN(decodeE4m3(Uint8Array.of(0x7f))[0]), true);
	const restored = dequantBlock(Uint8Array.of(0x38, 0x40, 0x38, 0x30), Float32Array.of(0.5), 2, 2, 128);
	assert.deepEqual(Array.from(restored), [0.5, 1, 0.5, 0.25]);
});
