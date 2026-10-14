import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureRg } from './ensure-rg.mjs';
import {
	commandDropsSearchLines,
	commandTouchesDependency,
	isBlockedDependencyPath
} from './lib/read-guard.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('node_modules と .tools のパスは読む前に止める', () => {
	assert.equal(isBlockedDependencyPath('node_modules/left-pad/index.js'), true);
	assert.equal(isBlockedDependencyPath('.tools/opa'), true);
	assert.equal(isBlockedDependencyPath('pkg/node_modules/x'), true);
	assert.equal(isBlockedDependencyPath('scripts/lib/code-mode.mjs'), false);
	assert.equal(isBlockedDependencyPath('cycle/model-routing.yaml'), false);
});

test('依存ディレクトリを開くシェルは止め、文中の語は通す', () => {
	assert.equal(commandTouchesDependency('cat .tools/opa'), true);
	assert.equal(commandTouchesDependency('head -n 5 node_modules/left-pad/index.js'), true);
	assert.equal(commandTouchesDependency('ls .tools'), true);
	assert.equal(commandTouchesDependency('git commit -m "依存の .tools は読まない"'), false);
	assert.equal(commandTouchesDependency('rg -n PACKET_MAX_BYTES scripts'), false);
});

test('ファイル名だけと件数だけの rg は止め、一致行は通す', () => {
	assert.equal(commandDropsSearchLines('rg -l packet'), true);
	assert.equal(commandDropsSearchLines('rg --files-with-matches packet'), true);
	assert.equal(commandDropsSearchLines('rg -c packet'), true);
	assert.equal(commandDropsSearchLines('rg -n packet scripts'), false);
	assert.equal(commandDropsSearchLines('rg -n -F "inspects >= 2" scripts'), false);
	assert.equal(commandDropsSearchLines('git status -sb'), false);
});

test('beforeReadFile は .tools を拒否する', () => {
	const hook = join(ROOT, '.claude/hooks/block_env_read.mjs');
	const r = spawnSync(process.execPath, [hook], {
		input: JSON.stringify({ filePath: '.tools/opa', cwd: ROOT }),
		encoding: 'utf8'
	});
	const body = JSON.parse(r.stdout);
	assert.equal(body.permission, 'deny');
	assert.match(body.agent_message, /node_modules|\.tools/);
});

test('search-lines は一致行を返す', () => {
	const r = spawnSync(process.execPath, ['scripts/search-lines.mjs', 'export const PACKET_MAX_BYTES = 32768;'], {
		cwd: ROOT,
		encoding: 'utf8'
	});
	assert.equal(r.status, 0, r.stderr);
	assert.match(r.stdout, /PACKET_MAX_BYTES = 32768/);
});

test('search-lines は PATH の rg を使わない', () => {
	ensureRg();
	const r = spawnSync(process.execPath, ['scripts/search-lines.mjs', 'export const PACKET_MAX_BYTES = 32768;'], {
		cwd: ROOT,
		encoding: 'utf8',
		env: { ...process.env, PATH: mkdtempSync(join(tmpdir(), 'norg-')) }
	});
	assert.equal(r.status, 0, r.stderr);
	assert.match(r.stdout, /PACKET_MAX_BYTES = 32768/);
});

test('learnings の席記述は当時と現行ピンを分ける', () => {
	const text = readFileSync(join(ROOT, 'docs/learnings.md'), 'utf8');
	const line = text.split('\n').find((l) => l.includes('席は親 Grok 4.6'));
	assert.ok(line);
	assert.match(line, /当時/);
	assert.match(line, /grok-4\.7-high/);
	const routing = readFileSync(join(ROOT, 'cycle/model-routing.yaml'), 'utf8');
	assert.doesNotMatch(routing, /grok-4\.7-high/);
	assert.match(routing, /host-default/);
});
