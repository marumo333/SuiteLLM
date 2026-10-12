/**
 * 計画確認のあと、ファイルが重ならない書き込みだけを grok-4.7-high で同時に進める。
 * 重なるファイルは親が書く。枝分けと PR の分割は拒否する。
 * 同時に進む実装エージェントの数値上限は無い。数は重ならないスライスの数。
 */

const IMPLEMENT_MODEL = 'grok-4.7-high';

export function readGrokTask(yaml) {
	const m = String(yaml ?? '').match(/^  grok_task:\s*(\S+)\s*$/m);
	if (!m) return { ok: false, error: 'grok_task が model-routing.yaml に無い' };
	return { ok: true, model: m[1] };
}

function empty(error) {
	return {
		ok: false,
		error,
		pr_count: 1,
		model: null,
		concurrent: [],
		parent: [],
		later: []
	};
}

function normPath(p) {
	const parts = [];
	for (const part of String(p ?? '').replace(/\\/g, '/').split('/')) {
		if (part === '' || part === '.') continue;
		if (part === '..') parts.pop();
		else parts.push(part);
	}
	return parts.join('/');
}

function pathsOverlap(a, b) {
	if (!a || !b) return false;
	if (a === b) return true;
	return a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

function setsOverlap(a, b) {
	for (const x of a) {
		for (const y of b) {
			if (pathsOverlap(x, y)) return true;
		}
	}
	return false;
}

function taskFiles(task) {
	const files = Array.isArray(task?.files) ? task.files : [];
	return files.map(normPath).filter(Boolean);
}

function forbiddenModel(model) {
	if (model == null || model === '') return '';
	const s = String(model);
	if (s === 'grok-4.7' || s === IMPLEMENT_MODEL) return '';
	if (/opus/i.test(s)) return '実装席を Opus に付け替えない';
	if (/xhigh/i.test(s) || /extra-high/i.test(s)) return 'extra-high は使わない';
	return '実装のモデルは grok-4.7-high';
}

/**
 * @param {object} input
 * @param {{ grokTask?: string, routingText?: string }} [opts]
 */
export function planParallelSlices(input, opts = {}) {
	const plan = input && typeof input === 'object' ? input : null;
	if (!plan) return empty('計画が無い');
	if (
		plan.worktree === true ||
		plan.branch_per_task === true ||
		plan.split === 'worktree' ||
		plan.split === 'branch'
	) {
		return empty('枝に分けて後からマージしない');
	}
	if (plan.pr_per_slice === true || (plan.pr_count != null && plan.pr_count !== 1)) {
		return empty('完成は 1 本の PR');
	}

	let model = opts.grokTask ?? null;
	if (!model) {
		const read = readGrokTask(opts.routingText);
		if (!read.ok) return empty(read.error);
		model = read.model;
	}
	if (model !== IMPLEMENT_MODEL) return empty('実装のモデルは grok-4.7-high');

	const tasks = Array.isArray(plan.tasks) ? plan.tasks : null;
	if (!tasks) return empty('tasks が無い');

	const ids = new Set();
	for (const task of tasks) {
		if (!task || typeof task.id !== 'string' || task.id === '') return empty('task.id が無い');
		if (ids.has(task.id)) return empty(`task.id が重複 ${task.id}`);
		ids.add(task.id);
		if (task.seat === 'opus') return empty('実装席を Opus に付け替えない');
		const why = forbiddenModel(task.model);
		if (why) return empty(why);
	}

	if (plan.plan_confirm?.status !== 'approved') return empty('plan_confirm の承認が無い');

	/** @type {{ id: string, files: string[], reason: string }[]} */
	const parent = [];
	/** @type {{ id: string, files: string[], reason: string }[]} */
	const later = [];
	/** @type {{ id: string, files: string[] }[]} */
	const writes = [];

	for (const task of tasks) {
		const files = taskFiles(task);
		const kind = task.kind ?? 'write';
		if (kind === 'read') {
			parent.push({ id: task.id, files, reason: 'read' });
			continue;
		}
		if (kind !== 'write') return empty(`未知の kind ${kind}`);
		if (files.length === 0) {
			parent.push({ id: task.id, files, reason: 'files' });
			continue;
		}
		const deps = Array.isArray(task.depends_on) ? task.depends_on : [];
		for (const dep of deps) {
			if (!ids.has(dep)) return empty(`depends_on が無い ${dep}`);
		}
		if (deps.length > 0) {
			later.push({ id: task.id, files, reason: 'depends' });
			continue;
		}
		writes.push({ id: task.id, files });
	}

	const overlapped = new Set();
	for (let i = 0; i < writes.length; i++) {
		for (let j = i + 1; j < writes.length; j++) {
			if (setsOverlap(writes[i].files, writes[j].files)) {
				overlapped.add(writes[i].id);
				overlapped.add(writes[j].id);
			}
		}
	}

	const concurrent = [];
	for (const task of writes) {
		if (overlapped.has(task.id)) parent.push({ id: task.id, files: task.files, reason: 'overlap' });
		else concurrent.push({ id: task.id, files: task.files, model, seat: 'implement' });
	}

	return {
		ok: true,
		error: '',
		pr_count: 1,
		model,
		concurrent,
		parent,
		later
	};
}
