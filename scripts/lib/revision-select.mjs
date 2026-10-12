/** 採点のある改訂の保持。出典は arXiv:2609.35738 の Reasoning Gym 手順。 */

export const FAILURE_CAP = 8;

function finiteUnit(value, label) {
	if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
		throw new Error(`${label} は [0,1]`);
	}
}

/**
 * @param {{ id: string, score: number }[]} questions
 */
export function meanScore(questions) {
	if (!Array.isArray(questions) || questions.length === 0) throw new Error('採点問が空');
	const seen = new Set();
	let sum = 0;
	for (const q of questions) {
		if (!q || typeof q.id !== 'string' || q.id === '') throw new Error('問 id が無い');
		if (seen.has(q.id)) throw new Error(`問 id が重複: ${q.id}`);
		seen.add(q.id);
		finiteUnit(q.score, `点数 ${q.id}`);
		sum += q.score;
	}
	return sum / questions.length;
}

/**
 * @param {{ id: string, score: number }[]} questions
 * @param {number} [cap]
 */
export function executionReport(questions, cap = FAILURE_CAP) {
	const mean = meanScore(questions);
	const failures = questions.filter((q) => q.score < 1);
	const limit = Number.isInteger(cap) && cap >= 0 ? cap : FAILURE_CAP;
	return {
		n: questions.length,
		mean,
		passed: questions.length - failures.length,
		failed: failures.length,
		failures: failures.slice(0, limit).map((q) => ({ id: q.id, score: q.score }))
	};
}

function idList(name, value) {
	if (!Array.isArray(value)) throw new Error(`${name} は配列`);
	const ids = [];
	const seen = new Set();
	for (const id of value) {
		if (typeof id !== 'string' || id === '') throw new Error(`${name} の id が空`);
		if (seen.has(id)) throw new Error(`${name} の id が重複: ${id}`);
		seen.add(id);
		ids.push(id);
	}
	return ids;
}

function sameIds(a, b) {
	if (a.length !== b.length) return false;
	const right = new Set(b);
	return a.every((id) => right.has(id));
}

/**
 * 評価問はフィードバックと採点のどちらとも重ならない。フィードバックと採点は重なってよい。
 * @param {{ feedback: string[], score: string[], eval: string[] }} sets
 */
export function disjointErrors(sets) {
	const feedback = idList('feedback', sets?.feedback);
	const score = idList('score', sets?.score);
	const evalIds = idList('eval', sets?.eval);
	/** @type {string[]} */
	const errors = [];
	const fb = new Set(feedback);
	const sc = new Set(score);
	for (const id of evalIds) {
		if (fb.has(id)) errors.push(`評価問がフィードバックと重なる: ${id}`);
		if (sc.has(id)) errors.push(`評価問が採点と重なる: ${id}`);
	}
	return errors;
}

/**
 * 妥当性は報告用。保持判定には使わない。
 * v = 0.05 * parses + 0.10 * applied + 0.15 * runFraction
 * @param {{ parsed?: boolean, applied?: boolean, runFraction?: number }} candidate
 */
export function validityReward(candidate) {
	const parsed = candidate?.parsed === true;
	const applied = parsed && candidate?.applied === true;
	let rho = 0;
	if (applied) {
		finiteUnit(candidate.runFraction, 'runFraction');
		rho = candidate.runFraction;
	}
	return (parsed ? 0.05 : 0) + (applied ? 0.1 : 0) + 0.15 * rho;
}

function blank(reason, errors, extra = {}) {
	return {
		ok: false,
		retained: 'parent',
		retainedId: extra.retainedId ?? null,
		reason,
		errors,
		parentMean: extra.parentMean ?? null,
		candidateMean: extra.candidateMean ?? null,
		validity: extra.validity ?? null,
		reward: null,
		report: null
	};
}

/**
 * 候補は、適用でき、無変更でなく、開発集合の平均が親を厳密に上回るときだけ残す。
 * @param {{ parent: { id: string, questions: { id: string, score: number }[] }, candidate: object, sets: object }} input
 */
export function selectRevision(input) {
	/** @type {string[]} */
	const errors = [];
	try {
		errors.push(...disjointErrors(input?.sets ?? {}));
	} catch (e) {
		errors.push(e.message);
	}

	const parent = input?.parent;
	const candidate = input?.candidate;
	if (!parent || typeof parent.id !== 'string' || parent.id === '') errors.push('親 id が無い');
	if (!candidate || typeof candidate.id !== 'string' || candidate.id === '') errors.push('候補 id が無い');

	let parentMean = null;
	let parentIds = [];
	try {
		if (Array.isArray(parent?.questions)) {
			parentMean = meanScore(parent.questions);
			parentIds = parent.questions.map((q) => q.id);
		} else {
			errors.push('親: 採点問が空');
		}
	} catch (e) {
		errors.push(`親: ${e.message}`);
	}

	let scoreIds = null;
	try {
		if (input?.sets) scoreIds = idList('score', input.sets.score);
	} catch {
		scoreIds = null;
	}
	if (parentIds.length && scoreIds && !sameIds(parentIds, scoreIds)) {
		errors.push('採点問が記録と違う');
	}

	let validity = null;
	try {
		if (candidate) validity = validityReward(candidate);
	} catch (e) {
		errors.push(e.message);
	}

	if (errors.length) {
		return blank(errors[0], errors, {
			retainedId: parent?.id ?? null,
			parentMean,
			validity
		});
	}

	const parsed = candidate.parsed === true;
	const applied = parsed && candidate.applied === true;
	const unchanged = candidate.unchanged === true;

	if (!applied || unchanged) {
		return {
			ok: true,
			retained: 'parent',
			retainedId: parent.id,
			reason: unchanged ? '無変更は親を残す' : '適用できない編集は親を残す',
			errors: [],
			parentMean,
			candidateMean: unchanged ? parentMean : null,
			validity,
			reward: unchanged ? parentMean + validity : validity,
			report: executionReport(parent.questions)
		};
	}

	let candidateMean = null;
	try {
		candidateMean = meanScore(candidate.questions);
	} catch (e) {
		return blank(`候補: ${e.message}`, [`候補: ${e.message}`], {
			retainedId: parent.id,
			parentMean,
			validity
		});
	}
	const candidateIds = candidate.questions.map((q) => q.id);
	if (!sameIds(parentIds, candidateIds)) {
		return blank('採点問が親と候補で違う', ['採点問が親と候補で違う'], {
			retainedId: parent.id,
			parentMean,
			candidateMean,
			validity
		});
	}

	const reward = candidateMean + validity;
	if (candidateMean > parentMean) {
		return {
			ok: true,
			retained: 'candidate',
			retainedId: candidate.id,
			reason: '開発点数が親を上回る',
			errors: [],
			parentMean,
			candidateMean,
			validity,
			reward,
			report: executionReport(candidate.questions)
		};
	}
	return {
		ok: true,
		retained: 'parent',
		retainedId: parent.id,
		reason: '開発点数が親を上回らない',
		errors: [],
		parentMean,
		candidateMean,
		validity,
		reward,
		report: executionReport(parent.questions)
	};
}

/**
 * @param {object} record
 */
export function checkRevisionRecord(record) {
	if (!record || typeof record !== 'object' || Array.isArray(record)) {
		return blank('改訂記録がオブジェクトでない', ['改訂記録がオブジェクトでない']);
	}
	const decision = selectRevision(record);
	if (record.retained !== undefined && record.retained !== 'parent' && record.retained !== 'candidate') {
		const errors = [...decision.errors, 'retained は parent か candidate'];
		return { ...decision, ok: false, reason: errors[0], errors, reward: null, report: null };
	}
	if (decision.ok && record.retained !== undefined && record.retained !== decision.retained) {
		const errors = [`記録は ${record.retained}、判定は ${decision.retained}`];
		return { ...decision, ok: false, reason: '記録の保持が判定と違う', errors };
	}
	return decision;
}
