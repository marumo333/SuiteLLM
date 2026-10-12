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
