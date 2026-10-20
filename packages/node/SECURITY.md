# Security

Enable GitHub private vulnerability reporting on the public repository before the first release. Use the repository's Security → Report a vulnerability form for private reports. If private reporting is unavailable, use your existing private InsideDM support contact. Do not file public issues containing credentials, merchant data or an exploit involving another workspace.

Include the SDK version, Node.js version, affected operation, impact, and a minimal reproduction using synthetic data. Remove API keys, webhook secrets, provider tokens and message content. A server request ID is useful when available. Support and response-time commitments are set by InsideDM separately; this preview does not establish a security SLA.

Keep InsideDM API keys and webhook secrets on your server. Store secrets in your deployment's secret manager. Verify webhook signatures over raw bytes and deduplicate events durably. Do not disable TLS or follow redirects with an authorization header. Rotate a credential after suspected exposure and revoke access when an integration is disconnected.
