import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const PROVIDER_BY_ANSWER = {
	'1': 'cursor',
	'2': 'claude',
	'3': 'codex',
	cursor: 'cursor',
	claude: 'claude',
	codex: 'codex',
};

const CODEX_MARK = '# harness-host-choice\n';

export function normalizeChoice(provider, model) {
	const mapped = PROVIDER_BY_ANSWER[String(provider ?? '').trim().toLowerCase()];
	if (!mapped) throw new Error('プロバイダは 1 Cursor, 2 Claude Code, 3 Codex');
	const raw = String(model ?? '').trim();
	if (raw === '' || raw === 'host-default') return { provider: mapped, model: 'host-default' };
	if (!/^[A-Za-z0-9._:-]+$/.test(raw)) throw new Error('モデル ID は英数と . _ : - だけ');
	return { provider: mapped, model: raw };
}

export function shouldAsk({ ci, tty, hasChoice, skip, force }) {
	if (ci || skip || !tty) return false;
	if (force) return true;
	return !hasChoice;
}

export function readChoice(root) {
	const path = join(root, '.harness/host-choice.json');
	if (!existsSync(path)) return null;
	const data = JSON.parse(readFileSync(path, 'utf8'));
	return { provider: data.provider, model: data.model };
}

function writeChoice(root, choice) {
	const path = join(root, '.harness/host-choice.json');
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, `${JSON.stringify(choice, null, '\t')}\n`);
}

function writeClaude(root, model) {
	const path = join(root, '.claude/settings.local.json');
	let data = {};
	if (existsSync(path)) {
		data = JSON.parse(readFileSync(path, 'utf8'));
		if (data === null || typeof data !== 'object' || Array.isArray(data)) {
			throw new Error('.claude/settings.local.json がオブジェクトではない');
		}
	}
	if (model === 'host-default') {
		if (!existsSync(path) || !Object.hasOwn(data, 'model')) return 'untouched';
		delete data.model;
		if (Object.keys(data).length === 0) rmSync(path);
		else writeFileSync(path, `${JSON.stringify(data, null, '\t')}\n`);
		return 'cleared';
	}
	data.model = model;
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, `${JSON.stringify(data, null, '\t')}\n`);
	return 'wrote';
}

function writeCodex(root, model) {
	const path = join(root, '.codex/config.toml');
	const exists = existsSync(path);
	const current = exists ? readFileSync(path, 'utf8') : '';
	const owned = !exists || current.startsWith(CODEX_MARK);
	if (model === 'host-default') {
		if (exists && current.startsWith(CODEX_MARK)) rmSync(path);
		return 'untouched';
	}
	if (!owned) return 'skipped-existing';
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, `${CODEX_MARK}model = "${model}"\n`);
	return 'wrote';
}

export function applyChoice(root, choice) {
	writeChoice(root, choice);
	return {
		claude: choice.provider === 'claude' ? writeClaude(root, choice.model) : 'untouched',
		codex: choice.provider === 'codex' ? writeCodex(root, choice.model) : 'untouched',
		choice,
	};
}

export async function runSetup({ root, env, tty, io, force = false }) {
	if (env.HARNESS_PROVIDER) {
		const applied = applyChoice(root, normalizeChoice(env.HARNESS_PROVIDER, env.HARNESS_MODEL ?? ''));
		return { status: 'env', ...applied };
	}
	const ci = env.CI === 'true' || env.GITHUB_ACTIONS === 'true';
	const skip = env.HARNESS_SKIP_HOST_SETUP === '1';
	if (!shouldAsk({ ci, tty, hasChoice: readChoice(root) != null, skip, force })) return { status: 'skip' };
	const provider = await io.question('プロバイダを番号で選ぶ（1 Cursor, 2 Claude Code, 3 Codex）: ');
	const picked = String(await io.question('モデル（1 ホストの既定, 2 手入力）: ')).trim();
	const model = picked === '2' ? await io.question('モデル ID: ') : picked === '1' || picked === '' ? '' : picked;
	const applied = applyChoice(root, normalizeChoice(provider, model));
	return { status: 'asked', ...applied };
}
