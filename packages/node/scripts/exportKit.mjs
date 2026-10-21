import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--out') throw new Error('Usage: npm run export:kit -- --out /absolute/new-directory');
const target = resolve(args[1]);
if (target === root || target.startsWith(root + '/') || root.startsWith(target + '/') || existsSync(target)) throw new Error('Export requires a new directory outside the SDK package; existing destinations are never overwritten.');
const entries = ['src', 'tests', 'scripts', 'openapi', 'docs/business-reference.md', 'docs/n8n.md', 'examples/n8nResourceBridge.mjs', 'examples/asyncJobReceiver.mjs', 'examples/n8n', '.gitignore', 'package.json', 'tsconfig.json', 'README.md', 'CHANGELOG.md', 'PUBLICATION.md', 'CONTRIBUTING.md', 'SECURITY.md'];
for (const optional of ['package-lock.json', 'LICENSE', 'LICENSE.md']) if (existsSync(resolve(root, optional))) entries.push(optional);
const templates = existsSync(resolve(root, 'repository')) ? resolve(root, 'repository') : resolve(root, '../..');
const github = existsSync(resolve(root, '.github')) ? resolve(root, '.github') : resolve(templates, '.github');
const copies = entries.map(entry => ({source: resolve(root, entry), destination: `packages/node/${entry}`}));
for (const license of ['LICENSE', 'LICENSE.md']) if (existsSync(resolve(root, license))) copies.push({source: resolve(root, license), destination: license});
copies.push(
  {source: resolve(templates, 'README.md'), destination: 'README.md'},
  {source: resolve(templates, 'CONTRIBUTING.md'), destination: 'CONTRIBUTING.md'},
  {source: resolve(root, 'SECURITY.md'), destination: 'SECURITY.md'},
  {source: resolve(root, '.gitignore'), destination: '.gitignore'},
  {source: github, destination: '.github'},
);
const python = [resolve(root, '../sdk-python'), resolve(root, '../python')].find(path => existsSync(resolve(path, 'pyproject.toml')));
if (!python) throw new Error('The implemented sibling Python SDK is required; no placeholder is exported.');
for (const entry of ['src', 'scripts', 'tests', 'docs', '.gitignore', 'pyproject.toml', 'README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'PUBLICATION.md', 'LICENSE']) {
  copies.push({source: resolve(python, entry), destination: `packages/python/${entry}`});
}
const allowed = path => !['__pycache__', '.venv', '.pytest_cache', '.mypy_cache', 'dist', 'node_modules', '.git'].includes(basename(path)) && !/\.py[co]$/.test(path);
const files = [];
function inspect(path) {
  if (!allowed(path)) return;
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) throw new Error('Export refuses symlinks.');
  if (stat.isDirectory()) { for (const child of readdirSync(path)) inspect(resolve(path, child)); return; }
  const text = readFileSync(path, 'utf8');
  if (/['"]workspace:|\/Users\/|DATABASE_(?:APP|POOLER|LOCAL)_URL/.test(text) && !path.endsWith('auditPackage.mjs') && !path.endsWith('exportKit.mjs')) throw new Error(`Export refused a private reference in ${relative(root, path)}.`);
  files.push(relative(root, path));
}
for (const copy of copies) inspect(copy.source);
mkdirSync(target);
for (const copy of copies) {
  const destination = resolve(target, copy.destination);
  mkdirSync(dirname(destination), {recursive: true});
  cpSync(copy.source, destination, {recursive: true, errorOnExist: true, force: false, filter: allowed});
}
console.log(`Public kit exported: ${target} (${files.length} allowlisted files). No Git repository, remote or publication was created.`);
