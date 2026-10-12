#!/usr/bin/env node
/** 重ならないスライスの同時実行を判定する。Task は起動しない。 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planParallelSlices } from './lib/parallel-slices.mjs';

const ROOT = process.env.HARNESS_ROOT || join(dirname(fileURLToPath(import.meta.url)), '..');

function arg(name) {
	const i = process.argv.indexOf(`--${name}`);
	return i >= 0 ? process.argv[i + 1] : null;
}

const planPath = arg('plan');
const raw = planPath ? readFileSync(planPath, 'utf8') : readFileSync(0, 'utf8');
let plan;
try {
	plan = JSON.parse(raw);
} catch {
	process.stderr.write('計画の JSON が読めない\n');
	process.exit(1);
}

const routingText = readFileSync(join(ROOT, 'cycle', 'model-routing.yaml'), 'utf8');
const result = planParallelSlices(plan, { routingText });
process.stdout.write(`${JSON.stringify(result)}\n`);
process.exit(result.ok ? 0 : 1);
