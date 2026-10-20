import { createHash } from 'node:crypto';
import { constructWebhookEvent, InsideDMWebhookVerificationError } from '@insidedm/sdk/webhooks';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIMIT = 64 * 1024;
const hash = value => createHash('sha256').update(value).digest('hex');
const reply = (status, code) => new Response(code ? JSON.stringify({ code }) : null, {
  status, headers: { 'cache-control': 'no-store', ...(code ? { 'content-type': 'application/json' } : {}) },
});

/**
 * Reference adapter, not a queue implementation. Mount only on a dedicated POST route.
 * identity: {businessId} for a merchant receiver OR {applicationId} for a partner receiver.
 * accept(job) must atomically authorize the saved client mapping and commit a durable
 * inbox row + downstream dispatch. A matching key/digest returns 'duplicate'; a changed
 * digest returns 'conflict'. Return 'refused' for unavailable original authority.
 * Never replace this port with an in-memory Set or an immediate n8n fetch.
 */
export function createN8nResourceBridge({ receiverId, identity, secret, accept }) {
  const secrets = typeof secret === 'string' ? [secret] : Array.isArray(secret) ? [...secret] : [];
  const businessId = identity?.businessId, applicationId = identity?.applicationId;
  if (!UUID.test(receiverId) || (!!businessId === !!applicationId)
    || !UUID.test(businessId ?? applicationId) || typeof accept !== 'function'
    || secrets.length < 1 || secrets.length > 2 || secrets.some(value => typeof value !== 'string' || !/^whsec_[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(value))) {
    throw new TypeError('Configure receiver identity, signing secrets and durable acceptance.');
  }
  return async request => {
    if (request.method !== 'POST') {
      const response = reply(405, 'method_not_allowed'); response.headers.set('allow', 'POST'); return response;
    }
    let rawBody, verified;
    try {
      rawBody = await readBoundedBody(request);
      verified = constructWebhookEvent({ rawBody, signature: request.headers.get('x-insidedm-signature'), secret: secrets });
    } catch (error) {
      if (error instanceof InsideDMWebhookVerificationError) return reply(400, 'invalid_webhook');
      return reply(error?.status ?? 400, 'invalid_body');
    }
    if (verified.kind === 'verification') {
      if (verified.challenge.endpointId !== receiverId) return reply(403, 'receiver_mismatch');
      return new Response(JSON.stringify(verified.response), {
        status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      });
    }
    if (verified.kind === 'unknown') return reply(204);
    const event = verified.event;
    if (event.type === 'endpoint.test') return event.test.endpointId === receiverId ? reply(204) : reply(403, 'receiver_mismatch');
    const application = event.application ?? null;
    if (applicationId ? event.version !== 2 || application?.id !== applicationId
      : application !== null || (event.businessId !== undefined && event.businessId !== businessId)) {
      return reply(403, 'identity_mismatch');
    }
    const tenant = businessId ?? event.businessId;
    // Event identity survives redelivery/manual replay; attempt IDs do not.
    const job = {
      key: hash(JSON.stringify([receiverId, tenant, event.id])), digest: hash(rawBody),
      receiverId, businessId: tenant, application, event,
    };
    try {
      const result = await accept(structuredClone(job));
      if (result === 'inserted' || result === 'duplicate') return reply(202);
      if (result === 'conflict') return reply(409, 'event_conflict');
      if (result === 'refused') return reply(403, 'authority_unavailable');
    } catch { /* Queue failure must not acknowledge delivery. Never echo/log secrets or raw bodies. */ }
    return reply(503, 'inbox_unavailable');
  };
}

async function readBoundedBody(request) {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  let timer;
  try {
    const deadline = new Promise((_, reject) => { timer = setTimeout(() => reject({ status: 408 }), 10_000); });
    return await Promise.race([deadline, (async () => {
      const chunks = []; let size = 0;
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        size += value.byteLength; if (size > LIMIT) throw { status: 413 };
        chunks.push(value);
      }
      return Buffer.concat(chunks, size);
    })()]);
  } finally { clearTimeout(timer); void reader.cancel().catch(() => {}); }
}
