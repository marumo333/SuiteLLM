import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	decideCodeModeGuard,
	isCodeModeCommand,
	runCodeMode,
	summarizeResults
} from './lib/code-mode.mjs';

test('単発の照会 bash は通す', () => {
	assert.equal(decideCodeModeGuard('git status -sb').action, 'allow');
	assert.equal(decideCodeModeGuard('git diff --stat').action, 'allow');
});

test('2本以上の照会 && 連鎖は deny', () => {
	const r = decideCodeModeGuard('git status -sb && git diff --stat');
	assert.equal(r.action, 'deny');
	assert.ok(r.errors.some((e) => e.includes('code-mode')));
});

test('セミコロンの照会連鎖も deny', () => {
	const r = decideCodeModeGuard('git log -5 --oneline; git status');
	assert.equal(r.action, 'deny');
});

test('code-mode CLI 経由の複数 step は通す', () => {
	const cmd =
		"node scripts/code-mode.mjs --step 'git status -sb' --step 'git diff --stat'";
	assert.equal(isCodeModeCommand(cmd), true);
	assert.equal(decideCodeModeGuard(cmd).action, 'allow');
});

test('書き込みと commit の連鎖は code-mode 強制しない', () => {
	assert.equal(decideCodeModeGuard('git add -A && git commit -m "feat: 例。"').action, 'allow');
});

test('空の step は実行しない', () => {
	assert.throws(() => runCodeMode({ steps: [] }), /空/);
});

test('複数 step を1プロセスで回し要約だけ返す', () => {
	const dir = mkdtempSync(join(tmpdir(), 'code-mode-'));
	writeFileSync(join(dir, 'a.txt'), 'alpha\n');
	const r = runCodeMode({
		steps: ['printf one\\n', 'printf two\\n'],
		cwd: dir,
		maxBytes: 4096
	});
	assert.equal(r.ok, true);
	assert.equal(r.steps.length, 2);
	assert.equal(r.steps[0].exit, 0);
	assert.equal(r.steps[1].exit, 0);
	assert.match(r.steps[0].stdout_tail, /one/);
	assert.match(r.steps[1].stdout_tail, /two/);
	assert.ok(r.bytes <= 4096);
	assert.equal(r.schema, 'code-mode/v1');
});

test('step が失敗したらそこで止める', () => {
	const r = runCodeMode({
		steps: ['printf ok\\n', 'exit 7', 'printf no\\n'],
		cwd: process.cwd(),
		maxBytes: 4096
	});
	assert.equal(r.ok, false);
	assert.equal(r.steps.length, 2);
	assert.equal(r.steps[1].exit, 7);
});

test('要約が上限を超えたら truncate せず失敗', () => {
	const big = 'x'.repeat(200);
	const r = summarizeResults(
		[{ cmd: 'x', exit: 0, stdout: big, stderr: '' }],
		50
	);
	assert.equal(r.ok, false);
	assert.ok(String(r.error).includes('上限'));
	assert.equal(JSON.stringify(r).includes(big), false);
});

test('Claude と Codex の code-mode hook は照会の連鎖を exit 2 で止める', () => {
	const hook = join(dirname(fileURLToPath(import.meta.url)), '../.claude/hooks/code_mode_guard.mjs');
	const denied = spawnSync(process.execPath, [hook], {
		input: JSON.stringify({
			hook_event_name: 'PreToolUse',
			tool_input: { command: 'git status -sb && git diff --stat' }
		}),
		encoding: 'utf8'
	});
	assert.equal(denied.status, 2);
	assert.match(denied.stderr, /code-mode/);
	const allowed = spawnSync(process.execPath, [hook], {
		input: JSON.stringify({ tool_input: { command: 'git status -sb' } }),
		encoding: 'utf8'
	});
	assert.equal(allowed.status, 0);
});
