import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const MIT = [
	'MIT License',
	'',
	'Copyright (c) 2026 marumo333',
	'',
	'Permission is hereby granted, free of charge, to any person obtaining a copy',
	'of this software and associated documentation files (the "Software"), to deal',
	'in the Software without restriction, including without limitation the rights',
	'to use, copy, modify, merge, publish, distribute, sublicense, and/or sell',
	'copies of the Software, and to permit persons to whom the Software is',
	'furnished to do so, subject to the following conditions:',
	'',
	'The above copyright notice and this permission notice shall be included in all',
	'copies or substantial portions of the Software.',
	'',
	'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR',
	'IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,',
	'FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE',
	'AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER',
	'LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,',
	'OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE',
	'SOFTWARE.',
	''
].join('\n');

test('LICENSE は OSI MIT 全文と一致する', () => {
	const p = join(ROOT, 'LICENSE');
	assert.equal(existsSync(p), true, 'ルートに LICENSE が必要');
	assert.equal(readFileSync(p, 'utf8'), MIT);
});

test('package.json の license は MIT である', () => {
	const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
	assert.equal(pkg.license, 'MIT');
});

test('README はアーキテクチャ概要の画像だけを示し、mermaid は docs に置く', () => {
	const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
	assert.match(readme, /### 監査/);
	assert.match(readme, /token効率化/);
	assert.match(readme, /### 再起的自己改善/);
	assert.doesNotMatch(readme, /ソフトウェア工場/);
	assert.doesNotMatch(readme, /工場長/);
	assert.doesNotMatch(readme, /治具/);
	assert.doesNotMatch(readme, /工場フロア/);
	assert.doesNotMatch(readme, /抜き取り/);
	assert.doesNotMatch(readme, /工程カード/);
	assert.doesNotMatch(readme, /正本倉庫/);
	assert.doesNotMatch(readme, /出荷/);
	assert.doesNotMatch(readme, /原料/);
	assert.match(readme, /docs\/architecture\/review-overview\.gif/);
	assert.match(readme, /docs\/architecture\/audit-overview\.gif/);
	assert.match(readme, /docs\/architecture\/runtime-overview\.gif/);
	assert.match(readme, /docs\/architecture\/self-improve-flow\.gif/);
	assert.doesNotMatch(readme, /docs\/architecture\/review-overview\.png/);
	assert.doesNotMatch(readme, /docs\/architecture\/audit-overview\.png/);
	assert.doesNotMatch(readme, /docs\/architecture\/runtime-overview\.png/);
	assert.doesNotMatch(readme, /docs\/architecture\/self-improve-flow\.png/);
	assert.match(readme, /docs\/architecture\/review-overview\.mmd/);
	assert.doesNotMatch(readme, /```mermaid/);
	assert.doesNotMatch(readme, /下記 mermaid/);
	assert.doesNotMatch(readme, /self-improve-overview\.png/);
	assert.doesNotMatch(readme, /model-review\.png/);
	assert.doesNotMatch(readme, /イラスト/);
	assert.doesNotMatch(readme, /欠落 PNG/);
	assert.doesNotMatch(readme, /Feature proposed/);
	assert.doesNotMatch(readme, /Feature YAML/);
	assert.doesNotMatch(readme, /次 Feature/);
	assert.doesNotMatch(readme, /harness-grow/);
	const sources = [
		'docs/architecture/review-overview.mmd',
		'docs/architecture/audit-overview.mmd',
		'docs/architecture/runtime-overview.mmd',
		'docs/architecture/self-improve-flow.mmd'
	].map((rel) => readFileSync(join(ROOT, rel), 'utf8'));
	assert.equal(sources.length, 4);
	for (const fence of sources) {
		assert.doesNotMatch(fence, /Feature proposed/);
		assert.doesNotMatch(fence, /Feature YAML/);
		assert.doesNotMatch(fence, /次 Feature/);
		assert.doesNotMatch(fence, /admitted/);
		assert.doesNotMatch(fence, /harness-grow/);
		assert.doesNotMatch(fence, /FG --> warehouse/);
		assert.doesNotMatch(fence, /Gate --> Feat/);
		assert.doesNotMatch(fence, /HK --> AR/);
		assert.doesNotMatch(fence, /HG --> CanonOut/);
	}
	assert.ok(
		sources.some((b) => /直す/.test(b) && /検討/.test(b) && /記録/.test(b) && /却下/.test(b) && /tsc --noEmit/.test(b) && /OPA判定/.test(b) && !/被覆/.test(b)),
		'モデル図は4分類と noEmit と OPA判定を含む'
	);
	assert.ok(
		sources.some(
			(b) =>
				/監査/.test(b) &&
				/token効率化/.test(b) &&
				/契約と feature-gate/.test(b) &&
				/HM --> warehouse/.test(b) &&
				!/AR --> VR/.test(b)
		),
		'監査図は契約と人間マージを含み、レビュー周の辺を含まない'
	);
	assert.ok(
		sources.some(
			(b) =>
				/検証は親。重なるファイルも親/.test(b) &&
				/重ならないスライスは grok-4\.7-high/.test(b) &&
				/IMP --> Hook/.test(b) &&
				/判定のみ/.test(b) &&
				/cycle-record/.test(b) &&
				/Rec --> Packet/.test(b) &&
				!/Gate -.->\|"判定のみ"\| Packet/.test(b)
		),
		'ランタイム図は feature-gate を判定のみにし、packet deny は cycle-record が評価する'
	);
	assert.doesNotMatch(readme, /canon 変更のゲート/);
	assert.equal(sources.some((b) => /CT --> FG/.test(b)), false);
	assert.ok(
		sources.some((b) => /cycle-after-merge/.test(b) && /エージェントは自動起動しない/.test(b) && /次の cycle/.test(b) && /Feature 票は作らない/.test(b)),
		'自己改善図は cycle-after-merge と次の cycle と自動起動しないを含む'
	);
	assert.ok(sources.some((b) => /features\/slug/.test(b) && /docs\/decisions/.test(b)), '正本のラベルは features/slug と docs/decisions');
});
