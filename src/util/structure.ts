export type RawRecord = Record<string, unknown>;

export function asRecord(value: unknown): RawRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value)
        ? value as RawRecord
        : {};
}

export function asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

export function asString(value: unknown, fallback = ""): string {
    return typeof value === "string" ? value : fallback;
}

export function asNullableString(value: unknown): string | null {
    return typeof value === "string" ? value : null;
}

export function asNumber(value: unknown, fallback = 0): number {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function asNullableNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function asBoolean(value: unknown, fallback = false): boolean {
    return typeof value === "boolean" ? value : fallback;
}

export function asStringArray(value: unknown): string[] {
    return asArray(value).filter((item): item is string => typeof item === "string");
}

export function asDate(value: unknown): Date | null {
    if (value instanceof Date) return value;

    if (typeof value !== "string" && typeof value !== "number") return null;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function hasRecord(value: unknown): boolean {
    return Object.keys(asRecord(value)).length > 0;
}

export function unwrapRecord(value: unknown, keys: string[] = []): RawRecord {
    const root = asRecord(value);
    const sources = [root, asRecord(root.data), asRecord(root.payload)];

    for (const source of sources) {
        for (const key of keys) {
            const nested = asRecord(source[key]);

            if (Object.keys(nested).length > 0) return nested;
        }
    }

    const data = asRecord(root.data);
    return Object.keys(data).length > 0 ? data : root;
}

export function unwrapList(value: unknown, keys: string[] = []): RawRecord[] {
    if (Array.isArray(value)) return value.map(asRecord);

    const root = asRecord(value);
    const sources = [root, asRecord(root.data), asRecord(root.payload)];

    for (const source of sources) {
        for (const key of keys) {
            const nested = source[key];

            if (Array.isArray(nested)) return nested.map(asRecord);
        }

        if (Array.isArray(source.data)) return source.data.map(asRecord);
        if (Array.isArray(source.items)) return source.items.map(asRecord);
        if (Array.isArray(source.results)) return source.results.map(asRecord);
    }

    return [];
}
