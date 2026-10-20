import test from 'node:test';
import assert from 'node:assert/strict';
import {moduleSpecifiers} from '../scripts/moduleSpecifiers.mjs';

test('package audit distinguishes data fields and prose from real module syntax',()=>{
  assert.deepEqual(moduleSpecifiers('const fields = ["from", "to"]; const schema = { "from": { type: "string" } }; const text = "from external-package";','data.js'),[]);
  assert.deepEqual(moduleSpecifiers('import {readFile} from "node:fs"; export {client} from "./client.js"; const m = require("../module.js"); await import("external-package");','module.js'),['node:fs','./client.js','../module.js','external-package']);
});
test('audit sees escaped literals, declaration references and computed loaders rather than trusting string matching',()=>{
  assert.deepEqual(moduleSpecifiers('import type {A} from "external-package"; type T = import("./types.js").T; import X = require("other-package");','types.d.ts'),['external-package','./types.js','other-package']);
  assert.deepEqual(moduleSpecifiers('const x = require("external\\x2dpackage"); module.require("another-package"); require.resolve("third-package"); import(destination);','module.js'),['external-package','another-package','third-package',null]);
});
