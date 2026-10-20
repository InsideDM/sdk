// Read-only service acceptance is separate from npm artifact publication.
// Never send a customer credential or follow redirects in these probes.
const origin = 'https://api.insidedm.io';
try {
  for (const [path, status] of [['/healthz/ready', 200], ['/v1/workspace', 401]]) {
    const response = await fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
    const valid = response.status === status && !response.redirected
      && (!path.startsWith('/v1/') || response.headers.get('content-type')?.includes('application/problem+json'));
    await response.body?.cancel();
    if (!valid) throw new Error('unexpected deployment response');
  }
  console.log('Default API TLS, readiness and anonymous contract probes passed. Provider acceptance remains separate.');
} catch {
  console.error('Deployment check failed: the default API did not pass TLS, readiness and anonymous contract probes.');
  process.exitCode = 1;
}
