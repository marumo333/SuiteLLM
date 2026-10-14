import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyChoice, normalizeChoice, readChoice, runSetup, shouldAsk } from './lib/setup-host.mjs';

function scripted(answers) {
	const rest = [...answers];
	return {
		async question() {
			const next = rest.shift();
			if (next === undefined) throw new Error('質問が多すぎる');
			return next;
		},
	};
}

function tempRoot() {
	return mkdtempSync(join(tmpdir(), 'setup-host-'));
}

test('CI と既存の選択と端末の無さでは聞かない', () => {
	assert.equal(shouldAsk({ ci: true, tty: true, hasChoice: false, skip: false, force: false }), false);
	assert.equal(shouldAsk({ ci: false, tty: false, hasChoice: false, skip: false, force: false }), false);
	assert.equal(shouldAsk({ ci: false, tty: true, hasChoice: true, skip: false, force: false }), false);
	assert.equal(shouldAsk({ ci: false, tty: true, hasChoice: false, skip: true, force: false }), false);
	assert.equal(shouldAsk({ ci: false, tty: true, hasChoice: false, skip: false, force: false }), true);
	assert.equal(shouldAsk({ ci: true, tty: true, hasChoice: false, skip: false, force: true }), false);
});

test('番号はプロバイダになり、空のモデルはホストの既定', () => {
	assert.deepEqual(normalizeChoice('2', ''), { provider: 'claude', model: 'host-default' });
	assert.deepEqual(normalizeChoice('codex', 'host-default'), { provider: 'codex', model: 'host-default' });
	assert.deepEqual(normalizeChoice('1', 'local-model'), { provider: 'cursor', model: 'local-model' });
	assert.throws(() => normalizeChoice('nope', ''), /プロバイダ/);
	assert.throws(() => normalizeChoice('claude', 'has space'), /モデル/);
});

test('CI では選択ファイルを作らない', async () => {
	const root = tempRoot();
	try {
		const result = await runSetup({
			root,
			env: { CI: 'true' },
			tty: true,
			io: { async question() { throw new Error('聞いた'); } },
		});
		assert.equal(result.status, 'skip');
		assert.equal(existsSync(join(root, '.harness/host-choice.json')), false);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('手元の端末では一度だけ選び、二度目は聞かない', async () => {
	const root = tempRoot();
	const io = scripted(['2', '1']);
	try {
		const first = await runSetup({ root, env: {}, tty: true, io });
		assert.equal(first.status, 'asked');
		assert.deepEqual(readChoice(root), { provider: 'claude', model: 'host-default' });
		assert.equal(existsSync(join(root, '.claude/settings.local.json')), false);
		const second = await runSetup({
			root,
			env: {},
			tty: true,
			io: { async question() { throw new Error('二度目を聞いた'); } },
		});
		assert.equal(second.status, 'skip');
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('手入力のモデルは Claude の手元設定だけに書き、共有 yaml は変えない', async () => {
	const root = tempRoot();
	try {
		mkdirSync(join(root, '.claude'), { recursive: true });
		mkdirSync(join(root, 'cycle'), { recursive: true });
		const shared = '{"hooks":{}}\n';
		const routing = 'model: host-default\n';
		writeFileSync(join(root, '.claude/settings.json'), shared);
		writeFileSync(join(root, '.claude/settings.local.json'), '{\n\t"theme": "light"\n}\n');
		writeFileSync(join(root, 'cycle/model-routing.yaml'), routing);
		const result = await runSetup({ root, env: {}, tty: true, io: scripted(['2', '2', 'local-model']) });
		assert.equal(result.status, 'asked');
		assert.equal(readFileSync(join(root, '.claude/settings.json'), 'utf8'), shared);
		assert.equal(readFileSync(join(root, 'cycle/model-routing.yaml'), 'utf8'), routing);
		const local = JSON.parse(readFileSync(join(root, '.claude/settings.local.json'), 'utf8'));
		assert.equal(local.model, 'local-model');
		assert.equal(local.theme, 'light');
		assert.deepEqual(readChoice(root), { provider: 'claude', model: 'local-model' });
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('Codex のモデルは手元の config.toml に書き、既存のファイルは上書きしない', async () => {
	const root = tempRoot();
	try {
		const result = await runSetup({ root, env: {}, tty: true, io: scripted(['3', '2', 'local-model']) });
		assert.equal(result.status, 'asked');
		assert.equal(result.codex, 'wrote');
		const toml = readFileSync(join(root, '.codex/config.toml'), 'utf8');
		assert.match(toml, /^# harness-host-choice\n/);
		assert.match(toml, /^model = "local-model"$/m);
		const owned = toml;
		writeFileSync(join(root, '.codex/config.toml'), 'sandbox_mode = "read-only"\n');
		const again = await runSetup({
			root,
			env: { HARNESS_PROVIDER: 'codex', HARNESS_MODEL: 'other-model' },
			tty: false,
			io: { async question() { throw new Error('聞いた'); } },
			force: true,
		});
		assert.equal(again.status, 'env');
		assert.equal(again.codex, 'skipped-existing');
		assert.equal(readFileSync(join(root, '.codex/config.toml'), 'utf8'), 'sandbox_mode = "read-only"\n');
		assert.notEqual(owned, 'sandbox_mode = "read-only"\n');
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('ホストの既定では Codex と Claude のモデル欄を書かない', () => {
	const root = tempRoot();
	try {
		applyChoice(root, normalizeChoice('cursor', ''));
		assert.equal(existsSync(join(root, '.codex/config.toml')), false);
		assert.equal(existsSync(join(root, '.claude/settings.local.json')), false);
		assert.deepEqual(readChoice(root), { provider: 'cursor', model: 'host-default' });
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('選択ファイルと Codex の手元モデルは gitignore する', () => {
	const ignore = readFileSync(new URL('../.gitignore', import.meta.url), 'utf8');
	assert.match(ignore, /^\.harness\/$/m);
	assert.match(ignore, /^\.codex\/config\.toml$/m);
});
