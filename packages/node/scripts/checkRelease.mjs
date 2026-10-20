import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const failures = [];
if (!pkg.license || pkg.license === 'UNLICENSED' || !['LICENSE', 'LICENSE.md'].some((name) => existsSync(resolve(root, name)))) failures.push('Set the owner-approved license and include its license text.');
const repository = pkg.repository?.url;
if (typeof repository !== 'string' || !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(repository)) failures.push('Set repository.url to the actual public SDK GitHub repository.');
if (pkg.private === true) failures.push('The package is marked private.');
if (!readFileSync(resolve(root, 'src/version.ts'), 'utf8').includes(`'${pkg.version}'`)) failures.push('Client and package versions differ.');
if (!readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8').includes(pkg.version)) failures.push('Add the release version to CHANGELOG.md.');
if (!existsSync(resolve(root, 'package-lock.json'))) failures.push('Generate and validate the standalone npm lockfile.');
const expected = process.env.GITHUB_REPOSITORY;
if (expected && repository && repository.replace(/\.git$/, '') !== `https://github.com/${expected}`) failures.push('OIDC repository identity does not match package metadata.');
try { execFileSync(process.execPath, [resolve(root, 'scripts/auditPackage.mjs')], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] }); }
catch { failures.push('The package artifact audit did not pass.'); }
if (failures.length === 0) {
  // Anonymous, read-only probe. Never send a customer credential to a release check.
  try {
    const origin = 'https://api.insidedm.in';
    for (const [path, status] of [['/healthz/ready', 200], ['/v1/workspace', 401]]) {
      const response = await fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
      if (response.status !== status || response.redirected) throw new Error('unexpected deployment response');
      if (path.startsWith('/v1/') && !response.headers.get('content-type')?.includes('application/problem+json')) throw new Error('public contract is not deployed');
      void response.body?.cancel();
    }
  } catch { failures.push('The default production origin did not pass TLS, readiness and anonymous API contract probes.'); }
}
if (failures.length) { console.error('Release blocked:\n' + failures.map((message) => `- ${message}`).join('\n')); process.exitCode = 1; }
else console.log(`Release checks passed for ${pkg.name}@${pkg.version}. This check does not publish.`);
