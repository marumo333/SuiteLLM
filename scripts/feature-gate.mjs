#!/usr/bin/env node
/**
 * OPA の検査と契約、レビュー上限。Feature 票は使わない。
 * canon の一覧は opa test が検査する。差分の被覆には使わない。
 * 子スクリプトは import.meta.url の隣。policy と契約と events の根は HARNESS_ROOT。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ensureOpa } from './ensure-opa.mjs';

/**
 * 検査ロジックの位置と、読むツリーの根を分ける。
 * policy はデータ根の policy/。OPA_POLICY_DIR が無いとき、スクリプトの隣には固定しない。
 * @param {string} scriptUrl
 * @param {NodeJS.ProcessEnv} [env]
 */
export function resolveGateLayout(scriptUrl, env = process.env) {
	const scriptDir = dirname(fileURLToPath(scriptUrl));
	const dataRoot = env.HARNESS_ROOT || join(scriptDir, '..');
	const policy = env.OPA_POLICY_DIR || join(dataRoot, 'policy');
	return {
		scriptDir,
		dataRoot,
		policy,
		contractCheck: join(scriptDir, 'contract-check.mjs'),
		reviewCapCheck: join(scriptDir, 'review-cap-check.mjs')
	};
}

const layout = resolveGateLayout(import.meta.url);
const ROOT = layout.dataRoot;
const POLICY = layout.policy;
const FORBIDDEN_LEARNED_BUILTIN = /\b(http\.send|opa\.runtime|net\.lookup_ip_addr|io\.jwt)\b/;
const PACKAGE_HOME = {
	'harness.canon': 'canon.rego',
	'harness.canon_test': 'canon_test.rego',
	'cycle.admission': 'cycle.rego',
	'cycle.admission_test': 'cycle_test.rego',
	'packet.canon': 'packet.rego',
	'packet.canon_test': 'packet_test.rego'
};

const args = process.argv.slice(2);
const testOnly = args.includes('--test');

let opa;

function fail(msg) {
	console.error(`[feature-gate] 失敗 ${msg}`);
	process.exit(1);
}

function opaJson(opaArgs) {
	const out = execFileSync(opa, opaArgs, { encoding: 'utf8', cwd: ROOT });
	return JSON.parse(out);
}

const PACKAGE_HOME_FILES = new Set(Object.values(PACKAGE_HOME));
const RESOLVED_NS = {
	'data.harness.canon': 'canon.rego',
	'data.harness.canon_test': 'canon_test.rego',
	'data.cycle.admission': 'cycle.rego',
	'data.cycle.admission_test': 'cycle_test.rego',
	'data.packet.canon': 'packet.rego',
	'data.packet.canon_test': 'packet_test.rego'
};

function walkRego(dir, fn) {
	if (!existsSync(dir)) return;
	for (const ent of readdirSync(dir, { withFileTypes: true })) {
		const p = join(dir, ent.name);
		if (ent.isSymbolicLink()) {
			fail(`policy 配下の symlink は拒否: ${relative(POLICY, p)}`);
		}
		if (ent.isDirectory()) walkRego(p, fn);
		else if (ent.name.endsWith('.rego')) fn(p);
	}
}

function relToPolicy(p) {
	const raw = String(p).replaceAll('\\', '/');
	const candidates = [raw.startsWith('/') ? raw : resolve(ROOT, raw), join(POLICY, raw), resolve(POLICY, raw)];
	for (const abs of candidates) {
		const rel = relative(POLICY, abs).replaceAll('\\', '/');
		if (rel && !rel.startsWith('..') && !rel.startsWith('/')) return rel;
	}
	fail(`opa inspect のパスが policy 配下に無い: ${p}`);
}

function assertResolvedNamespaces() {
	let parsed;
	try {
		parsed = opaJson(['inspect', '-f', 'json', POLICY]);
	} catch (e) {
		fail(`opa inspect が失敗: ${e.message || e}`);
	}
	const ns = parsed.namespaces || {};
	for (const [name, home] of Object.entries(RESOLVED_NS)) {
		const files = (ns[name] || []).map(relToPolicy);
		if (files.length !== 1 || files[0] !== home) {
			fail(`名前空間 ${name} の正本は ${home} のみ（実際 ${JSON.stringify(files)}）`);
		}
	}
	for (const [name, files] of Object.entries(ns)) {
		if (name.startsWith('data.learned.')) {
			const leaked = (files || []).map(relToPolicy).filter((rel) => !rel.startsWith('learned/'));
			if (leaked.length) fail(`learned 名前空間 ${name} が learned/ 外: ${JSON.stringify(leaked)}`);
			continue;
		}
		if (RESOLVED_NS[name]) continue;
		fail(`未知の名前空間 ${name}: ${JSON.stringify(files)}`);
	}
}

function assertPolicyIsolation() {
	walkRego(POLICY, (abs) => {
		const rel = relative(POLICY, abs).replaceAll('\\', '/');
		const text = readFileSync(abs, 'utf8');
		if (FORBIDDEN_LEARNED_BUILTIN.test(text)) {
			fail(`policy/${rel} は http.send / opa.runtime / net.lookup_ip_addr / io.jwt を使えない`);
		}
		if (!rel.startsWith('learned/') && !PACKAGE_HOME_FILES.has(rel)) {
			fail(`policy/${rel} は許可された正本ファイルではない`);
		}
	});
	assertResolvedNamespaces();
}

function runOpaTest() {
	assertPolicyIsolation();
	try {
		execFileSync(opa, ['test', POLICY, '-v'], { stdio: 'inherit', cwd: ROOT });
	} catch (e) {
		fail(`opa test が失敗（終了コード ${e.status ?? '不明'}）`);
	}
}

const entry = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === entry) {
	opa = ensureOpa();
	runOpaTest();
	if (testOnly) {
		console.log('[feature-gate] opa test 成功');
		process.exit(0);
	}

	execFileSync(process.execPath, [layout.contractCheck, layout.dataRoot], {
		stdio: 'inherit',
		cwd: ROOT
	});
	execFileSync(process.execPath, [layout.reviewCapCheck, layout.dataRoot], {
		stdio: 'inherit',
		cwd: ROOT,
		env: { ...process.env, HARNESS_ROOT: layout.dataRoot }
	});

	console.log('[feature-gate] 成功');
}
