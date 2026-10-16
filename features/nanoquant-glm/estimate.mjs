/** GLM-5.3-Flash を低ランク二値分解したときの格納量。品質は測らない。 */

export const GLM_53_FLASH_PARAMS = 321_323_031_390;

/** 論文本文の Llama-2-70B。137.95 GB から 5.75 GB。 */
export const NANOQUANT_LLAMA70_FROM_BYTES = 137_950_000_000;
export const NANOQUANT_LLAMA70_TO_BYTES = 5_750_000_000;

/** このデスクトップ。RAM と VRAM は GiB、ディスク表記は 932GB。 */
export const HOST = {
	ramBytes: 32 * 1024 ** 3,
	vramBytes: 8 * 1024 ** 3,
	diskBytes: 932 * 1000 ** 3,
	ramReserveBytes: 4 * 1024 ** 3
};

function positiveInt(name, value) {
	if (!Number.isSafeInteger(value) || value <= 0) {
		throw new TypeError(`${name} は正の安全整数`);
	}
}

/** @param {number} params @param {number} bitsPerWeightMilli 1000 が 1 bit */
export function weightBytes(params, bitsPerWeightMilli) {
	positiveInt('params', params);
	positiveInt('bitsPerWeightMilli', bitsPerWeightMilli);
	const num = BigInt(params) * BigInt(bitsPerWeightMilli);
	const den = 8000n;
	const bytes = (num + den - 1n) / den;
	if (bytes > BigInt(Number.MAX_SAFE_INTEGER)) {
		throw new RangeError('バイト数が安全整数を超える');
	}
	return Number(bytes);
}

/** 参照モデルの圧縮率を、別のバイト数へ掛ける。 */
export function scaleBytes(sourceBytes, fromBytes, toBytes) {
	positiveInt('sourceBytes', sourceBytes);
	positiveInt('fromBytes', fromBytes);
	positiveInt('toBytes', toBytes);
	const bytes = (BigInt(sourceBytes) * BigInt(toBytes)) / BigInt(fromBytes);
	if (bytes > BigInt(Number.MAX_SAFE_INTEGER)) {
		throw new RangeError('バイト数が安全整数を超える');
	}
	return Number(bytes);
}

export function fits(bytes, capacityBytes) {
	if (!Number.isSafeInteger(bytes) || bytes < 0) throw new TypeError('bytes は 0 以上の安全整数');
	if (!Number.isSafeInteger(capacityBytes) || capacityBytes < 0) {
		throw new TypeError('capacityBytes は 0 以上の安全整数');
	}
	return bytes <= capacityBytes;
}
