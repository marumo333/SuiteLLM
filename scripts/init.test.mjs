import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { planInit, runInit } from './init.mjs';

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
