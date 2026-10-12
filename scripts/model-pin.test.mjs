import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('起動しない席の frontmatter に model スラッグを置かない', () => {
	for (const rel of ['.claude/agents/verifier.md', '.claude/agents/reflector.md']) {
		assert.doesNotMatch(frontmatter(rel), /^model:/m);
		assert.match(read(rel), /起動しない/);
	}
});

test('起動する席の model は fable_pin のまま', () => {
	for (const rel of ['.claude/agents/backend-architect.md', '.claude/agents/security-reviewer.md']) {
		assert.match(frontmatter(rel), /^model: claude-fable-5-1-thinking-high$/m);
	}
});

test('yaml は生きているスラッグだけをピンにし、使わないスラッグは書かない', () => {
	const routing = read('cycle/model-routing.yaml');
	assert.match(routing, /chat_orchestrator: grok-4\.7-high/);
	assert.match(routing, /grok_task: grok-4\.7-high/);
	assert.match(routing, /fable_pin: claude-fable-5-1-thinking-high/);
	assert.doesNotMatch(routing, /sonnet_pin/);
	assert.match(read('docs/multi-agent-and-pins.md'), /arXiv:2503\.13657/);
	assert.match(read('README.md'), /docs\/multi-agent-and-pins\.md/);
});

test('重ならないスライスは計画確認のあと grok-4.7-high で同時に進める', () => {
	const agents = read('.claude/AGENTS.md');
	assert.match(agents, /ファイルが重ならないスライスは `grok-4\.7-high` で同時に進めるのが既定/);
	assert.match(agents, /重なるファイルは親が書く/);
	assert.match(agents, /枝に分けて後からマージする十数体は入れない/);
	assert.match(agents, /完成は 1 本の PR/);
	assert.doesNotMatch(agents, /実装: TDD。親が書く。/);

	const dispatch = read('.claude/skills/parallel-dispatch/SKILL.md');
	assert.match(dispatch, /grok-4\.7-high/);
	assert.match(dispatch, /重なるファイルは親が書く/);
	assert.match(dispatch, /完成は 1 本の PR/);
	assert.match(dispatch, /Opus には渡さない/);
	assert.doesNotMatch(dispatch, /作業ツリー分離/);
	assert.doesNotMatch(dispatch, /best-of-n/);

	const budget = read('.claude/skills/harness-api-budget/SKILL.md');
	assert.match(budget, /重ならないスライスを同時に進める既定/);
	assert.match(budget, /重なるファイルの実装/);
	assert.match(budget, /完成は 1 本の PR/);

	const pins = read('docs/multi-agent-and-pins.md');
	assert.match(pins, /重なるファイルは親が書く/);
	assert.match(pins, /1 本の PR/);
	assert.match(pins, /review-cap は変えない/);

	const readme = read('README.md');
	assert.match(readme, /重なるファイルは親が書く/);
	assert.match(readme, /完成は 1 本の PR/);
	assert.match(readme, /docs\/multi-agent-and-pins\.md/);
});
