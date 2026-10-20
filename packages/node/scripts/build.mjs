import { readFile, readdir, mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const check = process.argv.includes('--check');
const configPath = path.join(root, 'tsconfig.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
if (parsed.errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(parsed.errors, host()));
if (!check) await rm(path.join(root, 'dist'), { recursive: true, force: true });

for (const format of ['esm', 'cjs']) {
  const outDir = path.join(root, 'dist', format);
  const options = {
    ...parsed.options,
    outDir,
    noEmit: check,
    module: format === 'esm' ? ts.ModuleKind.NodeNext : ts.ModuleKind.CommonJS,
    moduleResolution: format === 'esm' ? ts.ModuleResolutionKind.NodeNext : ts.ModuleResolutionKind.Node10,
  };
  const program = ts.createProgram(parsed.fileNames, options);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) {
    process.stderr.write(ts.formatDiagnosticsWithColorAndContext(diagnostics, host()));
    process.exitCode = 1;
    break;
  }
  if (!check) {
    const emitted = program.emit();
    if (emitted.emitSkipped) throw new Error(`Failed to emit ${format}.`);
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, 'package.json'), `${JSON.stringify({ type: format === 'esm' ? 'module' : 'commonjs' })}\n`);
  }
}
if (!process.exitCode) {
  if(!check){
    // ESM and CommonJS share the same immutable contract data. Keep both public
    // entrypoints and all runtime validation.
    const literal=async(file,name)=>{
      const text=await readFile(path.join(root,'src','generated',file),'utf8'),source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
      const declarations=source.statements.filter(ts.isVariableStatement).flatMap(statement=>[...statement.declarationList.declarations]);
      const value=declarations.find(declaration=>ts.isIdentifier(declaration.name)&&declaration.name.text===name)?.initializer;
      if(!value||!ts.isObjectLiteralExpression(value))throw new Error(`Expected generated JSON data for ${name}.`);
      return JSON.parse(value.getText(source));
    };
    const data={schemas:await literal('schemas.ts','SCHEMAS'),operations:await literal('operations.ts','PUBLIC_OPERATIONS')};
    await mkdir(path.join(root,'dist','shared'),{recursive:true});
    await writeFile(path.join(root,'dist','shared','contract.json'),JSON.stringify(data)+'\n');
    for(const [file,name,field] of [['schemas.js','SCHEMAS','schemas'],['operations.js','PUBLIC_OPERATIONS','operations']]){
      await writeFile(path.join(root,'dist','esm','generated',file),`import contract from '../../shared/contract.json' with { type: 'json' };\nexport const ${name} = contract.${field};\n`);
      await writeFile(path.join(root,'dist','cjs','generated',file),`'use strict';\nObject.defineProperty(exports, '__esModule', { value: true });\nexports.${name} = require('../../shared/contract.json').${field};\n`);
    }
  }
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  if (!check) {
    await writeEsmEntrypointWrappers(pkg);
    await prunePrivateDeclarations(pkg);
    await prunePrivateRuntimeModules(pkg);
    await stripRuntimeComments(path.join(root, 'dist'));
  }
  process.stdout.write(`${pkg.name}: ${check ? 'typechecked' : 'built'} ESM and CJS.\n`);
}

// One runtime graph keeps client/error constructors identical across import
// and require, and avoids shipping two copies of every transport/validator.
// Retain independent native declarations for NodeNext and CommonJS consumers.
async function writeEsmEntrypointWrappers(pkg){
  const entries=new Set();
  const collect=value=>{
    if(typeof value==='string'&&value.startsWith('./dist/esm/')&&value.endsWith('.js'))entries.add(value);
    else if(value&&typeof value==='object')Object.values(value).forEach(collect);
  };
  collect(pkg.module);collect(pkg.exports);
  if(!entries.size)throw new Error('Public ESM entrypoints are missing.');
  for(const entry of entries){
    const emitted=path.resolve(root,entry),relative=path.relative(path.join(root,'dist','esm'),emitted);
    if(relative.startsWith('..')||path.isAbsolute(relative))throw new Error('ESM entrypoint escapes distribution.');
    // Use emitted JS: TypeScript's symbol table can expose values reached only
    // through `export type *`, which must never become runtime exports.
    const source=ts.createSourceFile(entry,await readFile(emitted,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),exports=new Set();
    for(const statement of source.statements){
      if(ts.isExportDeclaration(statement)){
        if(!statement.exportClause||!ts.isNamedExports(statement.exportClause))throw new Error(`Unsupported export-star in ${entry}.`);
        for(const item of statement.exportClause.elements)exports.add(item.name.text);
      }else if(ts.isExportAssignment(statement))throw new Error(`Unsupported default export in ${entry}.`);
      else if(statement.modifiers?.some(modifier=>modifier.kind===ts.SyntaxKind.ExportKeyword)){
        if(ts.isVariableStatement(statement))for(const declaration of statement.declarationList.declarations){
          if(!ts.isIdentifier(declaration.name))throw new Error(`Unsupported export binding in ${entry}.`);exports.add(declaration.name.text);
        }else if((ts.isFunctionDeclaration(statement)||ts.isClassDeclaration(statement))&&statement.name)exports.add(statement.name.text);
        else throw new Error(`Unsupported runtime export in ${entry}.`);
      }
    }
    const names=[...exports].sort();
    if(!names.length||names.some(name=>name==='default'||!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)))throw new Error(`Unsupported runtime export in ${entry}.`);
    const cjs=path.join(root,'dist','cjs',relative);await readFile(cjs,'utf8');
    const specifier=path.relative(path.dirname(emitted),cjs).split(path.sep).join('/');
    const body=`import runtime from ${JSON.stringify(specifier.startsWith('.')?specifier:'./'+specifier)};\n`+
      names.map(name=>`export const ${name} = runtime.${name};\n`).join('');
    await writeFile(emitted,body);
  }
}

// Runtime factories need emitted JavaScript, but their declarations only belong
// in the package when a public type depends on them. Follow the manifest rather
// than maintaining a second list of public entrypoints.
async function prunePrivateDeclarations(pkg) {
  const dist = path.join(root, 'dist');
  const pending = [];
  const collect = value => {
    if (typeof value === 'string' && /\.d\.[cm]?ts$/.test(value)) pending.push(path.resolve(root, value));
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  };
  collect(pkg.types);
  collect(pkg.exports);
  if (!pending.length) throw new Error('SDK public declaration entrypoints are missing.');
  const reachable = new Set();
  while (pending.length) {
    const file = pending.pop();
    if (reachable.has(file)) continue;
    if (!file.startsWith(`${dist}${path.sep}`)) throw new Error(`Declaration escapes dist: ${file}`);
    const text = await readFile(file, 'utf8');
    reachable.add(file);
    const info = ts.preProcessFile(text, true, true);
    for (const reference of info.referencedFiles) pending.push(path.resolve(path.dirname(file), reference.fileName));
    for (const dependency of info.importedFiles) {
      if (!dependency.fileName.startsWith('.')) continue;
      const resolved = ts.resolveModuleName(dependency.fileName, file, {
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        resolveJsonModule: true,
      }, ts.sys).resolvedModule;
      if (!resolved) throw new Error(`Missing public type dependency ${dependency.fileName} in ${file}`);
      if (/\.d\.[cm]?ts$/.test(resolved.resolvedFileName)) pending.push(path.resolve(resolved.resolvedFileName));
      else if (!resolved.resolvedFileName.endsWith('.json')) throw new Error(`Public type dependency is not a declaration: ${resolved.resolvedFileName}`);
    }
  }
  const prune = async directory => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await prune(file);
      else if (/\.d\.[cm]?ts$/.test(file) && !reachable.has(file)) await rm(file);
    }
  };
  await prune(dist);
}

// Type-only contract dependencies emit JavaScript even when no public runtime
// entrypoint imports it. Remove those modules, following actual ESM imports and
// CommonJS requires. The package audit separately refuses computed loaders.
async function prunePrivateRuntimeModules(pkg) {
  const dist = path.join(root, 'dist'), pending = [], reachable = new Set();
  const collect = value => {
    if (typeof value === 'string' && /\.[cm]?js$/.test(value)) pending.push(path.resolve(root, value));
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  };
  collect(pkg.main); collect(pkg.module); collect(pkg.exports);
  if (!pending.length) throw new Error('SDK public runtime entrypoints are missing.');
  while (pending.length) {
    const file = pending.pop();
    if (reachable.has(file)) continue;
    if (!file.startsWith(`${dist}${path.sep}`)) throw new Error(`Runtime dependency escapes dist: ${file}`);
    const text = await readFile(file, 'utf8');
    reachable.add(file);
    if (file.endsWith('.json')) continue;
    for (const dependency of ts.preProcessFile(text, true, true).importedFiles) {
      if (dependency.fileName.startsWith('.')) pending.push(path.resolve(path.dirname(file), dependency.fileName));
    }
  }
  const prune = async directory => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await prune(file);
      else if (/\.[cm]?js$/.test(file) && !reachable.has(file)) await rm(file);
    }
  };
  await prune(dist);
}

function host() {
  return { getCanonicalFileName: (file) => file, getCurrentDirectory: () => root, getNewLine: () => '\n' };
}

// Keep editor-facing JSDoc in declarations. Runtime copies do not need the same
// comments; parse/print JS so strings, regular expressions and module syntax stay intact.
async function stripRuntimeComments(directory) {
  const printer = ts.createPrinter({removeComments: true, newLine: ts.NewLineKind.LineFeed});
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await stripRuntimeComments(file);
    else if (file.endsWith('.js')) {
      const source = ts.createSourceFile(file, await readFile(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
      if (source.parseDiagnostics.length) throw new Error('Cannot parse emitted runtime JavaScript.');
      await writeFile(file, printer.printFile(source));
    }
  }
}
