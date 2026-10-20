import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { parse } from 'yaml';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = (command, args, cwd) => execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000,
  env: { ...process.env, npm_config_cache: resolve(cwd, '.artifacts/npm-cache') } });

test('the distributed OpenAPI document resolves all local references, including non-success responses', () => {
  const document = parse(readFileSync(resolve(root, 'openapi/public-v1.yaml'), 'utf8')); let references = 0;
  const seen = new WeakSet();
  const visit = value => {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (typeof value.$ref === 'string') {
      references++; assert.ok(value.$ref.startsWith('#/'), `Unreviewed external reference ${value.$ref}`);
      let target = document;
      for (const encoded of value.$ref.slice(2).split('/')) {
        const key = encoded.replace(/~1/g, '/').replace(/~0/g, '~');
        assert.ok(target && typeof target === 'object' && Object.hasOwn(target, key), `Unresolved reference ${value.$ref}`);
        target = target[key];
      }
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(document); assert.ok(references > 0);
});

test('packed consumers resolve all entrypoints in ESM, CJS, NodeNext and Bundler without private packages', { timeout: 90_000 }, () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'insidedm-sdk-consumer-'));
  try {
    run(process.execPath, ['scripts/auditPackage.mjs'], root);
    const [pack] = JSON.parse(run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', dir], root));
    writeFileSync(resolve(dir, 'package.json'), JSON.stringify({ name: 'sdk-consumer', private: true, type: 'module' }));
    run('npm', ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', resolve(dir, pack.filename)], dir);
    assert.ok(pack.files.some(file => file.path === 'docs/n8n.md'));
    assert.equal(pack.files.some(file => /docs\/(?:partner-|client-provisioning|hosted-onboarding|blueprints)|managedRolloutWorker/.test(file.path)), false);
    writeFileSync(resolve(dir, 'n8nResourceBridge.mjs'), readFileSync(resolve(dir, 'node_modules/@insidedm/sdk/examples/n8nResourceBridge.mjs')));
    const esm = `import { InsideDM, InsideDMPlatform, InsideDMError } from '@insidedm/sdk';
import {createRequire} from 'node:module';
const requiredSdk=createRequire(import.meta.url)('@insidedm/sdk');
if(requiredSdk.InsideDM!==InsideDM||requiredSdk.InsideDMPlatform!==InsideDMPlatform||requiredSdk.InsideDMError!==InsideDMError)throw Error('mixed module identities');
import { createN8nResourceBridge } from './n8nResourceBridge.mjs';
import { constructWebhookEvent } from '@insidedm/sdk/webhooks';
import { createTestClient, createWebhookFixture } from '@insidedm/sdk/testing';
if (typeof InsideDM !== 'function' || typeof InsideDMPlatform !== 'function' || typeof InsideDMError !== 'function' || typeof constructWebhookEvent !== 'function') throw Error('exports');
const platform = new InsideDMPlatform({ apiKey: 'idmp_' + 'A'.repeat(16) + '_' + 'A'.repeat(43) });
if (typeof platform.forBusiness('00000000-0000-4000-8000-000000000001').messages.send !== 'function') throw Error('platform exports');
if (typeof platform.installationRequests.create !== 'function' || typeof platform.installationRequests.get !== 'function') throw Error('consent exports');
if (typeof platform.self.get !== 'function') throw Error('self export');
if (typeof platform.installations.get !== 'function' || typeof platform.installations.revoke !== 'function') throw Error('installation exports');
if (typeof platform.businesses.iterate !== 'function' || typeof platform.businesses.get !== 'function') throw Error('portfolio exports');
if (typeof platform.usage.get !== 'function') throw Error('usage export');
if (typeof platform.forBusiness('00000000-0000-4000-8000-000000000001').usage.get !== 'function') throw Error('business usage export');
if (typeof platform.businesses.create !== 'function' || typeof platform.businessCreations.get !== 'function' || typeof platform.businessCreations.renewClaimLink !== 'function') throw Error('provisioning exports');
if (typeof platform.onboarding.create !== 'function' || typeof platform.onboarding.get !== 'function') throw Error('onboarding exports');
await createTestClient().workspace.get();
const bridgeProbe = createWebhookFixture({ type: 'future.event', version: 99 });
const receive = createN8nResourceBridge({ receiverId: '00000000-0000-4000-8000-000000000001', identity: { businessId: '00000000-0000-4000-8000-000000000001' }, secret: bridgeProbe.secret, accept: async () => { throw Error('unknown event queued'); } });
if ((await receive(new Request('https://backend.example/events', { method: 'POST', headers: { 'x-insidedm-signature': bridgeProbe.signature }, body: bridgeProbe.rawBody }))).status !== 204) throw Error('installed bridge');
if (!createWebhookFixture({}).signature) throw Error('testing export');`;
    writeFileSync(resolve(dir, 'consumer.mjs'), esm);
    run(process.execPath, ['consumer.mjs'], dir);
    writeFileSync(resolve(dir, 'consumer.cjs'), `const { InsideDM, InsideDMPlatform } = require('@insidedm/sdk');
const { constructWebhookEvent } = require('@insidedm/sdk/webhooks');
const { createTestClient } = require('@insidedm/sdk/testing');
if (typeof InsideDM !== 'function' || typeof InsideDMPlatform !== 'function' || typeof constructWebhookEvent !== 'function') throw Error('exports');
if (typeof new InsideDMPlatform({ apiKey: 'idmp_' + 'A'.repeat(16) + '_' + 'A'.repeat(43) }).installationRequests.create !== 'function') throw Error('consent exports');
if (typeof new InsideDMPlatform({ apiKey: 'idmp_' + 'A'.repeat(16) + '_' + 'A'.repeat(43) }).onboarding.create !== 'function') throw Error('onboarding exports');
createTestClient().workspace.get().catch(() => { process.exitCode = 1; });`);
    run(process.execPath, ['consumer.cjs'], dir);
    const ts = `import { InsideDM, InsideDMPlatform, type BusinessClient, type PublicContact, type PageResult } from '@insidedm/sdk';
import { constructWebhookEvent } from '@insidedm/sdk/webhooks';
import { createTestClient } from '@insidedm/sdk/testing';
const sdk: InsideDM = createTestClient();
async function check() {
  const platform = new InsideDMPlatform({ apiKey: 'example' });
  // @ts-expect-error the SDK manages its API endpoint
  new InsideDM({ apiKey: 'example', baseUrl: 'https://other.example' });
  // @ts-expect-error the SDK manages its API endpoint
  new InsideDMPlatform({ apiKey: 'example', baseUrl: 'https://other.example' });
  const setup = await platform.self.get();
  const applicationName: string = setup.data.application.name;
  const returnTargets: string[] = setup.data.returnUrls;
  const installation = await platform.installations.get('00000000-0000-4000-8000-000000000001');
  const revoked = await platform.installations.revoke(installation.data.id, { expectedRevision: installation.data.revision, reason: 'requested' });
  const currentState: 'active' | 'revoked' | 'suspended' = revoked.data.status;
  for await (const client of platform.businesses.iterate({ limit: 10 }, { maxItems: 2 })) { const businessName: string = client.name; }
  const profile = await platform.businesses.get('00000000-0000-4000-8000-000000000001');
  const profileState: 'active' | 'suspended' = profile.data.status;
  const usage = await platform.usage.get({ businessId: profile.data.id, from: '2026-10-01', to: new Date('2026-10-02T00:00:00Z') });
  const telemetryBasis: 'telemetry' = usage.data.basis;
  const admittedRequests: number = usage.data.totalAdmitted;
  const softwareUsage = await platform.forBusiness(profile.data.id).usage.get({ from: new Date('2026-10-01T00:00:00Z'), to: '2026-10-02T00:00:00Z' });
  const softwareAttribution: 'business' = softwareUsage.data.attribution;
  const provisionalUsage: 'provisional' = softwareUsage.data.finality;
  const observedTokens: number = softwareUsage.data.ai.inputTokens;
  const limits = await platform.forBusiness(profile.data.id).usage.getLimits();
  const catalog = await platform.forBusiness(profile.data.id).flows.templates.catalog({ limit: 25 });
  const templateVersion: string | undefined = catalog.data.templates[0]?.version;
  const draft = await sdk.flows.templates.import('lead-capture', { version: '1' }, { idempotencyKey: 'import/client1/v1' });
  const draftOnly: 'draft' = draft.data.status;
  const deployment = await sdk.flows.deployments.get(draft.data.recipeId);
  const originalPack: string = deployment.data.source.kind === 'internal_template' ? deployment.data.source.packId : deployment.data.source.template.packId;
  const drift: 'unchanged' | 'modified' | 'missing' | 'unavailable' = deployment.data.draft.state;
  // @ts-expect-error imports accept a version and references, never a caller graph
  await sdk.flows.templates.import('lead-capture', { version: '1', graph: {} });
  // @ts-expect-error catalog reads do not accept an idempotency key
  await sdk.flows.templates.catalog({}, { idempotencyKey: 'unused' });
  const agentPlaces: number | 'all' = limits.data.limits.agentSlots;
  const includedAiPaise: string = limits.data.limits.includedAi.amountMinor;
  const creation = await platform.businesses.create({ externalId: 'client_123', name: 'New client', returnUrl: 'https://partner.example/claim' }, { idempotencyKey: 'create/client_123' });
  const claimLink: string | null = creation.data.claimUrl;
  const creationOutcome = await platform.businessCreations.get(creation.data.id);
  const replaced = await platform.businessCreations.renewClaimLink(creation.data.id, { expectedRevision: creationOutcome.data.revision });
  const replacementLink: string | null = replaced.data.claimUrl;
  const channelSetup = await platform.onboarding.create({ businessId: profile.data.id, provider: 'whatsapp', returnUrl: 'https://partner.example/setup' });
  const channelSetupLink: string | null = channelSetup.data.url;
  const channelSetupOutcome = await platform.onboarding.get(channelSetup.data.id);
  const channelPurpose: 'connect' = channelSetupOutcome.data.purpose;
  const receiver = await platform.subscriptions.create({ name: 'Client events', url: 'https://partner.example/events', events: ['contact.changed'] });
  const receiverSecret: string | null = receiver.data.signingSecret;
  const receiverId: string = receiver.data.subscription.id;
  const verifiedReceiver = await platform.subscriptions.verify(receiverId, { expectedRevision: receiver.data.subscription.revision });
  await platform.subscriptions.activate(receiverId, { expectedRevision: verifiedReceiver.data.revision });
  const receiverHealth = await platform.subscriptions.getHealth(receiverId, { businessId: profile.data.id });
  const receiverHealthState: 'unknown' | 'healthy' | 'warning' | 'failing' = receiverHealth.data.health;
  if (receiverHealth.data.receiverStatus === 'paused' && receiverHealth.data.revision !== null) {
    await platform.subscriptions.recover(receiverId, { businessId: profile.data.id, expectedRevision: receiverHealth.data.revision }, { idempotencyKey: 'recover/client' });
  }
  // @ts-expect-error receiver recovery must review a health revision
  platform.subscriptions.recover(receiverId, { businessId: profile.data.id });
  const deliveryHistory = await platform.subscriptions.deliveries.list(receiverId, { businessId: profile.data.id, from: new Date(), status: 'failed' });
  const deliveryRecord: import('@insidedm/sdk').PartnerWebhookDelivery = deliveryHistory.data[0]!;
  const deliveryDetail = await platform.subscriptions.deliveries.get(receiverId, deliveryRecord.id, { businessId: profile.data.id });
  const deliveryAttemptCount: number = deliveryDetail.data.attempts.length;
  await platform.subscriptions.deliveries.replay(receiverId, deliveryRecord.id, { businessId: profile.data.id, reason: 'receiver_recovered' }, { idempotencyKey: 'replay/stable' });
  for await (const record of platform.subscriptions.deliveries.iterate(receiverId, { businessId: profile.data.id }, { maxItems: 10 })) { const deliveryHandle: string = record.id; }
  // @ts-expect-error diagnostic reads require the merchant target
  platform.subscriptions.getHealth(receiverId, {});
  // @ts-expect-error replay cannot invent current approval
  platform.subscriptions.deliveries.replay(receiverId, deliveryRecord.id, { businessId: profile.data.id, reason: 'receiver_recovered', approved: true });
  // @ts-expect-error a receiver cannot invent merchant approval or an authorizer
  platform.subscriptions.create({ name: 'Client events', url: 'https://partner.example/events', events: ['contact.changed'], approved: true });
  // @ts-expect-error unkeyed receiver verification does not accept a retry intent
  platform.subscriptions.verify(receiverId, { expectedRevision: '1' }, { idempotencyKey: 'not-retained' });
  // @ts-expect-error application credentials cannot approve provider setup as a merchant
  platform.onboarding.approve(channelSetup.data.id);
  // @ts-expect-error provider setup cannot invent an approving person or sender
  platform.onboarding.create({ businessId: profile.data.id, provider: 'whatsapp', returnUrl: 'https://partner.example/setup', actorUserId: 'invented' });
  // @ts-expect-error creation cannot invent an owner identity
  platform.businesses.create({ externalId: 'client_123', name: 'New client', returnUrl: 'https://partner.example/claim', ownerEmail: 'invented@example.test' });
  // @ts-expect-error application credentials cannot claim merchant ownership
  platform.businessCreations.claim(creation.data.id);
  // @ts-expect-error API telemetry cannot select another producer
  platform.usage.get({ businessId: profile.data.id, installationId: '00000000-0000-4000-8000-000000000001' });
  // @ts-expect-error application clients cannot grant themselves access
  platform.installations.approve(installation.data.id);
  const scopeSelection = ['contacts.read', 'messages.send'] as const;
  const request = await platform.installationRequests.create({ scopes: scopeSelection, returnUrl: 'https://partner.example/approved' }, { idempotencyKey: 'connect/client-one' });
  const approvalLink: string | null = request.data.authorizationUrl;
  const outcome = await platform.installationRequests.get(request.data.id);
  const approvedBusiness: string | null = outcome.data.result?.businessId ?? null;
  // @ts-expect-error a server application cannot approve for a merchant
  platform.installationRequests.approve(request.data.id);
  // @ts-expect-error request creation cannot select a business
  platform.installationRequests.create({ scopes: scopeSelection, returnUrl: 'https://partner.example/approved', businessId: '00000000-0000-4000-8000-000000000001' });
  const business: BusinessClient = platform.forBusiness('00000000-0000-4000-8000-000000000001', { scopes: ['contacts.read'] });
  await business.contacts.list();
  // @ts-expect-error platform scopes are not business scopes
  platform.forBusiness('00000000-0000-4000-8000-000000000001', { scopes: ['platform.businesses.read'] });
  const result: PageResult<PublicContact> = { ...await sdk.contacts.list(), data: [] };
  for await (const message of sdk.conversations.messages.iterate('00000000-0000-4000-8000-000000000001', {}, { maxItems: 1 })) { const text: string | null = message.text; }
  const event = constructWebhookEvent({ rawBody: '', signature: null, secret: '' });
  if (event.kind === 'verification') { const proof: string = event.response.proof; }
  const submitted = await sdk.messages.send({ to: { phone: '+919800000099' }, content: { type: 'template', template: { id: '00000000-0000-4000-8000-000000000001' } } });
  const progress = await sdk.operations.lookup('order/123');
  const state: string = progress.data.state;
  const readiness = await sdk.messaging.getReadiness();
  const accountReady: boolean = readiness.data.accountReady;
  const configuration = await sdk.messaging.getConfiguration();
  const aliases: Record<string, string> = configuration.data.value.templateAliases;
  const consent = await sdk.consents.withdraw({ to: { phone: '+919800000099' }, purpose: 'marketing' });
  const decision: string = consent.data.status;
  // @ts-expect-error grants require their own verified source owner
  sdk.consents.withdraw({ to: { phone: '+919800000099' }, purpose: 'marketing', status: 'granted' });
  for await (const template of sdk.templates.iterate({}, { maxPages: 1 })) { const supported: boolean = template.notificationSupported; }
  // @ts-expect-error notifications require a recipient and supported content
  sdk.messages.send({});
  // @ts-expect-error machine clients cannot send human inbox replies
  sdk.messages.send({ intent: 'reply', to: { conversationId: '00000000-0000-4000-8000-000000000001' }, content: { type: 'text', text: 'Hello' } });
  // @ts-expect-error enum must reject invalid input
  await sdk.contacts.list({ channel: 'telegram' });
}`;
    writeFileSync(resolve(dir, 'consumer.mts'), ts);
    writeFileSync(resolve(dir, 'consumer.cts'), ts);
    const compiler = resolve(root, 'node_modules/typescript/bin/tsc');
    const common = ['--noEmit', '--strict', '--target', 'ES2022', '--lib', 'ES2022,DOM,DOM.Iterable', '--skipLibCheck', 'false'];
    run(process.execPath, [compiler, ...common, '--module', 'NodeNext', '--moduleResolution', 'NodeNext', 'consumer.mts', 'consumer.cts'], dir);
    run(process.execPath, [compiler, ...common, '--module', 'ESNext', '--moduleResolution', 'Bundler', 'consumer.mts'], dir);
    const packed = JSON.parse(readFileSync(resolve(dir, 'node_modules/@insidedm/sdk/package.json'), 'utf8'));
    assert.equal(Object.keys(packed.dependencies ?? {}).length, 0);
    assert.equal(existsSync(resolve(dir, 'node_modules/@insidedm/sdk/src')), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('public source export uses a fresh allowlisted directory and refuses overwrite', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'insidedm-sdk-export-'));
  const target = resolve(dir, 'public-kit');
  try {
    run(process.execPath, ['scripts/exportKit.mjs', '--out', target], root);
    assert.ok(existsSync(resolve(target, 'packages/node/src/index.ts')));
    assert.ok(existsSync(resolve(target, '.github/workflows/node-ci.yml')));
    assert.ok(existsSync(resolve(target, '.github/workflows/node-release.yml')));
    assert.ok(existsSync(resolve(target, 'packages/python/README.md')));
    assert.equal(existsSync(resolve(target, 'packages/python/pyproject.toml')), false);
    assert.equal(existsSync(resolve(target, 'packages/node/.github')), false);
    for (const path of ['docs/partner-quickstart.md', 'docs/partner-reference.md', 'docs/client-provisioning.md', 'docs/hosted-onboarding.md', 'docs/partner-webhooks.md', 'docs/blueprints.md', 'examples/managedRolloutWorker.mjs']) assert.equal(existsSync(resolve(target, 'packages/node', path)), false);
    for (const path of ['.git', 'node_modules', 'dist', 'apps', 'env', 'infra', 'pnpm-lock.yaml']) assert.equal(existsSync(resolve(target, path)), false);
    assert.throws(() => run(process.execPath, ['scripts/exportKit.mjs', '--out', target], root));
    assert.ok(readdirSync(target).length < 20);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
