#!/usr/bin/env node
/** Claude Code / Codex PreToolUse(Bash): 照会 bash の生連鎖を code-mode へ。拒否は exit 2。 */
import { readFileSync } from 'node:fs';
import { decideCodeModeGuard } from '../../scripts/lib/code-mode.mjs';

let raw = '';
try {
	raw = readFileSync(0, 'utf8');
} catch {}
let data = {};
try {
	data = JSON.parse(raw || '{}');
} catch {}

const cmd = String(data.tool_input?.command ?? data.command ?? '');
const decision = decideCodeModeGuard(cmd);
if (decision.action === 'deny') {
	for (const e of decision.errors) console.error(e);
	process.exit(2);
}
process.exit(0);
