import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
	return readFileSync(join(ROOT, rel), 'utf8');
}

function frontmatter(rel) {
	const text = read(rel);
	const end = text.indexOf('\n---', 3);
	assert.ok(end > 0, `${rel} に frontmatter が無い`);
	return text.slice(0, end);
}

/** ホストのモデル ID。packet の席トークン（grok / fable / opus / muse）は含めない。 */
const PRODUCT_SLUG = /grok-\d|claude-[a-z0-9]|gpt-\d|gemini-|muse-spark-|cursor-grok|Grok \d|Fable \d|Opus \d/;

const LIVING = [
	'cycle/model-routing.yaml',
	'.claude/AGENTS.md',
	'AGENTS.md',
	'README.md',
	'TEMPLATE.md',
	'docs/multi-agent-and-pins.md',
	'.claude/skills/parallel-dispatch/SKILL.md',
	'.claude/skills/harness-api-budget/SKILL.md',
	'.claude/skills/plan-confirm/SKILL.md',
	'.claude/skills/adversarial-review/SKILL.md',
	'.claude/skills/harness-audit/SKILL.md',
	'.claude/agents/backend-architect.md',
	'.claude/agents/security-reviewer.md',
	'.claude/agents/verifier.md',
	'.claude/agents/reflector.md',
	'docs/architecture/review-overview.mmd',
	'docs/architecture/runtime-overview.mmd',
	'docs/architecture/audit-overview.mmd'
];

test('どの agent の frontmatter にも model を置かない', () => {
	const agents = readdirSync(join(ROOT, '.claude/agents')).filter((name) => name.endsWith('.md'));
	assert.ok(agents.length >= 4);
	for (const name of agents) {
		assert.doesNotMatch(frontmatter(`.claude/agents/${name}`), /^model:/m, name);
	}
	for (const rel of ['.claude/agents/verifier.md', '.claude/agents/reflector.md']) {
		assert.match(read(rel), /起動しない/);
	}
});

test('生きた契約に製品スラッグを書かず、席トークンは残す', () => {
	for (const rel of LIVING) {
		assert.doesNotMatch(read(rel), PRODUCT_SLUG, rel);
	}
	const routing = read('cycle/model-routing.yaml');
	assert.match(routing, /host-default/);
	assert.match(routing, /parent: grok/);
	assert.doesNotMatch(routing, /fable_pin/);
	assert.doesNotMatch(routing, /sonnet_pin/);
	assert.doesNotMatch(routing, /grok_task:/);
	assert.match(read('docs/decisions/0049-grok47-opus55-generation.md'), /grok-4\.7-high/);
	assert.match(read('docs/multi-agent-and-pins.md'), /arXiv:2503\.13657/);
	assert.match(read('docs/multi-agent-and-pins.md'), /製品スラッグ/);
	assert.match(read('docs/multi-agent-and-pins.md'), /ホストの既定/);
	assert.match(read('README.md'), /docs\/multi-agent-and-pins\.md/);
});

test('clone と hook はホストを聞かず、モデルを割り当てない', () => {
	const files = [
		'scripts/init.mjs',
		'scripts/install-git-hooks.mjs',
		'scripts/lib/run-pre-commit.mjs',
		'scripts/githooks/pre-commit',
		'scripts/githooks/commit-msg',
		'scripts/githooks/pre-merge-commit',
		'.cursor/hooks.json',
		'.cursor/hooks/pre-commit.mjs',
		'.cursor/hooks/block-env-read.mjs',
		'.cursor/hooks/code-mode.mjs',
		'.claude/hooks/pre_commit_guard.mjs',
		'.claude/hooks/block_env_read.mjs',
		'.claude/hooks/block_secret_write.mjs',
		'.claude/hooks/post_task_reflect.mjs'
	];
	for (const rel of files) {
		const text = read(rel);
		assert.doesNotMatch(text, /readline|createInterface|isTTY|process\.stdin/, rel);
		assert.doesNotMatch(text, /codex か|Claude か|Cursor か/, rel);
	}
	const pins = read('docs/multi-agent-and-pins.md');
	assert.match(pins, /hook はホストを聞かない/);
	assert.match(pins, /各ホストは自分の入口を読む/);
	assert.match(pins, /ホスト名を yaml に書いてモデル ID を割り当てない/);
});

test('重ならないスライスは計画確認のあとホストの既定で同時に進める', () => {
	const agents = read('.claude/AGENTS.md');
	assert.match(agents, /ファイルが重ならないスライスはホストの既定で同時に進めるのが既定/);
	assert.match(agents, /モデル ID は指定しない/);
	assert.match(agents, /重なるファイルは親が書く/);
	assert.match(agents, /枝に分けて後からマージする十数体は入れない/);
	assert.match(agents, /完成は 1 本の PR/);
	assert.doesNotMatch(agents, /実装: TDD。親が書く。/);

	const dispatch = read('.claude/skills/parallel-dispatch/SKILL.md');
	assert.match(dispatch, /ホストの既定/);
	assert.match(dispatch, /モデルは指定しない/);
	assert.match(dispatch, /重なるファイルは親が書く/);
	assert.match(dispatch, /完成は 1 本の PR/);
	assert.doesNotMatch(dispatch, /作業ツリー分離/);
	assert.doesNotMatch(dispatch, /best-of-n/);

	const budget = read('.claude/skills/harness-api-budget/SKILL.md');
	assert.match(budget, /重ならないスライスを同時に進める既定/);
	assert.match(budget, /重なるファイルの実装/);
	assert.match(budget, /完成は 1 本の PR/);
	assert.match(budget, /モデル ID は指定しない/);

	const pins = read('docs/multi-agent-and-pins.md');
	assert.match(pins, /重なるファイルは親が書く/);
	assert.match(pins, /1 本の PR/);
	assert.match(pins, /review-cap は変えない/);

	const readme = read('README.md');
	assert.match(readme, /重なるファイルは親が書く/);
	assert.match(readme, /完成は 1 本の PR/);
	assert.match(readme, /ホストの既定/);
	assert.match(readme, /docs\/multi-agent-and-pins\.md/);
});
