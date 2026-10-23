import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import {moduleSpecifiers} from './moduleSpecifiers.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const errors = [];
if (Object.keys(pkg.dependencies ?? {}).length || Object.keys(pkg.peerDependencies ?? {}).length) errors.push('Runtime dependencies require explicit publication review.');
if (/workspace:|file:|link:/.test(JSON.stringify(pkg))) errors.push('Private workspace dependencies are forbidden.');
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isSymbolicLink()) { errors.push('Symlinks cannot be shipped.'); continue; }
    if (entry.isDirectory()) { walk(path); continue; }
    if (!/\.(?:js|ts|json)$/.test(path)) { errors.push(`Unexpected build artifact: ${relative(root, path)}`); continue; }
    const text = readFileSync(path, 'utf8');
    if (/@insidedm\/(?!sdk(?:[/'"]|$))|['"]workspace:|\/Users\/|DATABASE_(?:APP|POOLER|LOCAL)_URL/.test(text)) errors.push(`Private reference in ${relative(root, path)}`);
    for (const specifier of /\.(?:js|ts)$/.test(path)?moduleSpecifiers(text,path):[]) {
      if(specifier===null){errors.push(`Computed module import in ${relative(root,path)}`);continue;}
      if (!specifier.startsWith('./') && !specifier.startsWith('../') && !specifier.startsWith('node:')) errors.push(`External import in ${relative(root, path)}`);
      if (specifier.startsWith('.') && !resolve(dirname(path), specifier).startsWith(resolve(root, 'dist') + '/')) errors.push('Build import escapes the published distribution.');
    }
  }
}
walk(resolve(root, 'dist'));
const cache = mkdtempSync(resolve(tmpdir(), 'insidedm-sdk-pack-audit-'));
let pack;
try {
  [pack] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--ignore-scripts', '--json', '--cache', cache], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
} finally { rmSync(cache, { recursive: true, force: true }); }
for (const { path } of pack.files) {
  if (!/^(?:dist\/(?:esm|cjs)\/[A-Za-z0-9_./-]+\.(?:js|ts|json)|dist\/shared\/contract\.json|openapi\/public-v1\.yaml|docs\/(?:n8n|business-reference|user-access)\.md|examples\/(?:n8nResourceBridge|asyncJobReceiver)\.mjs|examples\/n8n\/(?:sendNotification|startPublishedFlow|recoverOperation|flowWebhookAction)\.json|examples\/n8n\/README\.md|package\.json|README\.md|CHANGELOG\.md|PUBLICATION\.md|LICENSE(?:\.[A-Za-z]+)?)$/.test(path)) errors.push(`Non-allowlisted npm artifact: ${path}`);
}
// One runtime/declaration graph already avoids ESM/CJS duplication. Keep the
// complete canonical contract and readable OpenAPI/reference material as the
// supported surface grows; bound both installed bytes and download bytes.
// The installed kit includes complete generated contracts, declarations and
// guides. Keep its allowance separate from the unchanged download budget below.
if (pack.unpackedSize > 1536 * 1024) errors.push('Package exceeds the 1.5 MiB installed distribution budget.');
if (pack.size > 256 * 1024) errors.push('Package exceeds the 256 KiB compressed download budget.');
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Package audited: ${pack.files.length} allowlisted files, ${pack.unpackedSize} installed bytes, ${pack.size} compressed bytes, zero runtime dependencies.`);
