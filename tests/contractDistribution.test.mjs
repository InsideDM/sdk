import assert from 'node:assert/strict';
import test from 'node:test';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import {SCHEMAS} from '../dist/esm/generated/schemas.js';
import {PUBLIC_OPERATIONS} from '../dist/esm/generated/operations.js';

test('packed ESM and CommonJS retain every authoritative schema and operation value in shared contract data',async()=>{
  const require=createRequire(import.meta.url),shared=JSON.parse(await readFile(new URL('../dist/shared/contract.json',import.meta.url),'utf8'));
  for(const [file,name,field,esm] of [['schemas','SCHEMAS','schemas',SCHEMAS],['operations','PUBLIC_OPERATIONS','operations',PUBLIC_OPERATIONS]]){
    const raw=await readFile(new URL(`../src/generated/${file}.ts`,import.meta.url),'utf8'),source=ts.createSourceFile(file+'.ts',raw,ts.ScriptTarget.Latest,true);
    const declaration=source.statements.filter(ts.isVariableStatement).flatMap(item=>[...item.declarationList.declarations]).find(item=>ts.isIdentifier(item.name)&&item.name.text===name);
    assert.ok(declaration?.initializer&&ts.isObjectLiteralExpression(declaration.initializer));
    const authoritative=JSON.parse(declaration.initializer.getText(source));
    assert.deepEqual(shared[field],authoritative);assert.deepEqual(esm,authoritative);
    assert.deepEqual(require(`../dist/cjs/generated/${file}.js`)[name],authoritative);
  }
});
