// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { createHash, randomBytes } from 'node:crypto';
export const APPLICATION_CREDENTIAL_PATTERN = /^idmp_([A-Za-z0-9_-]{16})_([A-Za-z0-9_-]{43})$/;
export interface GeneratedApplicationCredential {
    token: string;
    displayCode: string;
    digest: string;
}
export function generateApplicationCredential(): GeneratedApplicationCredential {
    const locator = randomBytes(12).toString('base64url');
    const token = `idmp_${locator}_${randomBytes(32).toString('base64url')}`;
    return { token, displayCode: `idmp_${locator}`, digest: createHash('sha256').update(token).digest('hex') };
}
export function parseApplicationCredential(value: unknown): {
    digest: string;
    displayCode: string;
} | null {
    if (typeof value !== 'string' || value.length !== 65)
        return null;
    const match = APPLICATION_CREDENTIAL_PATTERN.exec(value);
    if (!match || Buffer.from(match[1]!, 'base64url').toString('base64url') !== match[1]
        || Buffer.from(match[2]!, 'base64url').toString('base64url') !== match[2])
        return null;
    return { digest: createHash('sha256').update(value).digest('hex'), displayCode: value.slice(0, 21) };
}
