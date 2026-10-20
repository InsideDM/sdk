// Generated from the authoritative InsideDM public contract. Do not edit by hand.
export type JsonValue = null | string | boolean | number | JsonValue[] | {
    [key: string]: JsonValue;
};
export class BoundedJsonError extends Error {
    constructor() { super('The request is not valid bounded JSON.'); this.name = 'BoundedJsonError'; }
}
export function parseBoundedJson(raw: string | Uint8Array, maxBytes: number): JsonValue {
    const refuse = (): never => { throw new BoundedJsonError(); };
    try {
        if (!Number.isSafeInteger(maxBytes) || maxBytes < 1)
            return refuse();
        const bytes = typeof raw === 'string' ? new TextEncoder().encode(raw) : raw;
        if (!(bytes instanceof Uint8Array) || bytes.byteLength > maxBytes)
            return refuse();
        const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        const objects: Array<Set<string> | null> = [];
        for (let at = 0; at < text.length; at++) {
            const char = text[at];
            if (char === '{' || char === '[') {
                objects.push(char === '{' ? new Set() : null);
                if (objects.length > 32)
                    return refuse();
            }
            else if (char === '}' || char === ']')
                objects.pop();
            else if (char === '"') {
                const start = at;
                for (at++; at < text.length; at++) {
                    if (text[at] === '\\')
                        at++;
                    else if (text[at] === '"')
                        break;
                }
                let next = at + 1;
                while (next < text.length && /\s/.test(text[next]!))
                    next++;
                const names = objects.at(-1);
                if (text[next] === ':' && names) {
                    const name = JSON.parse(text.slice(start, at + 1)) as string;
                    if (names.has(name))
                        return refuse();
                    names.add(name);
                }
            }
        }
        const parsed: unknown = JSON.parse(text);
        const unicode = (value: string): void => {
            for (const scalar of value) {
                const code = scalar.codePointAt(0)!;
                if (code === 0 || code >= 0xd800 && code <= 0xdfff)
                    return refuse();
            }
        };
        const persistable = (value: unknown): void => {
            if (typeof value === 'number' && !Number.isFinite(value))
                return refuse();
            if (typeof value === 'string')
                unicode(value);
            if (value !== null && typeof value === 'object') {
                for (const [key, item] of Object.entries(value)) {
                    unicode(key);
                    persistable(item);
                }
            }
        };
        persistable(parsed);
        return parsed as JsonValue;
    }
    catch {
        return refuse();
    }
}
