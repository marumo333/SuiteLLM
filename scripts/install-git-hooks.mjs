#!/usr/bin/env node
import { execSync, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

try {
	execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
} catch {
	process.exit(0);
}
execSync('git config core.hooksPath scripts/githooks', { stdio: 'inherit' });
const setup = spawnSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), 'setup-host.mjs')], {
	stdio: 'inherit',
});
if (typeof setup.status === 'number' && setup.status !== 0) process.exit(setup.status);
