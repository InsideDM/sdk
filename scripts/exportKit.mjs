import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--out') throw new Error('Usage: npm run export:kit -- --out /absolute/new-directory');
const target = resolve(args[1]);
if (target === root || target.startsWith(root + '/') || root.startsWith(target + '/') || existsSync(target)) throw new Error('Export requires a new directory outside the SDK package; existing destinations are never overwritten.');
const entries = ['src', 'tests', 'scripts', 'openapi', 'docs', 'examples', '.github', '.gitignore', 'package.json', 'tsconfig.json', 'README.md', 'CHANGELOG.md', 'PUBLICATION.md', 'CONTRIBUTING.md', 'SECURITY.md'];
for (const optional of ['package-lock.json', 'LICENSE', 'LICENSE.md']) if (existsSync(resolve(root, optional))) entries.push(optional);
const files = [];
function inspect(path) {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) throw new Error('Export refuses symlinks.');
  if (stat.isDirectory()) { for (const child of readdirSync(path)) inspect(resolve(path, child)); return; }
  const text = readFileSync(path, 'utf8');
  if (/['"]workspace:|\/Users\/|DATABASE_(?:APP|POOLER|LOCAL)_URL/.test(text) && !path.endsWith('auditPackage.mjs') && !path.endsWith('exportKit.mjs')) throw new Error(`Export refused a private reference in ${relative(root, path)}.`);
  files.push(relative(root, path));
}
for (const entry of entries) inspect(resolve(root, entry));
mkdirSync(target);
for (const entry of entries) cpSync(resolve(root, entry), resolve(target, entry), { recursive: true, errorOnExist: true, force: false });
console.log(`Public kit exported: ${target} (${files.length} allowlisted files). No Git repository, remote or publication was created.`);
