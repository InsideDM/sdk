import assert from 'node:assert/strict';
import {inspect} from 'node:util';
import test from 'node:test';
import {InsideDMConfigurationError} from '../dist/esm/index.js';
import {createTestClient, TEST_ID} from '../dist/esm/testing.js';

test('corrective fields are readable before network I/O and never echo supplied values', async () => {
  let requests = 0;
  const client = createTestClient({respond(_request, response) { requests++; return response; }});
  const cases = [
    ['to.phone', () => client.messages.send({to: {phone: 'private-phone'}, content: {type: 'text', text: 'Ready'}}), /E\.164/],
    ['content.text', () => client.messages.send({to: {phone: '+919800000099'}, content: {type: 'text', text: ''}}), /at least 1 character/],
    ['content.template.id', () => client.messages.send({to: {phone: '+919800000099'}, content: {type: 'template', template: {id: 'private-template'}}}), /UUID/],
    ['phone', () => client.contacts.create({name: 'Asha', phone: 'private-phone'}), /E\.164/],
    ['contactId', () => client.contacts.get('private-contact'), /UUID/],
    ['limit', () => client.contacts.list({limit: 0}), /at least 1/],
    ['timeoutMs', () => client.contacts.list({}, {timeoutMs: 0}), /1 to 120000/],
    ['tags', () => client.contacts.tags.replace(TEST_ID, {tags: new Array(51).fill('private-tag')}), /at most 50/],
    ['signal', () => client.contacts.list({}, {signal: 'private-signal'}), /AbortSignal/],
    ['subject.contactId', () => client.events.publish({id: 'event-1', binding: TEST_ID, subject: {contactId: 'private-contact'}}), /UUID/],
    ['idempotencyKey', () => client.events.publish({id: 'event-1', binding: TEST_ID, subject: {contactId: TEST_ID}}, {idempotencyKey: 'private-other-key'}), /input.id/],
  ];
  for (const [field, call, hint] of cases) {
    await assert.rejects(call, error => {
      assert.ok(error instanceof InsideDMConfigurationError);
      assert.equal(error.field, field); assert.match(error.message, hint);
      assert.equal(error.code, 'invalid_configuration');
      assert.equal(error.attempts, 0); assert.equal(error.requestId, null);
      assert.doesNotMatch(error.message + JSON.stringify(error) + inspect(error), /private-/);
      assert.match(inspect(error), hint);
      return true;
    });
  }
  assert.equal(requests, 0);
});

test('ambiguous recipient choices stay refused and caller-thrown errors are not diagnostic hints', async () => {
  let requests = 0;
  const client = createTestClient({respond(_request, response) { requests++; return response; }});
  await assert.rejects(client.messages.send({to: {phone: '+919800000099', contactId: TEST_ID}, content: {type: 'text', text: 'Ready'}}), error => {
    assert.equal(error.field, 'to'); assert.match(error.message, /exactly one/); return true;
  });
  const input = {get to() { throw new InsideDMConfigurationError('private-input', 'private-field'); }};
  await assert.rejects(client.messages.send(input), error => {
    assert.ok(error instanceof InsideDMConfigurationError);
    assert.doesNotMatch(error.message + JSON.stringify(error), /private-/); return true;
  });
  assert.equal(requests, 0);
});
