import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	FAILURE_CAP,
	checkRevisionRecord,
	executionReport,
	meanScore,
	selectRevision,
	validityReward
} from './lib/revision-select.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function question(id, score) {
	return { id, score };
}

function round(overrides = {}) {
	const parentQuestions = overrides.parentQuestions ?? [question('d1', 0.5), question('d2', 0.5)];
	const candidateQuestions = overrides.candidateQuestions ?? [question('d1', 1), question('d2', 1)];
	return {
		parent: { id: 'h0', questions: parentQuestions },
		candidate: {
			id: 'h1',
			parsed: true,
			applied: true,
			unchanged: false,
			runFraction: 1,
			questions: candidateQuestions,
			...overrides.candidate
		},
		sets: {
			feedback: ['d1', 'd2'],
			score: parentQuestions.map((q) => q.id),
			eval: ['e1'],
			...overrides.sets
		}
	};
}

test('平均点数は [0,1] の問だけを割る', () => {
	assert.equal(meanScore([question('a', 0), question('b', 1)]), 0.5);
	assert.throws(() => meanScore([]), /採点問が空/);
	assert.throws(() => meanScore([question('a', 1.1)]), /\[0,1\]/);
	assert.throws(() => meanScore([question('a', 1), question('a', 0)]), /重複/);
});

test('実行報告は失敗を最大8件に切る', () => {
	const questions = Array.from({ length: 10 }, (_, i) => question(`f${i}`, i === 0 ? 1 : 0.25));
	const report = executionReport(questions);
	assert.equal(FAILURE_CAP, 8);
	assert.equal(report.n, 10);
	assert.equal(report.passed, 1);
	assert.equal(report.failed, 9);
	assert.equal(report.failures.length, 8);
	assert.equal(report.failures[0].id, 'f1');
	assert.equal(report.failures[0].score, 0.25);
});

test('開発点数が親を上回るときだけ候補を残す', () => {
	const kept = selectRevision(round());
	assert.equal(kept.ok, true);
	assert.equal(kept.retained, 'candidate');
	assert.equal(kept.retainedId, 'h1');
	assert.equal(kept.parentMean, 0.5);
	assert.equal(kept.candidateMean, 1);
	assert.equal(kept.report.mean, 1);

	const equal = selectRevision(
		round({ candidateQuestions: [question('d1', 0.5), question('d2', 0.5)] })
	);
	assert.equal(equal.retained, 'parent');
	assert.equal(equal.retainedId, 'h0');

	const worse = selectRevision(
		round({ candidateQuestions: [question('d1', 0), question('d2', 0.4)] })
	);
	assert.equal(worse.retained, 'parent');
	assert.equal(worse.reason.includes('上回らない'), true);
});

test('妥当性報酬は報告に留め、低いタスク点数を残さない', () => {
	const candidate = {
		parsed: true,
		applied: true,
		unchanged: false,
		runFraction: 1,
		questions: [question('d1', 0.4), question('d2', 0.4)]
	};
	assert.ok(Math.abs(validityReward(candidate) - 0.3) < 1e-9);
	assert.ok(Math.abs(validityReward({ parsed: true, applied: false }) - 0.05) < 1e-9);
	assert.equal(validityReward({ parsed: false, applied: false }), 0);
	const decision = selectRevision(round({ candidate }));
	assert.equal(decision.retained, 'parent');
	assert.ok(decision.reward < decision.parentMean + decision.validity || decision.candidateMean < decision.parentMean);
	assert.ok(decision.candidateMean + decision.validity > decision.parentMean);
});

test('適用できない編集と無変更は親を残す', () => {
	const broken = selectRevision(round({ candidate: { parsed: true, applied: false, questions: null } }));
	assert.equal(broken.ok, true);
	assert.equal(broken.retained, 'parent');
	assert.equal(broken.candidateMean, null);
	assert.ok(Math.abs(broken.reward - 0.05) < 1e-9);

	const same = selectRevision(round({ candidate: { unchanged: true, questions: null } }));
	assert.equal(same.retained, 'parent');
	assert.equal(same.candidateMean, same.parentMean);
});

test('評価問がフィードバックか採点と重なると拒否する', () => {
	const feedback = selectRevision(round({ sets: { eval: ['d1'] } }));
	assert.equal(feedback.ok, false);
	assert.equal(feedback.retained, 'parent');
	assert.match(feedback.errors.join('\n'), /フィードバック/);

	const score = selectRevision(round({ sets: { feedback: ['other'], eval: ['d2'] } }));
	assert.equal(score.ok, false);
	assert.match(score.errors.join('\n'), /採点/);
});

test('フィードバックと採点が同じ開発問でもよい', () => {
	const decision = selectRevision(round());
	assert.equal(decision.ok, true);
	assert.equal(decision.retained, 'candidate');
});

test('採点問の集合が記録と違うと拒否する', () => {
	const decision = selectRevision(round({ sets: { score: ['d1'] } }));
	assert.equal(decision.ok, false);
	assert.match(decision.errors.join('\n'), /採点問/);
});

test('記録した保持が判定と違うと拒否する', () => {
	const record = round({ candidateQuestions: [question('d1', 0), question('d2', 0)] });
	record.retained = 'candidate';
	const decision = checkRevisionRecord(record);
	assert.equal(decision.ok, false);
	assert.match(decision.errors.join('\n'), /判定/);
});

test('CLI は判定 JSON を返し、ゲートは記録が無い木を通す', () => {
	const dir = mkdtempSync(join(tmpdir(), 'rev-'));
	const file = join(dir, 'round.json');
	writeFileSync(file, JSON.stringify(round()));
	const cli = fileURLToPath(new URL('./revision-select.mjs', import.meta.url));
	const missingFile = spawnSync(process.execPath, [cli, '--file', join(dir, 'nope.json')], { encoding: 'utf8' });
	assert.equal(missingFile.status, 1);
	assert.match(missingFile.stderr, /読めない/);

	const ran = spawnSync(process.execPath, [cli, '--file', file], { encoding: 'utf8' });
	assert.equal(ran.status, 0, ran.stderr);
	const parsed = JSON.parse(ran.stdout);
	assert.equal(parsed.retained, 'candidate');

	const missing = spawnSync(process.execPath, [cli, '--gate', dir], { encoding: 'utf8' });
	assert.equal(missing.status, 0, missing.stderr);
	assert.match(missing.stdout, /採点記録は無い/);

	const root = mkdtempSync(join(tmpdir(), 'rev-gate-'));
	const cycle = join(root, 'cycle');
	mkdirSync(cycle);
	const bad = round({ sets: { eval: ['d1'] } });
	bad.retained = 'candidate';
	writeFileSync(join(cycle, 'revision.json'), JSON.stringify(bad));
	const gated = spawnSync(process.execPath, [cli, '--gate', root], { encoding: 'utf8' });
	assert.equal(gated.status, 1);
	assert.match(`${gated.stdout}${gated.stderr}`, /フィードバック|判定/);
});

test('手順は skill にあり、重み更新と退行採用をしない', () => {
	const skill = readFileSync(join(ROOT, '.claude/skills/revision-select/SKILL.md'), 'utf8');
	assert.match(skill, /2609\.35738/);
	assert.match(skill, /上回る/);
	assert.match(skill, /評価問/);
	assert.match(skill, /重みは更新しない/);
	assert.match(skill, /下回っても採用しない/);
	const template = readFileSync(join(ROOT, 'TEMPLATE.md'), 'utf8');
	assert.match(template, /revision-select\.mjs/);
	assert.match(template, /重み学習はしない/);
});
