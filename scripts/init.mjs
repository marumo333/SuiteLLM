#!/usr/bin/env node
/** clone の次に一度叩く。既存ファイルは上書きしない。 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SCAFFOLD = {
	'AGENTS.md': '# 作業合意\n\n短い合意だけを書く。\n',
	'docs/GLOSSARY.md': `# 名詞

用語はここだけに書く。ここに無い名前を、コードと文書で新しく作らない。

## 用語

| 用語 | 意味 |
| --- | --- |

## Object type

## Property

## Link type
`,
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

const HEADINGS = ['AGENTS.md', 'docs/GLOSSARY.md', 'ACTIONS.md'];

export const FRESH_EVENTS =
	'{"t":"2026-08-14T00:00:00Z","type":"cycle_open","cycle":"C-0001","source":"template"}\n';

const TEMPLATE_ORIGIN = /marumo333\/(?:marumo333-cloud|cursor-harness)(?:\.git)?$/;

export function isTemplateOrigin(origin) {
	return typeof origin === 'string' && TEMPLATE_ORIGIN.test(origin.trim());
}

/** プロダクトの remote だけ蓄積を空に戻す。テンプレートの履歴は残す。 */
export function shouldResetAccumulation({ product, origin, harness }) {
	if (!product) return false;
	if (isTemplateOrigin(origin)) return false;
	if (harness && !String(origin ?? '').trim()) return false;
	return true;
}

export function stripLearnings(text) {
	const idx = text.search(/\n## 20\d{2}-/);
	const head = idx < 0 ? text : text.slice(0, idx).replace(/\n---\s*$/, '\n');
	return head.endsWith('\n') ? head : `${head}\n`;
}

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

const CYCLE_KEEP = new Set(['required-cycle.json', 'model-routing.yaml', 'code-quality.yaml', 'events.jsonl']);
const DOCS_KEEP = new Set(['learnings.md', 'multi-agent-and-pins.md', 'GLOSSARY.md']);

function relPath(root, abs) {
	return relative(root, abs).split('\\').join('/');
}

function listFiles(dir) {
	/** @type {string[]} */
	const out = [];
	if (!existsSync(dir)) return out;
	/** @type {string[]} */
	const stack = [dir];
	while (stack.length) {
		const current = stack.pop();
		let st;
		try {
			st = lstatSync(current);
		} catch {
			continue;
		}
		if (st.isSymbolicLink() || !st.isDirectory()) continue;
		for (const ent of readdirSync(current, { withFileTypes: true })) {
			const abs = join(current, ent.name);
			if (ent.isSymbolicLink()) continue;
			if (ent.isDirectory()) stack.push(abs);
			else if (ent.isFile()) out.push(abs);
		}
	}
	return out;
}

function pruneEmpty(dir, stop) {
	let st;
	try {
		st = lstatSync(dir);
	} catch {
		return;
	}
	if (st.isSymbolicLink() || !st.isDirectory()) return;
	for (const name of readdirSync(dir)) {
		pruneEmpty(join(dir, name), stop);
	}
	if (dir !== stop && readdirSync(dir).length === 0) rmSync(dir, { recursive: true });
}

function resetAccumulation(root) {
	/** @type {string[]} */
	const touched = [];
	const cycleDir = join(root, 'cycle');
	if (existsSync(cycleDir)) {
		for (const abs of listFiles(cycleDir)) {
			const rel = relPath(root, abs);
			const inside = rel.slice('cycle/'.length);
			if (inside === 'packets/.gitkeep' || CYCLE_KEEP.has(inside)) continue;
			rmSync(abs);
			touched.push(rel);
		}
		pruneEmpty(cycleDir, cycleDir);
		const eventsPath = join(cycleDir, 'events.jsonl');
		if (!existsSync(eventsPath)) {
			writeFileSync(eventsPath, FRESH_EVENTS);
			touched.push('cycle/events.jsonl');
		} else if (readFileSync(eventsPath, 'utf8') !== FRESH_EVENTS) {
			writeFileSync(eventsPath, FRESH_EVENTS);
			touched.push('cycle/events.jsonl');
		}
	}
	const docsDir = join(root, 'docs');
	if (existsSync(docsDir)) {
		for (const abs of listFiles(docsDir)) {
			const rel = relPath(root, abs);
			const inside = rel.slice('docs/'.length);
			if (inside.startsWith('decisions/') || DOCS_KEEP.has(inside)) continue;
			rmSync(abs);
			touched.push(rel);
		}
		pruneEmpty(docsDir, docsDir);
		const learnPath = join(docsDir, 'learnings.md');
		if (existsSync(learnPath)) {
			const current = readFileSync(learnPath, 'utf8');
			const next = stripLearnings(current);
			if (next !== current) {
				writeFileSync(learnPath, next);
				touched.push('docs/learnings.md');
			}
		}
	}
	const glossary = join(root, 'docs/GLOSSARY.md');
	if (!existsSync(glossary)) {
		mkdirSync(dirname(glossary), { recursive: true });
		writeFileSync(glossary, SCAFFOLD['docs/GLOSSARY.md']);
		touched.push('docs/GLOSSARY.md');
	}
	return touched;
}

function accumulationLines(reset, touched) {
	if (!reset) return ['[init] テンプレートの蓄積は残す'];
	const folders = [...new Set(touched.map((path) => (path.startsWith('cycle/') ? 'cycle/' : path.startsWith('docs/') ? 'docs/' : path)))].sort();
	if (folders.length === 0) return ['[init] 蓄積は既に空の周'];
	return [`[init] 蓄積を初期化: ${folders.join(', ')}`];
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
function readOrigin(root) {
	const ran = spawnSync('git', ['-C', root, 'remote', 'get-url', 'origin'], { encoding: 'utf8' });
	if (ran.status !== 0) return '';
	return String(ran.stdout ?? '').trim();
}

export function runInit(root, opts = {}) {
	const spawn = opts.spawn ?? defaultSpawn;
	const plan = planInit(root);
	const product = opts.product === true;
	const origin = product ? (opts.origin === undefined ? readOrigin(root) : opts.origin) : '';
	const reset = shouldResetAccumulation({ product, origin, harness: plan.kind === 'harness' });
	const touched = reset ? resetAccumulation(root) : [];
	const extra = product ? accumulationLines(reset, touched) : [];
	if (plan.kind === 'harness') {
		return { ok: true, lines: [...linesFor(plan, [], false), ...extra], created: [], copied: false, reset: touched };
	}
	for (const cmd of plan.installs) {
		if (!spawn(cmd, root)) {
			return { ok: false, lines: [...linesFor(plan, [], false), ...extra], created: [], copied: false, reset: touched };
		}
	}
	let copied = false;
	if (plan.copyEnv && !exists(root, '.env')) {
		copyFileSync(join(root, '.env.example'), join(root, '.env'));
		copied = true;
	}
	if (plan.prisma && !spawn(plan.prisma, root)) {
		return { ok: false, lines: [...linesFor(plan, [], copied), ...extra], created: [], copied, reset: touched };
	}
	/** @type {string[]} */
	const created = [];
	for (const name of plan.create) {
		const path = join(root, name);
		if (existsSync(path)) continue;
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, SCAFFOLD[name]);
		created.push(name);
	}
	return { ok: true, lines: [...linesFor(plan, created, copied), ...extra], created, copied, reset: touched };
}

function main() {
	const cwdFlag = process.argv.indexOf('--cwd');
	const cwdArg = cwdFlag >= 0 ? process.argv[cwdFlag + 1] : '';
	if (cwdFlag >= 0 && !cwdArg) {
		console.error('[init] --cwd にはディレクトリが必要');
		process.exit(1);
	}
	const root = resolve(cwdArg || process.cwd());
	const result = runInit(root, { product: process.argv.includes('--product') });
	for (const line of result.lines) console.log(line);
	process.exit(result.ok ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main();
}
