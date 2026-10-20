import {createHash, randomUUID} from 'node:crypto';
import {constants} from 'node:fs';
import {mkdir, open, link, unlink, opendir} from 'node:fs/promises';
import {dirname, isAbsolute, join} from 'node:path';

const hash = value => createHash('sha256').update(value).digest('hex');
const jobId = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const principal = value => value && typeof value === 'object'
  && Object.keys(value).length === 2 && typeof value.businessId === 'string'
  && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value.businessId)
  && typeof value.authorityId === 'string' && /^[A-Za-z0-9:_.-]{1,160}$/.test(value.authorityId);
const response = (status, body) => new Response(body === null ? null : JSON.stringify(body), {
  status, headers: {'cache-control': 'no-store', 'content-type': 'application/json'},
});
const invalid = () => { throw new Error('Invalid job or checkpoint. Reconcile the original job.'); };
function json(value, limit) {
  const text = JSON.stringify(value, (_key, item) => {
    if (['undefined', 'function', 'symbol'].includes(typeof item) || typeof item === 'number' && !Number.isFinite(item)) invalid();
    return item;
  });
  if (text === undefined || Buffer.byteLength(text) > limit) invalid();
  return JSON.parse(text);
}

/** Copy into a trusted backend with a private persistent POSIX filesystem. */
export function createAsyncJobReceiver({directory, authenticate, isAuthorized, execute}) {
  if (typeof directory !== 'string' || !isAbsolute(directory)
    || [authenticate, isAuthorized, execute].some(value => typeof value !== 'function')) invalid();
  async function sync(path) {
    const handle = await open(path, constants.O_RDONLY);
    try { await handle.sync(); } finally { await handle.close(); }
  }
  async function read(id, name) {
    if (!jobId(id)) invalid();
    let handle;
    try {
      handle = await open(join(directory, id, name + '.json'), constants.O_RDONLY | constants.O_NOFOLLOW);
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > 64 * 1024) invalid();
      return JSON.parse(await handle.readFile('utf8'));
    } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    finally { await handle?.close(); }
  }
  async function put(id, name, value) {
    if (!jobId(id)) invalid();
    const folder = join(directory, id);
    await mkdir(folder, {recursive: true, mode: 0o700});
    const temporary = join(folder, randomUUID() + '.tmp');
    const handle = await open(temporary, 'wx', 0o600);
    try { await handle.writeFile(JSON.stringify(value)); await handle.sync(); }
    finally { await handle.close(); }
    let inserted = true;
    try { await link(temporary, join(folder, name + '.json')); }
    catch (error) { if (error.code !== 'EEXIST') throw error; inserted = false; }
    finally { await unlink(temporary); }
    await sync(folder); await sync(directory); await sync(dirname(directory));
    return {inserted, saved: await read(id, name)};
  }
  async function load(id) {
    const saved = await read(id, 'job');
    if (saved === null) return null;
    if (saved.id !== id || !principal(saved.principal) || typeof saved.key !== 'string'
      || hash(JSON.stringify([saved.principal.businessId, saved.principal.authorityId, saved.key])) !== id
      || typeof saved.body !== 'string' || hash(saved.body) !== saved.digest) invalid();
    return saved;
  }
  async function actor(request) {
    const found = await authenticate(request);
    if (found === null) return null;
    if (!principal(found)) invalid();
    const captured = {...found};
    return await isAuthorized({...captured}) === true ? captured : null;
  }
  const permitted = saved => isAuthorized({...saved.principal});
  const same = (a, b) => a.businessId === b.businessId && a.authorityId === b.authorityId;
  async function body(request) {
    if (!request.headers.get('content-type')?.toLowerCase().split(';')[0].trim().endsWith('/json')) throw {status: 415};
    const reader = request.body?.getReader();
    if (!reader) throw {status: 400};
    let timer;
    try {
      const deadline = new Promise((_, reject) => { timer = setTimeout(() => reject({status: 408}), 10_000); });
      return await Promise.race([deadline, (async () => {
        const chunks = []; let size = 0;
        for (;;) {
          const {value, done} = await reader.read(); if (done) break;
          size += value.byteLength; if (size > 32 * 1024) throw {status: 413};
          chunks.push(value);
        }
        const text = new TextDecoder('utf-8', {fatal: true}).decode(Buffer.concat(chunks, size));
        const value = JSON.parse(text);
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw {status: 400};
        json(value, 32 * 1024);
        return {text, value};
      })()]);
    } finally { clearTimeout(timer); void reader.cancel().catch(() => {}); }
  }
  const route = handler => async request => {
    if (request.method !== 'POST') {
      const reply = response(405, {code: 'method_not_allowed'}); reply.headers.set('allow', 'POST'); return reply;
    }
    try {
      const identity = await actor(request);
      if (identity === null) return response(403, {code: 'authority_unavailable'});
      let parsed;
      try { parsed = await body(request); }
      catch (error) { return response([408, 413, 415].includes(error?.status) ? error.status : 400, {code: 'invalid_body'}); }
      return await handler(request, identity, parsed);
    } catch { return response(503, {code: 'job_store_unavailable'}); }
  };
  async function finish(id, outcome) {
    if (!outcome || !['succeeded', 'failed'].includes(outcome.status)
      || !Object.hasOwn(outcome, 'result') || Object.keys(outcome).some(key => !['status', 'result'].includes(key))) invalid();
    const captured = {status: outcome.status, result: json(outcome.result, 16 * 1024)};
    const {saved} = await put(id, 'result', captured);
    if (JSON.stringify(saved) !== JSON.stringify(captured)) invalid();
    return saved;
  }
  return {
    /** Persist before replying; exact request/key retries recover the same job. */
    start: route(async (request, identity, parsed) => {
      const key = request.headers.get('idempotency-key');
      if (!key || !/^[A-Za-z0-9:_.\/-]{1,200}$/.test(key)) return response(400, {code: 'invalid_idempotency_key'});
      const id = hash(JSON.stringify([identity.businessId, identity.authorityId, key]));
      const value = {id, principal: identity, key, body: parsed.text, digest: hash(parsed.text), createdAt: new Date().toISOString()};
      const {saved} = await put(id, 'job', value);
      if (saved.digest !== value.digest) return response(409, {code: 'job_conflict'});
      return response(200, {job: {id}});
    }),
    /** The job ID grants no access; original authenticated authority is required. */
    status: route(async (_request, identity, {value}) => {
      if (Object.keys(value).length !== 1 || !jobId(value.id)) return response(400, {code: 'invalid_job'});
      const saved = await load(value.id);
      if (!saved || !same(saved.principal, identity)) return response(404, {code: 'job_not_found'});
      return response(200, await read(value.id, 'result') ?? {status: 'pending', result: null});
    }),
    /** Scan incrementally on the backend scheduler, including after restart. */
    async *pending({claimed = false} = {}) {
      if (typeof claimed !== 'boolean') invalid();
      let folders;
      try { folders = await opendir(directory); }
      catch (error) { if (error.code === 'ENOENT') return; throw error; }
      for await (const entry of folders) {
        if (entry.isDirectory() && jobId(entry.name) && await read(entry.name, 'result') === null
          && (await read(entry.name, 'claim') !== null) === claimed && await load(entry.name)) yield entry.name;
      }
    },
    /** A durable claim permits at most one automatic invocation, even across workers. */
    async tick(id, {signal} = {}) {
      if (signal !== undefined && !(signal instanceof AbortSignal)) invalid();
      const saved = await load(id);
      if (!saved || await permitted(saved) !== true) return {id, state: 'unavailable'};
      const terminal = await read(id, 'result');
      if (terminal) return {id, state: terminal.status};
      signal?.throwIfAborted();
      if (!(await put(id, 'claim', {claimedAt: new Date().toISOString()})).inserted) return {id, state: 'reconcile'};
      // Do not convert thrown/aborted/uncertain effects into a retry or a failed job.
      try {
        signal?.throwIfAborted();
        if (await permitted(saved) !== true) return {id, state: 'unavailable'};
        const result = await execute({id, ...saved.principal, input: JSON.parse(saved.body), idempotencyKey: id, signal});
        signal?.throwIfAborted();
        if (await permitted(saved) !== true) return {id, state: 'unavailable'};
        await finish(id, {status: 'succeeded', result});
        return {id, state: 'succeeded'};
      } catch { return {id, state: 'reconcile'}; }
    },
    /** Private backend recovery after inspecting the original external effect. */
    async reconcile(id, outcome) {
      const captured = json(outcome, 17 * 1024);
      const saved = await load(id);
      if (!saved || await permitted(saved) !== true || await read(id, 'claim') === null) invalid();
      const terminal = await finish(id, captured);
      return {id, state: terminal.status};
    },
  };
}
