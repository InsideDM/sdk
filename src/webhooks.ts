import { decodeWebhookSecret, verifyWebhook, verificationProof } from './generated/webhookSignature.js';
import { DEVELOPER_EVENT_TYPES } from './generated/vocabulary.js';
import { decode, isRecord } from './schema.js';
import { InsideDMWebhookVerificationError } from './errors.js';
import type { DeveloperEventEnvelope, WebhookVerificationChallenge, WebhookVerificationProof } from './generated/wire.js';

export interface ConstructWebhookOptions {
  rawBody: string | Uint8Array;
  signature: string | null;
  secret: string | readonly string[];
  nowSeconds?: number;
  toleranceSeconds?: number;
}

export type VerifiedWebhook =
  | { kind: 'event'; event: DeveloperEventEnvelope }
  | { kind: 'verification'; challenge: WebhookVerificationChallenge; response: WebhookVerificationProof }
  | { kind: 'unknown'; event: { id: string | null; type: string; version: number } };

/** Verify exact raw bytes before parsing. Do not pass an object or re-serialized JSON. */
export function constructWebhookEvent(options: ConstructWebhookOptions): VerifiedWebhook {
  const refuse = (code: string): never => { throw new InsideDMWebhookVerificationError(code); };
  if (!options || (typeof options.rawBody !== 'string' && !(options.rawBody instanceof Uint8Array))) return refuse('invalid_raw_body');
  const bytes = typeof options.rawBody === 'string' ? Buffer.from(options.rawBody, 'utf8') : options.rawBody;
  if (bytes.byteLength > 64 * 1024) return refuse('body_too_large');
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const tolerance = options.toleranceSeconds ?? 300;
  if (!Number.isSafeInteger(now) || now < 0 || !Number.isSafeInteger(tolerance) || tolerance < 1 || tolerance > 300) return refuse('invalid_verification_options');
  const secrets = typeof options.secret === 'string' ? [options.secret] : options.secret;
  if (!Array.isArray(secrets) || secrets.length < 1 || secrets.length > 2) return refuse('invalid_secret');
  const decoded = secrets.map((secret: string) => decodeWebhookSecret(secret));
  if (decoded.some((secret) => secret === null)) return refuse('invalid_secret');
  let matched: Uint8Array | null = null;
  for (const secret of decoded) {
    if (secret && verifyWebhook(options.signature, bytes, [secret], { nowSeconds: now, toleranceSeconds: tolerance }).ok) matched = secret;
  }
  if (!matched) return refuse('invalid_signature');
  let raw: unknown;
  try { raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown; }
  catch { return refuse('invalid_json'); }
  if (!isRecord(raw) || typeof raw.type !== 'string' || raw.type.length < 1 || raw.type.length > 128 || !Number.isSafeInteger(raw.version) || (raw.version as number) < 1) return refuse('invalid_envelope');
  try {
    if (raw.type === 'endpoint.verify') {
      const challenge = decode({ $ref: '#/components/schemas/WebhookVerificationChallenge' }, raw, 'challenge', false) as WebhookVerificationChallenge;
      if (Date.parse(challenge.expiresAt) <= now * 1000) return refuse('expired_challenge');
      return { kind: 'verification', challenge,
        response: { challenge: challenge.challenge, proof: verificationProof(matched, challenge.verificationId, challenge.challenge) } };
    }
    if (!(DEVELOPER_EVENT_TYPES as readonly string[]).includes(raw.type)
      || (raw.type === 'operation.changed' ? raw.version !== 2 : raw.version !== 1 && !(raw.version === 2 && raw.type !== 'endpoint.test' && raw.application !== undefined))) {
      return { kind: 'unknown', event: { id: typeof raw.id === 'string' && raw.id.length <= 256 ? raw.id : null, type: raw.type, version: raw.version as number } };
    }
    const name = raw.version===2&&raw.type!=='operation.changed' ? 'ApplicationResourceEventEnvelope' : raw.type === 'endpoint.test' ? 'EndpointTestEventEnvelope'
      : raw.type === 'message.delivery_changed' ? 'MessageDeliveryChangedEventEnvelope'
      : raw.type === 'operation.changed' ? 'OperationChangedEventEnvelope' : 'DeveloperChangedEventEnvelope';
    const event = decode({ $ref: `#/components/schemas/${name}` }, raw, 'event', false) as DeveloperEventEnvelope;
    if (event.type !== 'endpoint.test') {
      const expected = event.type === 'message.created' || event.type === 'message.delivery_changed'
        ? 'message' : event.type.slice(0, -'.changed'.length);
      if (event.resource.type !== expected) return refuse('invalid_envelope');
      if(event.type==='message.delivery_changed'&&(event.change!=='updated'||event.resource.deleted||event.resource.parent?.type!=='conversation'))return refuse('invalid_envelope');
      if(event.version===2&&'application' in event&&event.application&&event.type==='operation.changed'
        &&(event.producer.kind!=='installation'||event.producer.id!==event.application.installationId||event.producer.authorityVersion!==event.application.authorityVersion))return refuse('invalid_envelope');
    }
    return { kind: 'event', event };
  } catch (error) {
    if (error instanceof InsideDMWebhookVerificationError) throw error;
    return refuse('invalid_envelope');
  }
}

export { InsideDMWebhookVerificationError } from './errors.js';
export type { DeveloperEventEnvelope, WebhookVerificationChallenge, WebhookVerificationProof } from './generated/wire.js';
