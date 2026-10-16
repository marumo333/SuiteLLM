import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	GLM_53_FLASH_PARAMS,
	HOST,
	NANOQUANT_LLAMA70_FROM_BYTES,
	NANOQUANT_LLAMA70_TO_BYTES,
	fits,
	scaleBytes,
	weightBytes
} from './estimate.mjs';

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
