import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveGateLayout } from './feature-gate.mjs';
import { resolveReviewCapDataRoot } from './review-cap-check.mjs';

test('feature-gate の子はスクリプトの隣、policy はデータ根', () => {
	const layout = resolveGateLayout(pathToFileURL('/tmp/archive/scripts/feature-gate.mjs').href, {
		HARNESS_ROOT: '/work/pr'
	});
	assert.equal(layout.dataRoot, '/work/pr');
	assert.equal(layout.policy, '/work/pr/policy');
	assert.equal(layout.contractCheck, '/tmp/archive/scripts/contract-check.mjs');
	assert.equal(layout.reviewCapCheck, '/tmp/archive/scripts/review-cap-check.mjs');
});

test('HARNESS_ROOT が無い feature-gate はスクリプトの親をデータ根にする', () => {
	const layout = resolveGateLayout(pathToFileURL('/repo/scripts/feature-gate.mjs').href, {});
	assert.equal(layout.dataRoot, '/repo');
	assert.equal(layout.policy, '/repo/policy');
	assert.equal(layout.contractCheck, '/repo/scripts/contract-check.mjs');
});

test('feature-gate はデータ根の scripts ではなく隣の子を起動する', () => {
	const src = readFileSync(new URL('./feature-gate.mjs', import.meta.url), 'utf8');
	assert.match(src, /execFileSync\(process\.execPath, \[layout\.contractCheck, layout\.dataRoot\]/);
	assert.match(src, /execFileSync\(process\.execPath, \[layout\.reviewCapCheck, layout\.dataRoot\]/);
	assert.doesNotMatch(src, /join\(layout\.dataRoot, 'scripts\/contract-check\.mjs'\)/);
	assert.doesNotMatch(src, /join\(layout\.dataRoot, 'scripts\/review-cap-check\.mjs'\)/);
});

test('review-cap の引数がデータ根で、スクリプト位置より先', () => {
	const scriptUrl = pathToFileURL('/tmp/archive/scripts/review-cap-check.mjs').href;
	assert.equal(
		resolveReviewCapDataRoot({
			scriptUrl,
			argv: ['node', 'review-cap-check.mjs', '/work/pr'],
			env: { HARNESS_ROOT: '/somewhere' }
		}),
		'/work/pr'
	);
	assert.equal(
		resolveReviewCapDataRoot({
			scriptUrl,
			argv: ['node', 'review-cap-check.mjs'],
			env: { HARNESS_ROOT: '/work/pr' }
		}),
		'/work/pr'
	);
	assert.equal(
		resolveReviewCapDataRoot({
			scriptUrl: pathToFileURL('/repo/scripts/review-cap-check.mjs').href,
			argv: ['node', 'review-cap-check.mjs'],
			env: {}
		}),
		'/repo'
	);
});

test('review-cap は引数のリポジトリの events を読む', () => {
	const root = mkdtempSync(join(tmpdir(), 'cap-'));
	const git = (args) => {
		const ran = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
		assert.equal(ran.status, 0, `${args.join(' ')}\n${ran.stderr || ran.stdout}`);
	};
	git(['init', '-b', 'main']);
	git(['config', 'user.email', 'cap@example.com']);
	git(['config', 'user.name', 'cap']);
	mkdirSync(join(root, 'cycle'));
	writeFileSync(join(root, 'cycle/events.jsonl'), '');
	git(['add', 'cycle/events.jsonl']);
	git(['commit', '-m', 'chore: 空のイベントを置く。']);
	const dispatch = (seq) =>
		JSON.stringify({
			type: 'dispatch',
			cycle: 'C-0099',
			node: 'skill:adversarial-review',
			seq
		});
	writeFileSync(join(root, 'cycle/events.jsonl'), `${dispatch(1)}\n${dispatch(2)}\n`);
	const script = fileURLToPath(new URL('./review-cap-check.mjs', import.meta.url));
	const ran = spawnSync(process.execPath, [script, root], { encoding: 'utf8' });
	assert.equal(ran.status, 1);
	assert.match(`${ran.stderr}`, /上限/);
});

test('展開した feature-gate は隣の壊れた policy を見ず、データ根を検査する', () => {
	const repo = fileURLToPath(new URL('..', import.meta.url));
	const tmp = mkdtempSync(join(tmpdir(), 'gate-'));
	const copied = spawnSync('cp', ['-a', join(repo, 'scripts'), join(tmp, 'scripts')], { encoding: 'utf8' });
	assert.equal(copied.status, 0, copied.stderr);
	const linked = spawnSync('ln', ['-s', join(repo, 'node_modules'), join(tmp, 'node_modules')], {
		encoding: 'utf8'
	});
	assert.equal(linked.status, 0, linked.stderr);
	mkdirSync(join(tmp, 'policy'));
	writeFileSync(join(tmp, 'policy/bad.rego'), 'this is not rego\n');
	const ran = spawnSync(process.execPath, [join(tmp, 'scripts/feature-gate.mjs')], {
		cwd: repo,
		env: { ...process.env, HARNESS_ROOT: repo },
		encoding: 'utf8'
	});
	assert.equal(ran.status, 0, `${ran.stdout}\n${ran.stderr}`);
	assert.match(ran.stdout, /policy\/canon_test\.rego/);
	assert.doesNotMatch(`${ran.stdout}${ran.stderr}`, /bad\.rego/);
	assert.match(ran.stdout, /\[feature-gate\] 成功/);
});
