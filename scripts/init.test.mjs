import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { FRESH_EVENTS, isTemplateOrigin, planInit, runInit, shouldResetAccumulation, stripLearnings } from './init.mjs';

function root() {
	return mkdtempSync(join(tmpdir(), 'init-'));
}

function put(dir, rel, body = '') {
	const path = join(dir, rel);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, body);
}

test('package-lock は npm ci', () => {
	const dir = root();
	put(dir, 'package-lock.json', '{}');
	put(dir, 'package.json', JSON.stringify({ scripts: { dev: 'next dev' } }));
	const plan = planInit(dir);
	assert.deepEqual(plan.installs, [['npm', 'ci']]);
	assert.equal(plan.next, 'npm run dev');
	assert.deepEqual(plan.create, ['AGENTS.md', 'GLOSSARY.md', 'ACTIONS.md']);
	assert.equal(plan.create.includes('design.md'), false);
	assert.equal(plan.create.includes('requirements.md'), false);
	assert.equal(plan.create.includes('tasks.md'), false);
});

test('pnpm-lock だけなら pnpm install と pnpm run dev', () => {
	const dir = root();
	put(dir, 'pnpm-lock.yaml', 'lockfileVersion: 9\n');
	put(dir, 'package.json', JSON.stringify({ scripts: { dev: 'next dev', test: 'vitest' } }));
	const plan = planInit(dir);
	assert.deepEqual(plan.installs, [['pnpm', 'install']]);
	assert.equal(plan.next, 'pnpm run dev');
	assert.equal(plan.prisma, null);
});

test('Node と Python は両方入れる', () => {
	const dir = root();
	put(dir, 'package-lock.json', '{}');
	put(dir, 'pnpm-lock.yaml', 'lockfileVersion: 9\n');
	put(dir, 'requirements.txt', 'fastapi\n');
	put(dir, 'pyproject.toml', '[project]\nname = "app"\n');
	put(dir, 'package.json', JSON.stringify({ scripts: { test: 'vitest' } }));
	const plan = planInit(dir);
	assert.deepEqual(plan.installs, [
		['npm', 'ci'],
		['pnpm', 'install'],
		['python3', '-m', 'pip', 'install', '-r', 'requirements.txt']
	]);
	assert.equal(plan.next, 'npm test');
});

test('pyproject だけなら pip install -e', () => {
	const dir = root();
	put(dir, 'pyproject.toml', '[project]\nname = "app"\n');
	const plan = planInit(dir);
	assert.deepEqual(plan.installs, [['python3', '-m', 'pip', 'install', '-e', '.']]);
	assert.equal(plan.next, null);
});

test('.env.example が無く .env も無いときはコピーしない', () => {
	const dir = root();
	put(dir, 'package-lock.json', '{}');
	assert.equal(planInit(dir).copyEnv, false);
});

test('.env があるときはコピーしない', () => {
	const dir = root();
	put(dir, '.env.example', 'A=1\n');
	put(dir, '.env', 'A=kept\n');
	assert.equal(planInit(dir).copyEnv, false);
});

test('prisma schema があるときだけ generate する', () => {
	const dir = root();
	put(dir, 'package-lock.json', '{}');
	put(dir, 'prisma/schema.prisma', 'generator client {\n  provider = "prisma-client-js"\n}\n');
	assert.deepEqual(planInit(dir).prisma, ['npm', 'exec', 'prisma', 'generate']);
	const pnpm = root();
	put(pnpm, 'pnpm-lock.yaml', 'lockfileVersion: 9\n');
	put(pnpm, 'prisma/schema.prisma', 'generator client {\n  provider = "prisma-client-js"\n}\n');
	assert.deepEqual(planInit(pnpm).prisma, ['pnpm', 'exec', 'prisma', 'generate']);
});

test('ある見出しは作らない', () => {
	const dir = root();
	put(dir, 'AGENTS.md', '残す\n');
	const plan = planInit(dir);
	assert.equal(plan.create.includes('AGENTS.md'), false);
	assert.ok(plan.create.includes('GLOSSARY.md'));
});

test('実行は依存のあとコピーと見出しで、二度目は上書きしない', () => {
	const dir = root();
	put(dir, 'package-lock.json', '{}');
	put(dir, 'package.json', JSON.stringify({ scripts: { dev: 'next dev' } }));
	put(dir, '.env.example', 'A=1\n');
	put(dir, 'AGENTS.md', '残す\n');
	put(dir, 'prisma/schema.prisma', 'generator client {\n  provider = "prisma-client-js"\n}\n');
	const calls = [];
	const first = runInit(dir, {
		spawn(cmd) {
			calls.push(cmd);
			return true;
		}
	});
	assert.equal(first.ok, true);
	assert.deepEqual(calls, [
		['npm', 'ci'],
		['npm', 'exec', 'prisma', 'generate']
	]);
	assert.equal(readFileSync(join(dir, '.env'), 'utf8'), 'A=1\n');
	assert.equal(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), '残す\n');
	assert.match(readFileSync(join(dir, 'GLOSSARY.md'), 'utf8'), /## Object type/);
	const actions = readFileSync(join(dir, 'ACTIONS.md'), 'utf8');
	assert.match(actions, /### Submission criteria/);
	assert.match(actions, /## Function/);
	assert.match(actions, /提出前に基準を満たさない/);
	assert.match(actions, /書き戻しが失敗/);
	assert.match(actions, /副作用だけが失敗/);
	assert.equal(existsSync(join(dir, 'design.md')), false);
	assert.equal(existsSync(join(dir, 'knowledge/features')), false);
	assert.equal(existsSync(join(dir, 'knowledge/decisions')), false);
	assert.ok(first.lines.some((line) => line.includes('GLOSSARY.md')));
	assert.ok(first.lines.some((line) => line.includes('npm run dev')));
	const glossary = readFileSync(join(dir, 'GLOSSARY.md'), 'utf8');

	const again = runInit(dir, {
		spawn() {
			return true;
		}
	});
	assert.equal(again.created.length, 0);
	assert.equal(again.copied, false);
	assert.equal(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), '残す\n');
	assert.equal(readFileSync(join(dir, 'GLOSSARY.md'), 'utf8'), glossary);
});

test('依存コマンドが失敗したら ok は false で見出しを書かない', () => {
	const dir = root();
	put(dir, 'package-lock.json', '{}');
	const result = runInit(dir, {
		spawn() {
			return false;
		}
	});
	assert.equal(result.ok, false);
	assert.equal(existsSync(join(dir, 'GLOSSARY.md')), false);
});

test('このハーネスでは依存も見出しも足さない', () => {
	const dir = root();
	put(dir, 'policy/canon.rego', 'package harness.canon\n');
	put(dir, 'package.json', JSON.stringify({ name: 'marumo-cloud' }));
	put(dir, 'pnpm-lock.yaml', 'lockfileVersion: 9\n');
	const calls = [];
	const result = runInit(dir, {
		spawn(cmd) {
			calls.push(cmd);
			return true;
		}
	});
	assert.equal(result.ok, true);
	assert.deepEqual(calls, []);
	assert.equal(existsSync(join(dir, 'GLOSSARY.md')), false);
	assert.ok(result.lines.some((line) => line.includes('pnpm install')));
});

const DIARY = `# learnings.md

ハーネスの実行日記だけを書く（[[0039]]）。

---

## 2026-09-11 — 古い日記

本文
`;

test('テンプレートの remote では cycle と docs を消さない', () => {
	const dir = root();
	put(dir, 'policy/canon.rego', 'package harness.canon\n');
	put(dir, 'package.json', JSON.stringify({ name: 'marumo-cloud' }));
	put(dir, 'cycle/events.jsonl', `${FRESH_EVENTS}{"type":"node_state"}\n`);
	put(dir, 'cycle/packets/C-0024.json', '{}\n');
	put(dir, 'docs/learnings.md', DIARY);
	put(dir, 'docs/software-factory-survey.md', '調査\n');
	const result = runInit(dir, {
		product: true,
		origin: 'https://github.com/marumo333/marumo333-cloud'
	});
	assert.equal(result.ok, true);
	assert.match(readFileSync(join(dir, 'cycle/events.jsonl'), 'utf8'), /node_state/);
	assert.equal(readFileSync(join(dir, 'cycle/packets/C-0024.json'), 'utf8'), '{}\n');
	assert.match(readFileSync(join(dir, 'docs/learnings.md'), 'utf8'), /古い日記/);
	assert.equal(readFileSync(join(dir, 'docs/software-factory-survey.md'), 'utf8'), '調査\n');
	assert.ok(result.lines.some((line) => line.includes('テンプレートの蓄積は残す')));
	assert.equal(isTemplateOrigin('https://x-access-token:secret@github.com/marumo333/marumo333-cloud'), true);
	assert.equal(shouldResetAccumulation({ product: true, origin: '', harness: true }), false);
});

test('プロダクトの remote は cycle と docs を空の周に戻す', () => {
	const dir = root();
	put(dir, 'policy/canon.rego', 'package harness.canon\n');
	put(dir, 'package.json', JSON.stringify({ name: 'marumo-cloud' }));
	put(dir, 'cycle/events.jsonl', `${FRESH_EVENTS}{"type":"node_state","cycle":"C-0024"}\n`);
	put(dir, 'cycle/required-cycle.json', '残す\n');
	put(dir, 'cycle/model-routing.yaml', '残す\n');
	put(dir, 'cycle/code-quality.yaml', '残す\n');
	put(dir, 'cycle/packets/.gitkeep', '');
	put(dir, 'cycle/packets/C-0024.json', '{}\n');
	put(dir, 'cycle/stray.log', '消す\n');
	put(dir, 'docs/learnings.md', DIARY);
	put(dir, 'docs/decisions/0039-harness-template-cycle-graph.md', '残す\n');
	put(dir, 'docs/multi-agent-and-pins.md', '席\n');
	put(dir, 'docs/architecture/host.gif', 'GIF');
	put(dir, 'docs/software-factory-survey.md', '調査\n');
	put(dir, 'docs/behavior-ontology-design.md', '設計\n');
	const result = runInit(dir, {
		product: true,
		origin: 'https://github.com/example/product'
	});
	assert.equal(result.ok, true);
	assert.equal(readFileSync(join(dir, 'cycle/events.jsonl'), 'utf8'), FRESH_EVENTS);
	assert.equal(readFileSync(join(dir, 'cycle/required-cycle.json'), 'utf8'), '残す\n');
	assert.equal(readFileSync(join(dir, 'cycle/model-routing.yaml'), 'utf8'), '残す\n');
	assert.equal(readFileSync(join(dir, 'cycle/code-quality.yaml'), 'utf8'), '残す\n');
	assert.equal(existsSync(join(dir, 'cycle/packets/.gitkeep')), true);
	assert.equal(existsSync(join(dir, 'cycle/packets/C-0024.json')), false);
	assert.equal(existsSync(join(dir, 'cycle/stray.log')), false);
	const learnings = readFileSync(join(dir, 'docs/learnings.md'), 'utf8');
	assert.match(learnings, /実行日記だけを書く/);
	assert.equal(learnings.includes('古い日記'), false);
	assert.equal(readFileSync(join(dir, 'docs/decisions/0039-harness-template-cycle-graph.md'), 'utf8'), '残す\n');
	assert.equal(readFileSync(join(dir, 'docs/multi-agent-and-pins.md'), 'utf8'), '席\n');
	assert.equal(existsSync(join(dir, 'docs/architecture/host.gif')), false);
	assert.equal(existsSync(join(dir, 'docs/architecture')), false);
	assert.equal(existsSync(join(dir, 'docs/software-factory-survey.md')), false);
	assert.equal(existsSync(join(dir, 'docs/behavior-ontology-design.md')), false);
	assert.ok(result.lines.some((line) => line.includes('蓄積を初期化: cycle/, docs/')));
	const again = runInit(dir, { product: true, origin: 'https://github.com/example/product' });
	assert.ok(again.lines.some((line) => line.includes('蓄積は既に空の周')));
	assert.equal(stripLearnings(learnings), learnings);
});
