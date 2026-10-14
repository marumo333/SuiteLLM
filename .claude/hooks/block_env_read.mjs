#!/usr/bin/env node
/**
 * .env 読み取りブロック（規約1）。
 * - Claude Code / Codex PreToolUse: tool_input.command を検査 → 拒否は exit 2
 * - Cursor beforeShellExecution / beforeReadFile: トップレベル command / filePath か、それ以外の非 PreToolUse で JSON 拒否
 */
import { readFileSync } from 'node:fs';
import {
	commandDropsSearchLines,
	commandTouchesDependency,
	isBlockedDependencyPath
} from '../../scripts/lib/read-guard.mjs';

let raw = '';
try {
	raw = readFileSync(0, 'utf8');
} catch {}
let data = {};
try {
	data = JSON.parse(raw || '{}');
} catch {}

const cmd = String(data.tool_input?.command ?? data.command ?? '');
const filePath = String(
	data.tool_input?.file_path ?? data.tool_input?.path ?? data.filePath ?? data.path ?? ''
).replace(/\\/g, '/');

/** cat/less/head 等での .env 読み、source .env、printenv（シークレット晒し） */
const SHELL_ENV_READ =
	/(?:^|[;&|\n]\s*|&&\s*|\|\|\s*)(?:sudo\s+)?(?:cat|less|more|head|tail|bat|nl|od|hexdump|xxd)\b[^;&|\n]*\.env\b|(?:^|[;&|\n]\s*)(?:source|\.)\s+[^\s]*\.env\b|(?:^|[;&|\n]\s*)printenv\b/;

const isEnvFile = /(^|\/)\.env(\.[^/]+)?$/.test(filePath) && !/\.env\.example$/.test(filePath);
const isShellHit = cmd.length > 0 && SHELL_ENV_READ.test(cmd);

const isPreToolUse = data.hook_event_name === 'PreToolUse';

function denyCursor(message) {
	process.stdout.write(
		JSON.stringify({
			permission: 'deny',
			user_message: message,
			agent_message: message
		})
	);
	process.exit(0);
}

function allowCursor() {
	process.stdout.write(JSON.stringify({ permission: 'allow' }));
	process.exit(0);
}

if (isBlockedDependencyPath(filePath) || commandTouchesDependency(cmd)) {
	const msg = '[block_env_read] node_modules と .tools は読まない。';
	if (!isPreToolUse) denyCursor(msg);
	console.error(msg);
	process.exit(2);
}

if (commandDropsSearchLines(cmd)) {
	const msg =
		'[block_env_read] 検索は一致行を残す。ファイル名だけと件数だけは使わない。node scripts/search-lines.mjs か rg -n。';
	if (!isPreToolUse) denyCursor(msg);
	console.error(msg);
	process.exit(2);
}

if (isEnvFile || isShellHit) {
	const msg =
		'[block_env_read] 規約1: .env / シークレット環境変数の読み取りは禁止（人間がパイプ渡し）。';
	if (!isPreToolUse) denyCursor(msg);
	console.error(msg);
	process.exit(2);
}

if (!isPreToolUse) allowCursor();
process.exit(0);
