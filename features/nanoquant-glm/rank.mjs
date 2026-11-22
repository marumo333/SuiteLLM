/** 1 行列のランクと、再構成誤差を記録してよいか。ソルバはここへコピーしない。 */
import { randomBytes } from 'node:crypto';
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const ONE_MATRIX_TENSOR =
	'model.language_model.layers.3.mlp.experts.0.down_proj.weight';
export const SOLVER_COMMIT = 'a9e0a430881ff80d83b622c3129e330dc33c04f5';
export const ONE_MATRIX_ROWS = 4096;
export const ONE_MATRIX_COLS = 2048;
export const ONE_MATRIX_BITS = 550;

function positiveInt(name, value) {
	if (!Number.isSafeInteger(value) || value <= 0) {
		throw new TypeError(`${name} は正の安全整数`);
	}
}

/**
 * SamsungLabs/NanoQuant `a9e0a430` の calculate_ranks。
 * 予算ビットを (rows + cols) で割り、スケール 16 を引き、32 の倍数へ切り下げる。
 */
export function matrixRank(rows, cols, bitsPerWeightMilli) {
	positiveInt('rows', rows);
	positiveInt('cols', cols);
	positiveInt('bitsPerWeightMilli', bitsPerWeightMilli);
	const raw = (rows * cols * (bitsPerWeightMilli / 1000)) / (rows + cols) - 16;
	let rank = Math.trunc(raw);
	rank = Math.floor(rank / 32) * 32;
	if (rank === 0) rank = 32;
	rank = Math.max(rank, 32);
	const limit = Math.min(rows, cols);
	if (rank > limit) return limit;
	return rank;
}

/** (rank + 16) * (rows + cols)。16 は FP16 スケール 1 本分。 */
export function storedBits(rows, cols, rank) {
	positiveInt('rows', rows);
	positiveInt('cols', cols);
	positiveInt('rank', rank);
	const bits = BigInt(rank + 16) * BigInt(rows + cols);
	if (bits > BigInt(Number.MAX_SAFE_INTEGER)) {
		throw new RangeError('格納ビットが安全整数を超える');
	}
	return Number(bits);
}

function finiteMatrix(restored) {
	if (!restored) return false;
	if (restored.rows !== ONE_MATRIX_ROWS || restored.cols !== ONE_MATRIX_COLS) return false;
	const data = restored.data;
	const n = restored.rows * restored.cols;
	if (!data || data.length !== n) return false;
	let sum = 0;
	for (let i = 0; i < n; i++) {
		const v = data[i];
		if (!Number.isFinite(v)) return false;
		sum += v * v;
	}
	return sum > 0;
}

/** 条件を満たさないときは null。ファイルは作らない。 */
export function reconstructionRecord(restored, errors) {
	if (!finiteMatrix(restored)) return null;
	if (!errors || !Number.isFinite(errors.relativeError) || !Number.isFinite(errors.continuousRelativeError)) {
		return null;
	}
	if (typeof errors.device !== 'string' || errors.device.length === 0) return null;
	const rank = matrixRank(ONE_MATRIX_ROWS, ONE_MATRIX_COLS, ONE_MATRIX_BITS);
	return {
		tensor: ONE_MATRIX_TENSOR,
		rows: ONE_MATRIX_ROWS,
		cols: ONE_MATRIX_COLS,
		rank,
		bitsPerWeightMilli: ONE_MATRIX_BITS,
		storedBits: storedBits(ONE_MATRIX_ROWS, ONE_MATRIX_COLS, rank),
		relativeError: errors.relativeError,
		continuousRelativeError: errors.continuousRelativeError,
		solverCommit: SOLVER_COMMIT,
		seed: 0,
		device: errors.device
	};
}

export function writeReconstructionRecord(path, restored, errors) {
	const record = reconstructionRecord(restored, errors);
	if (!record) return null;
	const partial = join(dirname(path), `.${randomBytes(4).toString('hex')}.partial`);
	writeFileSync(partial, `${JSON.stringify(record, null, '\t')}\n`);
	renameSync(partial, path);
	return record;
}

/** 記録があるときのゲート。誤差の大小は見ない。 */
export function oneMatrixProblems(record) {
	/** @type {string[]} */
	const problems = [];
	if (!record || typeof record !== 'object') return ['記録が無い'];
	if (record.tensor !== ONE_MATRIX_TENSOR) problems.push('tensor');
	if (record.rows !== ONE_MATRIX_ROWS) problems.push('rows');
	if (record.cols !== ONE_MATRIX_COLS) problems.push('cols');
	if (record.rank !== 704) problems.push('rank');
	if (record.bitsPerWeightMilli !== ONE_MATRIX_BITS) problems.push('bitsPerWeightMilli');
	if (record.storedBits !== 4_423_680) problems.push('storedBits');
	if (!Number.isFinite(record.relativeError)) problems.push('relativeError');
	if (!Number.isFinite(record.continuousRelativeError)) problems.push('continuousRelativeError');
	if (record.solverCommit !== SOLVER_COMMIT) problems.push('solverCommit');
	if (record.seed !== 0) problems.push('seed');
	if (typeof record.device !== 'string' || !record.device.includes('RTX 4060')) problems.push('device');
	return problems;
}

/** ブロック FP8（e4m3fn）。指数 15 かつ仮数 7 だけが非数。 */
export function decodeE4m3(bytes) {
	const out = new Float32Array(bytes.length);
	for (let i = 0; i < bytes.length; i++) {
		const b = bytes[i];
		const sign = b & 0x80 ? -1 : 1;
		const exp = (b >> 3) & 0xf;
		const mant = b & 0x7;
		if (exp === 0) out[i] = sign * 2 ** -6 * (mant / 8);
		else if (exp === 15 && mant === 7) out[i] = Number.NaN;
		else out[i] = sign * 2 ** (exp - 7) * (1 + mant / 8);
	}
	return out;
}

/** FP8 の値に 128×128 の weight_scale_inv を掛ける。 */
export function dequantBlock(weightBytes, scale, rows, cols, block = 128) {
	positiveInt('rows', rows);
	positiveInt('cols', cols);
	positiveInt('block', block);
	if (weightBytes.length !== rows * cols) throw new RangeError('重みの長さが形と違う');
	const gridRows = Math.ceil(rows / block);
	const gridCols = Math.ceil(cols / block);
	if (scale.length !== gridRows * gridCols) throw new RangeError('尺度の長さがブロックと違う');
	const decoded = decodeE4m3(weightBytes);
	const out = new Float32Array(decoded.length);
	for (let i = 0; i < rows; i++) {
		const sr = Math.floor(i / block) * gridCols;
		const row = i * cols;
		for (let j = 0; j < cols; j++) {
			out[row + j] = decoded[row + j] * scale[sr + Math.floor(j / block)];
		}
	}
	return out;
}

function argValue(name) {
	const i = process.argv.indexOf(`--${name}`);
	return i >= 0 ? process.argv[i + 1] : '';
}

function f32FromFile(path) {
	const raw = readFileSync(path);
	const copy = new ArrayBuffer(raw.byteLength);
	new Uint8Array(copy).set(raw);
	return new Float32Array(copy);
}

function main() {
	if (process.argv.includes('--restore')) {
		const rows = Number(argValue('rows'));
		const cols = Number(argValue('cols'));
		const weight = new Uint8Array(readFileSync(argValue('weight')));
		const scale = f32FromFile(argValue('scale'));
		const restored = dequantBlock(weight, scale, rows, cols);
		writeFileSync(argValue('out'), Buffer.from(restored.buffer, restored.byteOffset, restored.byteLength));
		return;
	}
	if (process.argv.includes('--record')) {
		const rows = Number(argValue('rows'));
		const cols = Number(argValue('cols'));
		const data = f32FromFile(argValue('matrix'));
		const written = writeReconstructionRecord(
			argValue('out'),
			{ rows, cols, data },
			{
				relativeError: Number(argValue('relative')),
				continuousRelativeError: Number(argValue('continuous')),
				device: argValue('device')
			}
		);
		if (!written) {
			console.error('再構成誤差を記録しない');
			process.exit(1);
		}
		console.log(written.relativeError);
	}
}

const entry = process.argv[1] ? pathToFileURL(resolvePath(process.argv[1])).href : '';
if (import.meta.url === entry) main();

function resolvePath(p) {
	return p.startsWith('/') || /^[A-Za-z]:/.test(p) ? p : join(process.cwd(), p);
}
