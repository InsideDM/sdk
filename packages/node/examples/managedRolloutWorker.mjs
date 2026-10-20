import {createHash, randomUUID} from 'node:crypto';
import {constants} from 'node:fs';
import {mkdir, open, link, unlink} from 'node:fs/promises';
import {dirname, isAbsolute, join} from 'node:path';
import {InsideDMError} from '@insidedm/sdk';

const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
const canonical = value => JSON.stringify(value, (_, v) => v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v);
const copy = value => JSON.parse(canonical(value));
const digest = value => createHash('sha256').update(canonical(value)).digest('hex');
const refuse = () => { throw new Error('Invalid saved rollout or checkpoint. Reconcile the original plan before proceeding.'); };

/** Customer-owned worker; requires a private persistent POSIX filesystem. */
export function createManagedRolloutWorker({platform, directory}) {
  if (typeof directory !== 'string' || !isAbsolute(directory)) refuse();
  async function syncDirectory(path) {
    const handle = await open(path, constants.O_RDONLY);
    try { await handle.sync(); } finally { await handle.close(); }
  }
  async function read(path) {
    let handle;
    try {
      handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
      if ((await handle.stat()).size > 4 * 1024 * 1024) refuse();
      return JSON.parse(await handle.readFile('utf8'));
    } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    finally { await handle?.close(); }
  }
  async function checkpoint(folder, name, value) {
    await mkdir(folder, {recursive: true, mode: 0o700});
    const path = join(folder, name + '.json'), temporary = join(folder, randomUUID() + '.tmp');
    const handle = await open(temporary, 'wx', 0o600);
    try { await handle.writeFile(canonical(value)); await handle.sync(); } finally { await handle.close(); }
    try { await link(temporary, path); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
    finally { await unlink(temporary); }
    await syncDirectory(folder);
    const saved = await read(path);
    if (canonical(saved) !== canonical(value)) refuse();
    return saved;
  }
  async function savedPlan(id) {
    if (!uuid(id)) refuse();
    const folder = join(directory, id), saved = await read(join(folder, 'plan.json'));
    if (!saved || saved.plan.id !== id || !Number.isFinite(Date.parse(saved.createdAt))
      || saved.digest !== digest({plan: saved.plan, note: saved.note})) refuse();
    platform.blueprints.rollouts.apply(saved.plan);
    await syncDirectory(folder);
    return saved;
  }
  function requestState(request) {
    return request.status === 'published' ? 'published'
      : ['rejected', 'superseded', 'dismissed'].includes(request.status) ? 'action_required' : 'awaiting_review';
  }
  return {
    /** Persist before scheduling. Changing a saved plan/note refuses. */
    async save(plan, {note = 'Please review this managed blueprint update.'} = {}) {
      const captured = copy(plan);
      platform.blueprints.rollouts.apply(captured);
      if (typeof note !== 'string' || !note.trim() || note.length > 500 || /[\x00-\x1f\x7f]/.test(note)) refuse();
      await mkdir(directory, {recursive: true, mode: 0o700});
      const folder = join(directory, captured.id), previous = await read(join(folder, 'plan.json'));
      const createdAt = previous?.createdAt ?? new Date().toISOString();
      await checkpoint(folder, 'plan', {plan: captured, note, createdAt, digest: digest({plan: captured, note})});
      await syncDirectory(directory);
      await syncDirectory(dirname(directory));
      return captured.id;
    },
    /** One serial pass. Never approves or publishes. */
    async tick(id, {signal} = {}) {
      if (signal !== undefined && !(signal instanceof AbortSignal)) refuse();
      const {plan, note, createdAt} = await savedPlan(id), results = [];
      const expired = () => Date.now() - Date.parse(createdAt) >= 86400000;
      const options = {signal, timeoutMs: 20000, maxRetries: 0};
      for (const client of plan.clients) {
        const identity = {businessId: client.businessId, recipeId: client.recipeId};
        const folder = join(directory, id, client.businessId + '-' + client.recipeId);
        const result = (phase, extra = {}) => ({...identity, phase, ...extra});
        if (signal?.aborted) { results.push(result('not_attempted')); continue; }
        try {
          const terminal = await read(join(folder, 'terminal.json'));
          if (terminal) { results.push({...identity, ...terminal}); continue; }
          let outcome = await read(join(folder, 'draft.json'));
          if (!outcome) {
            if (expired()) { results.push(result('action_required', {code: 'recovery_window_elapsed'})); continue; }
            for await (const applied of platform.blueprints.rollouts.apply({...plan, clients: [client]}, options)) outcome = applied;
            if (!['draft_updated', 'unchanged', 'action_required', 'preview_failed'].includes(outcome?.state)) {
              results.push(result('retry_required', {code: outcome?.error?.code ?? 'draft_not_attempted'})); continue;
            }
            await checkpoint(folder, 'draft', outcome);
            await syncDirectory(join(directory, id));
          }
          if (['action_required', 'preview_failed'].includes(outcome.state)) {
            const terminal = {phase: 'action_required', code: outcome.state};
            await checkpoint(folder, 'terminal', terminal); results.push(result(terminal.phase, {code: terminal.code})); continue;
          }
          const business = platform.forBusiness(client.businessId);
          let intent = await read(join(folder, 'reviewIntent.json'));
          if (!intent) {
            signal?.throwIfAborted();
            const {data: deployment} = await business.flows.deployments.get(client.recipeId, options);
            const source = deployment.source, receipt = outcome.receipt;
            if (!receipt || deployment.revision !== receipt.deploymentRevision || deployment.draft.revision !== receipt.draftRevision
              || deployment.draft.state !== 'unchanged' || source.kind !== 'partner_blueprint'
              || source.applicationId !== plan.target.applicationId || source.key !== plan.target.key
              || source.version !== String(plan.target.version) || source.digest !== plan.target.digest) {
              results.push(result('action_required', {code: 'deployment_changed'})); continue;
            }
            intent = {deployment, note, key: 'blueprint-review/v1/' + digest([id, client.businessId, client.recipeId])};
            await checkpoint(folder, 'reviewIntent', intent);
          }
          let pointer = await read(join(folder, 'reviewRequest.json'));
          if (!pointer) {
            if (expired()) { results.push(result('action_required', {code: 'recovery_window_elapsed'})); continue; }
            signal?.throwIfAborted();
            const {data: request} = await business.flows.deployments.requestPublication(intent.deployment, {note: intent.note}, {...options, idempotencyKey: intent.key});
            pointer = {id: request.id};
            await checkpoint(folder, 'reviewRequest', pointer);
          }
          signal?.throwIfAborted();
          const {data: request} = await business.flows.deployments.getPublicationRequest(client.recipeId, pointer.id, options);
          const state = {phase: requestState(request), releaseRequestId: request.id, status: request.status, publishedVersionId: request.publishedVersionId};
          if (state.phase !== 'awaiting_review') await checkpoint(folder, 'terminal', state);
          results.push(result(state.phase, state));
        } catch (error) {
          results.push(result('retry_required', {code: error instanceof InsideDMError ? error.code : 'worker_interrupted'}));
        }
      }
      return {planId: id, clients: results};
    },
  };
}
