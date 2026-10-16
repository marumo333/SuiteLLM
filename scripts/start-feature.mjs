#!/usr/bin/env node
/** 機能の作業を始める。振る舞いと作業だけを作り、既存ファイルは上書きしない。 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { planInit } from './init.mjs';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const BEHAVIOR_TEST_MARKER =
	"assert.fail('WHEN / THE SYSTEM SHALL を実装するテストに置き換える')";
const READY = ['AGENTS.md', 'docs/GLOSSARY.md', 'ACTIONS.md'];

function requirements(slug) {
	return `# ${slug}\n\nWHEN \nTHE SYSTEM SHALL \n`;
}

function tasks(slug) {
	return `# ${slug}\n\n- [ ] 振る舞いを requirements.md に書く\n- [ ] ${slug}.test.mjs の失敗を、その振る舞いのテストに置き換える\n- [ ] テストが通るまで実装する\n`;
}

function behaviorTest(slug) {
	return `import { test } from 'node:test';\nimport assert from 'node:assert/strict';\n\ntest('${slug}', () => {\n\t${BEHAVIOR_TEST_MARKER};\n});\n`;
}

function designDoc(slug) {
	return `# ${slug}\n\n## 構成\n\n## データの流れ\n\n## 失敗時に残るもの\n\n1. 提出前に基準を満たさないとき、状態は変わらない。\n2. 書き戻しが失敗したとき、状態は変わらない。\n3. 状態が変わったあと、副作用だけが失敗することがある。\n`;
}

/**
 * @param {string} root
 * @param {{ slug?: string, design?: boolean }} [opts]
 */
export function runStartFeature(root, opts = {}) {
	const slug = opts.slug ?? '';
	const design = opts.design === true;
	if (planInit(root).kind === 'harness') {
		return {
			ok: false,
			created: [],
			lines: ['[start-feature] このハーネスでは機能ファイルを作らない']
		};
	}
	if (!SLUG.test(slug)) {
		return {
			ok: false,
			created: [],
			lines: ['[start-feature] slug は小文字と数字とハイフンだけ']
		};
	}
	if (READY.some((name) => !existsSync(join(root, name)))) {
		return {
			ok: false,
			created: [],
			lines: ['[start-feature] 先に node scripts/init.mjs を叩く']
		};
	}
	/** @type {[string, string][]} */
	const files = [
		['requirements.md', requirements(slug)],
		['tasks.md', tasks(slug)],
		[`${slug}.test.mjs`, behaviorTest(slug)]
	];
	if (design) files.push(['design.md', designDoc(slug)]);
	/** @type {string[]} */
	const created = [];
	for (const [name, body] of files) {
		const rel = `features/${slug}/${name}`;
		const path = join(root, rel);
		if (existsSync(path)) continue;
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, body);
		created.push(rel);
	}
	const lines = created.length
		? [`[start-feature] 作成: ${created.join(', ')}`]
		: ['[start-feature] 既存のまま'];
	return { ok: true, created, lines };
}

function main() {
	const argv = process.argv.slice(2);
	let design = false;
	let cwd = '';
	/** @type {string[]} */
	const positional = [];
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--design') design = true;
		else if (argv[i] === '--cwd') cwd = argv[++i] ?? '';
		else positional.push(argv[i]);
	}
	if (argv.includes('--cwd') && !cwd) {
		console.error('[start-feature] --cwd にはディレクトリが必要');
		process.exit(1);
	}
	const result = runStartFeature(resolve(cwd || process.cwd()), {
		slug: positional[0] ?? '',
		design
	});
	for (const line of result.lines) console.log(line);
	process.exit(result.ok ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main();
}
