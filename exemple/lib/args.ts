export function wordsOf(args: string): string[] {
    return args.trim().split(/\s+/).filter(Boolean);
}

export function targetId(args: string, fallback: string, label: string): string {
    const id = wordsOf(args)[0] || fallback;

    if (!id) throw new Error(`A ${label} ID is required.`);

    return id;
}

export function targetText(
    args: string,
    fallback: string,
    label: string,
): { id: string; text: string } {
    const text = args.trim();
    const words = wordsOf(text);
    const first = words[0] ?? "";

    if (words.length === 0) {
        if (fallback) return { id: fallback, text: "" };
        throw new Error(`A ${label} ID is required.`);
    }

    if (words.length >= 2 && looksLikeId(first)) {
        return { id: first, text: text.slice(first.length).trim() };
    }

    if (!fallback) {
        if (words.length < 2) throw new Error(`A ${label} ID is required.`);
        return { id: first, text: text.slice(first.length).trim() };
    }

    return { id: fallback, text };
}

export function requireText(args: string, label: string): string {
    const text = args.trim();

    if (!text) throw new Error(`${label} is required.`);

    return text;
}

export function optionalNumber(value: string): number | undefined {
    if (!value.trim()) return undefined;

    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
}

export function looksLikeId(value: string): boolean {
    return /^\d{10,}$/.test(value)
        || /^[0-9a-f]{8}-[0-9a-f-]{20,}$/i.test(value)
        || /^[A-Za-z0-9_-]{24,}$/.test(value);
}

export function parseJson<T>(value: string, fallback: T): T {
    if (!value.trim()) return fallback;

    return JSON.parse(value) as T;
}
