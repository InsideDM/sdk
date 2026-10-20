// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { createHmac, timingSafeEqual } from "node:crypto";
export const WEBHOOK_SIGNATURE_HEADER = "X-InsideDM-Signature";
export const WEBHOOK_SECRET_PREFIX = "whsec_";
export const WEBHOOK_TOLERANCE_SECONDS = 300;
const SECRET_BYTES = 32;
const SIGNATURE_PATTERN = /^[0-9a-f]{64}$/;
const TIMESTAMP_PATTERN = /^(0|[1-9][0-9]{0,11})$/;
const MAX_HEADER_LENGTH = 256;
const VERIFY_DOMAIN = "insidedm.endpoint.verify.v1.";
export function decodeWebhookSecret(secret: string): Uint8Array | null {
    if (typeof secret !== "string" || !secret.startsWith(WEBHOOK_SECRET_PREFIX))
        return null;
    const encoded = secret.slice(WEBHOOK_SECRET_PREFIX.length);
    if (!/^[A-Za-z0-9_-]{43}$/.test(encoded))
        return null;
    const bytes = Buffer.from(encoded, "base64url");
    if (bytes.length !== SECRET_BYTES || bytes.toString("base64url") !== encoded)
        return null;
    return new Uint8Array(bytes);
}
export function signWebhook(secretBytes: Uint8Array, timestamp: number, rawBody: string | Uint8Array): string {
    if (!Number.isSafeInteger(timestamp) || timestamp < 0) {
        throw new RangeError("webhook timestamp must be non-negative unix seconds");
    }
    const body = typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody;
    return createHmac("sha256", secretBytes).update(`${timestamp}.`, "ascii").update(body).digest("hex");
}
export function formatSignatureHeader(timestamp: number, signatures: readonly string[]): string {
    if (!Number.isSafeInteger(timestamp) || !TIMESTAMP_PATTERN.test(String(timestamp))) {
        throw new RangeError("webhook timestamp must be non-negative unix seconds");
    }
    if (signatures.length < 1 || signatures.length > 2) {
        throw new RangeError("a webhook carries one signature, or two during a secret overlap");
    }
    if (!signatures.every((value) => SIGNATURE_PATTERN.test(value))) {
        throw new RangeError("a webhook signature is 64 lowercase hex characters");
    }
    if (new Set(signatures).size !== signatures.length) {
        throw new RangeError("duplicate webhook signatures");
    }
    return [`t=${timestamp}`, ...signatures.map((value) => `v1=${value}`)].join(",");
}
export interface ParsedSignatureHeader {
    timestamp: number;
    signatures: string[];
}
export function parseSignatureHeader(header: unknown): ParsedSignatureHeader | null {
    if (typeof header !== "string" || header.length === 0 || header.length > MAX_HEADER_LENGTH)
        return null;
    let timestamp: number | null = null;
    const signatures: string[] = [];
    for (const element of header.split(",")) {
        const eq = element.indexOf("=");
        if (eq <= 0)
            return null;
        const key = element.slice(0, eq);
        const value = element.slice(eq + 1);
        if (key === "t") {
            if (timestamp !== null || !TIMESTAMP_PATTERN.test(value))
                return null;
            timestamp = Number(value);
        }
        else if (key === "v1") {
            if (!SIGNATURE_PATTERN.test(value) || signatures.includes(value))
                return null;
            signatures.push(value);
        }
        else {
            return null;
        }
    }
    if (timestamp === null || signatures.length < 1 || signatures.length > 2)
        return null;
    return { timestamp, signatures };
}
export type WebhookVerification = {
    ok: true;
    timestamp: number;
} | {
    ok: false;
    reason: "malformed_header" | "timestamp_out_of_tolerance" | "signature_mismatch";
};
export interface VerifyWebhookOptions {
    toleranceSeconds?: number;
    nowSeconds?: number;
}
export function verifyWebhook(header: unknown, rawBody: string | Uint8Array, secrets: readonly Uint8Array[], options: VerifyWebhookOptions = {}): WebhookVerification {
    const parsed = parseSignatureHeader(header);
    if (!parsed)
        return { ok: false, reason: "malformed_header" };
    const tolerance = options.toleranceSeconds ?? WEBHOOK_TOLERANCE_SECONDS;
    const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
    if (Math.abs(now - parsed.timestamp) > tolerance)
        return { ok: false, reason: "timestamp_out_of_tolerance" };
    let matched = false;
    for (const secret of secrets) {
        const expected = Buffer.from(signWebhook(secret, parsed.timestamp, rawBody), "hex");
        for (const presented of parsed.signatures) {
            if (timingSafeEqual(expected, Buffer.from(presented, "hex")))
                matched = true;
        }
    }
    return matched ? { ok: true, timestamp: parsed.timestamp } : { ok: false, reason: "signature_mismatch" };
}
export function verificationProof(secretBytes: Uint8Array, verificationId: string, challenge: string): string {
    return createHmac("sha256", secretBytes)
        .update(`${VERIFY_DOMAIN}${verificationId}.${challenge}`, "utf8")
        .digest("hex");
}
export function verifyVerificationProof(secretBytes: Uint8Array, verificationId: string, challenge: string, proof: unknown): boolean {
    if (typeof proof !== "string" || !SIGNATURE_PATTERN.test(proof))
        return false;
    const expected = Buffer.from(verificationProof(secretBytes, verificationId, challenge), "hex");
    return timingSafeEqual(expected, Buffer.from(proof, "hex"));
}
