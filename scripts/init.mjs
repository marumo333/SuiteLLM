#!/usr/bin/env node
/** clone の次に一度叩く。既存ファイルは上書きしない。 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SCAFFOLD = {
	'AGENTS.md': '# 作業合意\n\n短い合意だけを書く。\n',
	'GLOSSARY.md': '# 名詞\n\n## Object type\n\n## Property\n\n## Link type\n',
	'ACTIONS.md': `# 動詞

## Action type

### Parameters

### Submission criteria

提出前に基準を満たさないとき、状態は変わらない。

### Ontology edits

書き戻しが失敗したとき、状態は変わらない。

### Side effects

状態が変わったあと、副作用だけが失敗することがある。

## Function
`
};

const HEADINGS = ['AGENTS.md', 'GLOSSARY.md', 'ACTIONS.md'];

function exists(root, rel) {
	return existsSync(join(root, rel));
}

function readPkg(root) {
	const path = join(root, 'package.json');
	if (!existsSync(path)) return null;
	try {
		return JSON.parse(readFileSync(path, 'utf8'));
	} catch {
		return null;
	}
}

function isHarness(root) {
	const pkg = readPkg(root);
	return pkg?.name === 'marumo-cloud' && exists(root, 'policy/canon.rego');
}

function nextCommand(pkg, runner) {
	if (!runner || !pkg?.scripts) return null;
	if (pkg.scripts.dev) return `${runner} run dev`;
	if (pkg.scripts.test) return runner === 'npm' ? 'npm test' : 'pnpm test';
	return null;
}

/**
 * @param {string} root
 */
export function planInit(root) {
	if (isHarness(root)) {
		return {
			kind: 'harness',
			installs: [],
			copyEnv: false,
			prisma: null,
			create: [],
			next: 'pnpm install'
		};
	}
	const npm = exists(root, 'package-lock.json');
	const pnpm = exists(root, 'pnpm-lock.yaml');
	/** @type {string[][]} */
	const installs = [];
	if (npm) installs.push(['npm', 'ci']);
	if (pnpm) installs.push(['pnpm', 'install']);
	if (exists(root, 'requirements.txt')) {
		installs.push(['python3', '-m', 'pip', 'install', '-r', 'requirements.txt']);
	} else if (exists(root, 'pyproject.toml')) {
		installs.push(['python3', '-m', 'pip', 'install', '-e', '.']);
	}
	const runner = npm ? 'npm' : pnpm ? 'pnpm' : null;
	const prisma = exists(root, 'prisma/schema.prisma')
		? runner === 'pnpm'
			? ['pnpm', 'exec', 'prisma', 'generate']
			: ['npm', 'exec', 'prisma', 'generate']
		: null;
	return {
		kind: 'app',
		installs,
		copyEnv: exists(root, '.env.example') && !exists(root, '.env'),
		prisma,
		create: HEADINGS.filter((name) => !exists(root, name)),
		next: nextCommand(readPkg(root), runner)
	};
}

function linesFor(plan, created, copied) {
	if (plan.kind === 'harness') {
		return ['[init] このハーネスの clone 後は pnpm install'];
	}
	/** @type {string[]} */
	const lines = [];
	if (plan.installs.length) {
		lines.push(`[init] 依存: ${plan.installs.map((cmd) => cmd.join(' ')).join(', ')}`);
	}
	if (copied) lines.push('[init] コピー: .env.example -> .env');
	if (created.length) lines.push(`[init] 作成: ${created.join(', ')}`);
	lines.push(`[init] 次: ${plan.next ?? '無し'}`);
	return lines;
}

function defaultSpawn(cmd, cwd) {
	const [bin, ...args] = cmd;
	const ran = spawnSync(bin, args, { cwd, stdio: 'inherit' });
	return ran.status === 0;
}

/**
 * @param {string} root
 * @param {{ spawn?: (cmd: string[], cwd: string) => boolean }} [opts]
 */
export function runInit(root, opts = {}) {
	const spawn = opts.spawn ?? defaultSpawn;
	const plan = planInit(root);
	if (plan.kind === 'harness') {
		return { ok: true, lines: linesFor(plan, [], false), created: [], copied: false };
	}
	for (const cmd of plan.installs) {
		if (!spawn(cmd, root)) {
			return { ok: false, lines: linesFor(plan, [], false), created: [], copied: false };
		}
	}
	let copied = false;
	if (plan.copyEnv && !exists(root, '.env')) {
		copyFileSync(join(root, '.env.example'), join(root, '.env'));
		copied = true;
	}
	if (plan.prisma && !spawn(plan.prisma, root)) {
		return { ok: false, lines: linesFor(plan, [], copied), created: [], copied };
	}
	/** @type {string[]} */
	const created = [];
	for (const name of plan.create) {
		const path = join(root, name);
		if (existsSync(path)) continue;
		writeFileSync(path, SCAFFOLD[name]);
		created.push(name);
	}
	return { ok: true, lines: linesFor(plan, created, copied), created, copied };
}

function main() {
	const cwdFlag = process.argv.indexOf('--cwd');
	const cwdArg = cwdFlag >= 0 ? process.argv[cwdFlag + 1] : '';
	if (cwdFlag >= 0 && !cwdArg) {
		console.error('[init] --cwd にはディレクトリが必要');
		process.exit(1);
	}
	const root = resolve(cwdArg || process.cwd());
	const result = runInit(root);
	for (const line of result.lines) console.log(line);
	process.exit(result.ok ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main();
}
