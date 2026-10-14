import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { planParallelSlices } from './lib/parallel-slices.mjs';
import { DISPATCH_CAP } from './lib/review-cap.mjs';

const ROOT = join(import.meta.dirname, '..');
const routingText = readFileSync(join(ROOT, 'cycle', 'model-routing.yaml'), 'utf8');

function plan(tasks, extra = {}) {
	return planParallelSlices(
		{ plan_confirm: { status: 'approved' }, tasks, ...extra },
		{ routingText }
	);
}

test('生きた yaml に製品スラッグが無いとき同時実行できる', () => {
	assert.doesNotMatch(routingText, /grok-\d|claude-[a-z0-9]/);
	const got = plan([{ id: 'a', files: ['src/a.js'] }]);
	assert.equal(got.ok, true);
	assert.equal(got.model, null);
});

test('重ならない書き込みはホストの既定で同時に進み、PR は 1 本', () => {
	const got = plan([
		{ id: 'a', files: ['src/a.js'] },
		{ id: 'b', files: ['./src/b.js'] },
		{ id: 'c', files: ['docs/c.md'] }
	]);
	assert.equal(got.ok, true);
	assert.equal(got.pr_count, 1);
	assert.equal(got.model, null);
	assert.deepEqual(
		got.concurrent.map((t) => t.id),
		['a', 'b', 'c']
	);
	assert.ok(got.concurrent.every((t) => t.model == null && t.seat === 'implement'));
	assert.deepEqual(got.parent, []);
});

test('重なるファイルは親が書き、同時実行には入らない', () => {
	const got = plan([
		{ id: 'a', files: ['src/a.js'] },
		{ id: 'b', files: ['src/a.js', 'src/b.js'] },
		{ id: 'c', files: ['src/c.js'] }
	]);
	assert.equal(got.ok, true);
	assert.deepEqual(
		got.parent.map((t) => t.id),
		['a', 'b']
	);
	assert.ok(got.parent.every((t) => t.reason === 'overlap'));
	assert.deepEqual(
		got.concurrent.map((t) => t.id),
		['c']
	);
});

test('ディレクトリが重なる書き込みは親', () => {
	const got = plan([
		{ id: 'a', files: ['src'] },
		{ id: 'b', files: ['src/a.js'] }
	]);
	assert.deepEqual(
		got.parent.map((t) => t.reason),
		['overlap', 'overlap']
	);
	assert.deepEqual(got.concurrent, []);
});

test('承認が無いと同時実行しない', () => {
	const got = planParallelSlices(
		{ tasks: [{ id: 'a', files: ['src/a.js'] }] },
		{ routingText }
	);
	assert.equal(got.ok, false);
	assert.equal(got.error, 'plan_confirm の承認が無い');
	assert.deepEqual(got.concurrent, []);
	assert.equal(got.pr_count, 1);
});

test('枝分けと PR の分割は拒否する', () => {
	const tasks = [{ id: 'a', files: ['src/a.js'] }];
	assert.equal(plan(tasks, { split: 'worktree' }).error, '枝に分けて後からマージしない');
	assert.equal(plan(tasks, { branch_per_task: true }).error, '枝に分けて後からマージしない');
	assert.equal(plan(tasks, { pr_per_slice: true }).error, '完成は 1 本の PR');
	assert.equal(plan(tasks, { pr_count: 12 }).error, '完成は 1 本の PR');
});

test('実装スライスにモデルを書かない', () => {
	assert.equal(
		plan([{ id: 'a', files: ['src/a.js'], model: 'claude-opus-5-5-high' }]).error,
		'モデルは指定しない'
	);
	assert.equal(
		plan([{ id: 'a', files: ['src/a.js'], seat: 'opus' }]).error,
		'実装席を Opus に付け替えない'
	);
	assert.equal(
		plan([{ id: 'a', files: ['src/a.js'], model: 'grok-4.7-xhigh' }]).error,
		'モデルは指定しない'
	);
	assert.equal(
		plan([{ id: 'a', files: ['src/a.js'], model: 'grok-4.7' }]).error,
		'モデルは指定しない'
	);
	assert.equal(
		plan([{ id: 'a', files: ['src/a.js'], model: 'host-default' }]).error,
		'モデルは指定しない'
	);
});

test('読み取りと依存は同時実行に入らない', () => {
	const got = plan([
		{ id: 'read', kind: 'read', files: ['src/a.js'] },
		{ id: 'a', files: ['src/a.js'] },
		{ id: 'b', files: ['src/b.js'], depends_on: ['a'] }
	]);
	assert.equal(got.ok, true);
	assert.deepEqual(
		got.concurrent.map((t) => t.id),
		['a']
	);
	assert.equal(got.parent[0].reason, 'read');
	assert.equal(got.later[0].reason, 'depends');
});

test('同時実行できる実装エージェントの数値上限は無い', () => {
	const tasks = Array.from({ length: 40 }, (_, i) => ({ id: `s${i}`, files: [`slice/${i}.js`] }));
	const got = plan(tasks);
	assert.equal(got.ok, true);
	assert.equal(got.concurrent.length, 40);
	assert.equal(got.pr_count, 1);
	const src = readFileSync(join(ROOT, 'scripts', 'lib', 'parallel-slices.mjs'), 'utf8');
	assert.doesNotMatch(src, /MAX_AGENTS|IMPLEMENT_AGENT_CAP|maxAgents\s*=\s*\d+/);
	assert.equal(DISPATCH_CAP['skill:adversarial-review'], 1);
	assert.equal(DISPATCH_CAP['skill:verify'], 0);
	assert.equal(DISPATCH_CAP['skill:reflect'], 0);
});

test('CLI は計画 JSON を判定する', () => {
	const dir = mkdtempSync(join(tmpdir(), 'slices-'));
	const planPath = join(dir, 'plan.json');
	writeFileSync(
		planPath,
		JSON.stringify({
			plan_confirm: { status: 'approved' },
			tasks: [
				{ id: 'a', files: ['src/a.js'] },
				{ id: 'b', files: ['src/b.js'] }
			]
		})
	);
	const ran = spawnSync(process.execPath, ['scripts/parallel-slices.mjs', '--plan', planPath], {
		cwd: ROOT,
		encoding: 'utf8'
	});
	assert.equal(ran.status, 0, ran.stderr);
	const got = JSON.parse(ran.stdout);
	assert.equal(got.concurrent.length, 2);
	assert.equal(got.pr_count, 1);
});
