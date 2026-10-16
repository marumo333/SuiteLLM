import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { runCheckBehavior } from './check-behavior.mjs';
import { runStartFeature } from './start-feature.mjs';

function root() {
	return mkdtempSync(join(tmpdir(), 'check-'));
}

function put(dir, rel, body = '') {
	const path = join(dir, rel);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, body);
}

const ACTIONS = `# 動詞

### Submission criteria

提出前に基準を満たさないとき、状態は変わらない。

### Ontology edits

書き戻しが失敗したとき、状態は変わらない。

### Side effects

状態が変わったあと、副作用だけが失敗することがある。
`;

function ready(dir) {
	put(dir, 'AGENTS.md', '# 作業合意\n');
	put(dir, 'docs/GLOSSARY.md', '# 名詞\n\n## Object type\n');
	put(dir, 'ACTIONS.md', ACTIONS);
}

test('機能ディレクトリが無いときは成功する', () => {
	const dir = root();
	const result = runCheckBehavior(dir);
	assert.equal(result.ok, true);
	assert.ok(result.lines.some((line) => line.includes('機能は無い')));
});

test('空の振る舞いと置き換え前のテストは失敗する', () => {
	const dir = root();
	ready(dir);
	runStartFeature(dir, { slug: 'checkout' });
	const result = runCheckBehavior(dir);
	assert.equal(result.ok, false);
	assert.ok(result.lines.some((line) => line.includes('振る舞いが空')));
});

test('振る舞いを書きテストを置き換えると成功する', () => {
	const dir = root();
	ready(dir);
	runStartFeature(dir, { slug: 'checkout' });
	put(
		dir,
		'features/checkout/requirements.md',
		'# checkout\n\nWHEN 入力が不正\nTHE SYSTEM SHALL 状態を変えない\n'
	);
	put(
		dir,
		'features/checkout/checkout.test.mjs',
		"import { test } from 'node:test';\nimport assert from 'node:assert/strict';\n\ntest('checkout', () => {\n\tassert.equal(1, 1);\n});\n"
	);
	const result = runCheckBehavior(dir);
	assert.equal(result.ok, true, result.lines.join('\n'));
});

test('Given When Then も振る舞いとして認める', () => {
	const dir = root();
	ready(dir);
	put(dir, 'features/pay/requirements.md', '# pay\n\nGiven 在庫がある\nWhen 注文する\nThen 在庫が減る\n');
	put(
		dir,
		'features/pay/pay.test.mjs',
		"import { test } from 'node:test';\ntest('pay', () => {});\n"
	);
	const result = runCheckBehavior(dir);
	assert.equal(result.ok, true, result.lines.join('\n'));
});

test('動詞の3つの失敗が無いと失敗する', () => {
	const dir = root();
	ready(dir);
	put(dir, 'ACTIONS.md', '# 動詞\n');
	put(
		dir,
		'features/checkout/requirements.md',
		'# checkout\n\nWHEN 入力が不正\nTHE SYSTEM SHALL 状態を変えない\n'
	);
	put(dir, 'features/checkout/checkout.test.mjs', 'test(() => {});\n');
	const result = runCheckBehavior(dir);
	assert.equal(result.ok, false);
	assert.ok(result.lines.some((line) => line.includes('ACTIONS.md')));
});

test('テストファイルが無いと失敗する', () => {
	const dir = root();
	ready(dir);
	put(
		dir,
		'features/checkout/requirements.md',
		'# checkout\n\nWHEN 入力が不正\nTHE SYSTEM SHALL 状態を変えない\n'
	);
	const result = runCheckBehavior(dir);
	assert.equal(result.ok, false);
	assert.ok(result.lines.some((line) => line.includes('テストが無い')));
});
