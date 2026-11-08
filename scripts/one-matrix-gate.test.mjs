import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkOneMatrix } from './one-matrix-gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('記録が無い間はランク 704 と格納ビットだけを見る', async () => {
	const data = mkdtempSync(join(tmpdir(), 'nq-gate-'));
	mkdirSync(join(data, 'features/nanoquant-glm'), { recursive: true });
	assert.deepEqual(await checkOneMatrix(data), []);
	assert.deepEqual(await checkOneMatrix(ROOT), []);
});

test('記録の形が違うときはゲートが拒否する', async () => {
	const data = mkdtempSync(join(tmpdir(), 'nq-gate-'));
	mkdirSync(join(data, 'features/nanoquant-glm'), { recursive: true });
	writeFileSync(join(data, 'features/nanoquant-glm/one-matrix.json'), '{}\n');
	const problems = await checkOneMatrix(data);
	assert.ok(problems.includes('tensor'));
	assert.ok(problems.includes('rank'));
	assert.ok(problems.includes('device'));
});
