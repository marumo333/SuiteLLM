#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { reviewExcess } from './lib/review-cap.mjs';

/**
 * events と git の根。スクリプトファイルの位置とは別。
 * 引数、HARNESS_ROOT、スクリプトの親、の順。
 * @param {{ scriptUrl: string, argv: string[], env: NodeJS.ProcessEnv }} input
 */
export function resolveReviewCapDataRoot({ scriptUrl, argv, env }) {
	const fromArg = argv[2];
	if (fromArg && !fromArg.startsWith('-')) return fromArg;
	if (env.HARNESS_ROOT) return env.HARNESS_ROOT;
	return join(dirname(fileURLToPath(scriptUrl)), '..');
}

const GIT = ['-c', 'core.quotePath=false'];

function parseJsonl(text) {
	return text
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => JSON.parse(line));
}

function mergeBase(root) {
	for (const base of ['origin/main', 'main']) {
		try {
			const mb = execFileSync('git', [...GIT, 'merge-base', base, 'HEAD'], {
				encoding: 'utf8',
				cwd: root
			}).trim();
			if (mb) return mb;
		} catch {
			// 次の基準
		}
	}
	return null;
}

function showAt(root, mb, path) {
	try {
		return execFileSync('git', [...GIT, 'show', `${mb}:${path}`], {
			encoding: 'utf8',
			cwd: root,
			stdio: ['ignore', 'pipe', 'ignore']
		});
	} catch {
		return null;
	}
}

function baseEvents(root, mb) {
	const text = showAt(root, mb, 'cycle/events.jsonl') ?? showAt(root, mb, 'knowledge/graph/events.jsonl');
	return text ? parseJsonl(text) : [];
}

function runReviewCap(root) {
	const mb = mergeBase(root);
	if (!mb) {
		console.error('[review-cap] merge-base が解けない。欠落で通すことを拒否する');
		process.exit(1);
	}

	const headPath = join(root, 'cycle/events.jsonl');
	const head = existsSync(headPath) ? parseJsonl(readFileSync(headPath, 'utf8')) : [];
	const excess = reviewExcess(head, baseEvents(root, mb));
	if (excess.length) {
		console.error(`[review-cap] レビュー起動が上限を超えた ${JSON.stringify(excess)}`);
		process.exit(1);
	}
	console.log('[review-cap] レビュー起動は上限内');
}

const entry = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === entry) {
	runReviewCap(
		resolveReviewCapDataRoot({
			scriptUrl: import.meta.url,
			argv: process.argv,
			env: process.env
		})
	);
}
