import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { runStartFeature } from './start-feature.mjs';

function root() {
	return mkdtempSync(join(tmpdir(), 'feat-'));
}

function put(dir, rel, body = '') {
	const path = join(dir, rel);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, body);
}

function ready(dir) {
	put(dir, 'AGENTS.md', '# 作業合意\n');
	put(dir, 'docs/GLOSSARY.md', '# 名詞\n');
	put(dir, 'ACTIONS.md', '# 動詞\n');
}

test('見出しが無いときは機能ファイルを作らない', () => {
	const dir = root();
	const result = runStartFeature(dir, { slug: 'checkout' });
	assert.equal(result.ok, false);
	assert.equal(existsSync(join(dir, 'features/checkout/requirements.md')), false);
	assert.ok(result.lines.some((line) => line.includes('init.mjs')));
});

test('slug の振る舞いと作業だけを作り、design は作らない', () => {
	const dir = root();
	ready(dir);
	const result = runStartFeature(dir, { slug: 'checkout' });
	assert.equal(result.ok, true);
	const req = readFileSync(join(dir, 'features/checkout/requirements.md'), 'utf8');
	const tasks = readFileSync(join(dir, 'features/checkout/tasks.md'), 'utf8');
	assert.match(req, /WHEN/);
	assert.match(req, /THE SYSTEM SHALL/);
	assert.match(tasks, /- \[ \] /);
	assert.equal(existsSync(join(dir, 'features/checkout/design.md')), false);
	assert.equal(existsSync(join(dir, 'knowledge/features')), false);
	assert.equal(existsSync(join(dir, 'knowledge/decisions')), false);
	assert.deepEqual(result.created, [
		'features/checkout/requirements.md',
		'features/checkout/tasks.md',
		'features/checkout/checkout.test.mjs'
	]);
	assert.match(readFileSync(join(dir, 'features/checkout/checkout.test.mjs'), 'utf8'), /assert\.fail/);
});

test('--design のときだけ構成と失敗時に残るものを書く', () => {
	const dir = root();
	ready(dir);
	const result = runStartFeature(dir, { slug: 'checkout', design: true });
	assert.equal(result.ok, true);
	const design = readFileSync(join(dir, 'features/checkout/design.md'), 'utf8');
	assert.match(design, /## 構成/);
	assert.match(design, /## データの流れ/);
	assert.match(design, /状態は変わらない/);
	assert.match(design, /副作用だけが失敗/);
});

test('二度目は書いた振る舞いを上書きしない', () => {
	const dir = root();
	ready(dir);
	runStartFeature(dir, { slug: 'checkout' });
	writeFileSync(join(dir, 'features/checkout/requirements.md'), '残す\n');
	const again = runStartFeature(dir, { slug: 'checkout', design: true });
	assert.equal(again.ok, true);
	assert.equal(readFileSync(join(dir, 'features/checkout/requirements.md'), 'utf8'), '残す\n');
	assert.deepEqual(again.created, ['features/checkout/design.md']);
});

test('スラッグが空や経路なら拒否する', () => {
	const dir = root();
	ready(dir);
	for (const slug of ['', '..', 'Checkout', 'a/b', 'a b']) {
		const result = runStartFeature(dir, { slug });
		assert.equal(result.ok, false, slug);
	}
	assert.equal(existsSync(join(dir, 'features')), false);
});

test('このハーネスでは機能ファイルを作らない', () => {
	const dir = root();
	put(dir, 'policy/canon.rego', 'package harness.canon\n');
	put(dir, 'package.json', JSON.stringify({ name: 'marumo-cloud' }));
	ready(dir);
	const result = runStartFeature(dir, { slug: 'checkout' });
	assert.equal(result.ok, false);
	assert.equal(existsSync(join(dir, 'features/checkout/requirements.md')), false);
	assert.ok(result.lines.some((line) => line.includes('ハーネス')));
});
