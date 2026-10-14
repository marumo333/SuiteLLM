import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
	return readFileSync(join(ROOT, rel), 'utf8');
}

test('親は4分類を1回行い、直すだけコードを変える', () => {
	const skill = read('.claude/skills/adversarial-review/SKILL.md');
	assert.match(skill, /tsc --noEmit/);
	assert.match(skill, /検証用の subagent は起動しない/);
	assert.match(skill, /直す/);
	assert.match(skill, /検討/);
	assert.match(skill, /記録/);
	assert.match(skill, /却下/);
	assert.match(skill, /二周目は開かない/);
	assert.doesNotMatch(skill, /3体/);
	assert.doesNotMatch(skill, /モード2/);
});

test('feature-gate の CI は同じ単体テストコマンドを実行する', () => {
	const workflow = read('.github/workflows/feature-gate.yml');
	assert.match(workflow, /node scripts\/run-harness-tests\.mjs/);
	assert.equal(workflow.includes('node --test scripts/'), false);
	assert.equal(workflow.includes('apt-get install -y ripgrep'), false);
});

test('CI は feature-gate より前に pnpm install する', () => {
	const workflow = read('.github/workflows/feature-gate.yml');
	const installAt = workflow.indexOf('pnpm install --frozen-lockfile');
	const gateAt = workflow.indexOf('HARNESS_ROOT=');
	assert.ok(installAt >= 0, 'pnpm install が workflow に無い');
	assert.ok(gateAt >= 0, 'PR ツリーへ向けた feature-gate の起動が workflow に無い');
	assert.ok(installAt < gateAt, 'feature-gate は contract-check を呼ぶ。typescript は先に入れる');
});

test('CI は main の検査ロジックを PR ツリーに向け、policy は PR のまま', () => {
	const workflow = read('.github/workflows/feature-gate.yml');
	assert.match(workflow, /^on:\n {2}push:\n {2}pull_request:\n/m);
	assert.doesNotMatch(workflow, /pull_request_target/);
	assert.match(workflow, /contents: read/);
	assert.match(workflow, /HARNESS_ROOT=/);
	assert.match(workflow, /git archive origin\/main scripts/);
	assert.match(workflow, /ln -s .*node_modules/);
	assert.doesNotMatch(workflow, /OPA_POLICY_DIR/);
	assert.doesNotMatch(workflow, /contract-check\.mjs/);
	assert.doesNotMatch(workflow, /review-cap-check\.mjs/);
});

test('席ルーティングは検証 subagent を出さない', () => {
	const budget = read('.claude/skills/harness-api-budget/SKILL.md');
	assert.match(budget, /verifier \/ reflector \/ 3体は起動しない/);
	assert.match(budget, /新しい周で1回まで/);
	assert.match(budget, /新しい周で0回/);
});

test('security-reviewer は毎タスクでは起動しない', () => {
	const agent = read('.claude/agents/security-reviewer.md');
	assert.match(agent, /毎タスクでは起動しない/);
	assert.match(agent, /直す以外はコードを変えない/);
	assert.doesNotMatch(agent, /必ず使う/);
});

test('セキュリティ・振る舞い・設計は1回の読みに含め、観点ごとに席を増やさない', () => {
	const skill = read('.claude/skills/adversarial-review/SKILL.md');
	assert.match(skill, /セキュリティ/);
	assert.match(skill, /振る舞い/);
	assert.match(skill, /設計/);
	assert.match(skill, /観点ごとに席は増やさない/);
	assert.doesNotMatch(skill, /3体/);
	const agent = read('.claude/agents/security-reviewer.md');
	assert.match(agent, /振る舞い/);
	assert.match(agent, /設計/);
	assert.match(agent, /観点ごとに起動しない/);
	const budget = read('.claude/skills/harness-api-budget/SKILL.md');
	assert.match(budget, /観点ごとに席は増やさない/);
	assert.match(budget, /3体のレビューは起動しない/);
});
