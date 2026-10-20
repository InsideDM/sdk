// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { createHash, randomBytes } from "node:crypto";
export const API_KEY_PREFIX = "idm_";
export const API_KEY_LENGTH = 64;
export const API_KEY_PATTERN = /^idm_([A-Za-z0-9_-]{16})_([A-Za-z0-9_-]{43})$/;
const LOCATOR_BYTES = 12;
const SECRET_BYTES = 32;
export interface GeneratedApiKey {
    token: string;
    locator: string;
    displayCode: string;
    digest: string;
}
export interface ParsedApiKey {
    locator: string;
    digest: string;
}
export function apiKeyDigest(token: string): string {
    return createHash("sha256").update(token, "utf8").digest("hex");
}
export function generateApiKey(): GeneratedApiKey {
    const locator = randomBytes(LOCATOR_BYTES).toString("base64url");
    const secret = randomBytes(SECRET_BYTES).toString("base64url");
    const token = `${API_KEY_PREFIX}${locator}_${secret}`;
    return { token, locator, displayCode: `${API_KEY_PREFIX}${locator}`, digest: apiKeyDigest(token) };
}
export function parseApiKey(token: unknown): ParsedApiKey | null {
    if (typeof token !== "string" || token.length !== API_KEY_LENGTH)
        return null;
    const match = API_KEY_PATTERN.exec(token);
    if (!match)
        return null;
    const locator = match[1]!;
    const secret = match[2]!;
    if (!isCanonicalBase64Url(locator, LOCATOR_BYTES) || !isCanonicalBase64Url(secret, SECRET_BYTES))
        return null;
    return { locator, digest: apiKeyDigest(token) };
}
function isCanonicalBase64Url(text: string, bytes: number): boolean {
    const decoded = Buffer.from(text, "base64url");
    return decoded.length === bytes && decoded.toString("base64url") === text;
}
