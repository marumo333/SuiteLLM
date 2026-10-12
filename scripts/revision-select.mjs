#!/usr/bin/env node
/** 採点のあるハーネス改訂を、開発点数が親を上回るときだけ残す。 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkRevisionRecord } from './lib/revision-select.mjs';

function readJson(text, label) {
	try {
		return { ok: true, value: JSON.parse(text) };
	} catch {
		return { ok: false, error: `${label} が JSON ではない` };
	}
}

function loadJson(readFile, path, label) {
	try {
		return readJson(readFile(path), label);
	} catch {
		return { ok: false, error: `${label} を読めない` };
	}
}

/**
 * @param {string[]} argv
 * @param {{ readFile?: (path: string) => string, stdin?: string }} [io]
 */
export function runRevisionSelect(argv, io = {}) {
	const readFile = io.readFile ?? ((path) => readFileSync(path, 'utf8'));
	let file = '';
	let gate = '';
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--file') file = argv[++i] ?? '';
		else if (argv[i] === '--gate') gate = argv[++i] ?? '';
	}
	if (argv.includes('--gate') && !gate) {
		return { exit: 1, stdout: '', stderr: '[revision-select] --gate にはディレクトリが必要\n' };
	}
	if (argv.includes('--file') && !file) {
		return { exit: 1, stdout: '', stderr: '[revision-select] --file にはパスが必要\n' };
	}
	if (file && gate) return { exit: 1, stdout: '', stderr: '[revision-select] --file と --gate は同時に付けない\n' };
	if (gate) {
		const path = join(resolve(gate), 'cycle/revision.json');
		if (!existsSync(path)) {
			return { exit: 0, stdout: '[revision-select] 採点記録は無い\n', stderr: '' };
		}
		const parsed = loadJson(readFile, path, 'cycle/revision.json');
		if (!parsed.ok) return { exit: 1, stdout: '', stderr: `[revision-select] ${parsed.error}\n` };
		const decision = checkRevisionRecord(parsed.value);
		if (!decision.ok) {
			return {
				exit: 1,
				stdout: `${JSON.stringify(decision)}\n`,
				stderr: `[revision-select] ${decision.reason}\n`
			};
		}
		return { exit: 0, stdout: `[revision-select] 保持は ${decision.retained}\n`, stderr: '' };
	}
	const parsed = file ? loadJson(readFile, file, file) : readJson(String(io.stdin ?? ''), 'stdin');
	if (!file && !String(io.stdin ?? '').trim()) {
		return { exit: 1, stdout: '', stderr: '[revision-select] 入力が空\n' };
	}
	if (!parsed.ok) return { exit: 1, stdout: '', stderr: `[revision-select] ${parsed.error}\n` };
	const decision = checkRevisionRecord(parsed.value);
	return {
		exit: decision.ok ? 0 : 1,
		stdout: `${JSON.stringify(decision)}\n`,
		stderr: decision.ok ? '' : `[revision-select] ${decision.reason}\n`
	};
}

function main() {
	const argv = process.argv.slice(2);
	const wantsStdin = !argv.includes('--file') && !argv.includes('--gate');
	const stdin = wantsStdin ? readFileSync(0, 'utf8') : '';
	const result = runRevisionSelect(argv, { stdin });
	if (result.stdout) process.stdout.write(result.stdout);
	if (result.stderr) process.stderr.write(result.stderr);
	process.exit(result.exit);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main();
}
