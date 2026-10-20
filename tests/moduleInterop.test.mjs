import assert from 'node:assert/strict';
import test from 'node:test';
import {createRequire} from 'node:module';
import * as esm from '../dist/esm/index.js';
import * as webhookEsm from '../dist/esm/webhooks.js';
import * as testingEsm from '../dist/esm/testing.js';

test('import and require share every public runtime value, client constructor and error identity',()=>{
  const require=createRequire(import.meta.url);
  for(const [entry,imported] of [['index',esm],['webhooks',webhookEsm],['testing',testingEsm]]){
    const required=require(`../dist/cjs/${entry}.js`),names=Object.keys(required).filter(name=>name!=='__esModule').sort();
    assert.deepEqual(Object.keys(imported).sort(),names);
    for(const name of names)assert.equal(imported[name],required[name],`${entry}.${name}`);
  }
  const cjs=require('../dist/cjs/index.js'),client=testingEsm.createTestClient();
  assert.ok(client instanceof esm.InsideDM);assert.ok(client instanceof cjs.InsideDM);
  const error=new esm.InsideDMConfigurationError('Invalid test configuration.');assert.ok(error instanceof cjs.InsideDMConfigurationError);assert.ok(error instanceof cjs.InsideDMError);
});
