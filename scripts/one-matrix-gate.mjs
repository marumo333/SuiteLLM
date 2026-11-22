#!/usr/bin/env node
/** 1 行列のランク契約。記録が無い間はランクと格納ビットだけを見る。 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function implRootFor(dataRoot) {
	if (existsSync(join(dataRoot, 'features/nanoquant-glm/rank.mjs'))) return dataRoot;
	return SCRIPT_ROOT;
}

/**
 * @param {string} dataRoot
 */
export async function checkOneMatrix(dataRoot) {
	const impl = implRootFor(dataRoot);
	const mod = await import(pathToFileURL(join(impl, 'features/nanoquant-glm/rank.mjs')).href);
	/** @type {string[]} */
	const problems = [];
	const rank = mod.matrixRank(4096, 2048, 550);
	const bits = mod.storedBits(4096, 2048, rank);
	if (rank !== 704) problems.push(`ランクは 704（実際 ${rank}）`);
	if (bits !== 4_423_680) problems.push(`格納ビットは 4423680（実際 ${bits}）`);
	const file = join(dataRoot, 'features/nanoquant-glm/one-matrix.json');
	if (!existsSync(file)) return problems;
	let record;
	try {
		record = JSON.parse(readFileSync(file, 'utf8'));
	} catch {
		return [...problems, 'one-matrix.json が JSON ではない'];
	}
	for (const key of mod.oneMatrixProblems(record)) problems.push(key);
	return problems;
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entry) {
	const root = process.argv[2] || process.env.HARNESS_ROOT || SCRIPT_ROOT;
	const problems = await checkOneMatrix(root);
	if (problems.length) {
		console.error(`[one-matrix] ${problems.join(' / ')}`);
		process.exit(1);
	}
	console.log('[one-matrix] ランク 704');
}
