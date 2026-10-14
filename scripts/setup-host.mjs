#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { resolve } from 'node:path';
import { runSetup } from './lib/setup-host.mjs';

const rootFlag = process.argv.indexOf('--root');
const root = rootFlag >= 0 ? resolve(process.argv[rootFlag + 1]) : process.cwd();
const force = process.argv.includes('--force');

let rl;
const io = {
	async question(text) {
		rl ??= createInterface({ input: process.stdin, output: process.stdout });
		return rl.question(text);
	},
};

try {
	const result = await runSetup({
		root,
		env: process.env,
		tty: Boolean(process.stdin.isTTY),
		io,
		force,
	});
	if (result.status === 'skip') process.exit(0);
	const lines = [`記録した: ${result.choice.provider} / ${result.choice.model}`, '共有の yaml には書かない。'];
	if (result.claude === 'wrote') lines.push('.claude/settings.local.json の model を更新した。');
	if (result.codex === 'wrote') lines.push('.codex/config.toml の model を更新した。');
	if (result.codex === 'skipped-existing') lines.push('.codex/config.toml は既存なのでモデルは書かなかった。');
	if (result.choice.provider === 'cursor') lines.push('Cursor のモデルはアプリのモデル選択が使う。');
	console.log(lines.join('\n'));
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
} finally {
	rl?.close();
}
