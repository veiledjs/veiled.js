export const colors = {
    brand: 0x5865f2,
    success: 0x57f287,
    warning: 0xfee75c,
    danger: 0xed4245,
    muted: 0x99aab5,
};

export function stringify(value: unknown): string {
    if (typeof value === "string") return value;

    try {
        return JSON.stringify(value, null, 2) ?? String(value);
    } catch {
        return String(value);
    }
}

export function plain(value: unknown): Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

export function stringOf(value: unknown): string {
    return typeof value === "string" ? value : "";
}

export function idOf(value: unknown): string {
    const item = plain(value);

    for (const key of [
        "id",
        "userId",
        "memberId",
        "roleId",
        "messageId",
        "threadId",
        "eventId",
        "webhookId",
        "inviteId",
    ]) {
        const id = stringOf(item[key]);
        if (id) return id;
    }

    return "";
}

export function truncate(value: string, length: number): string {
    return value.length > length ? `${value.slice(0, Math.max(0, length - 1))}…` : value;
}

export function shortDate(value: Date | null | undefined): string {
    if (!value || Number.isNaN(value.getTime())) return "unknown";

    return value.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

export function usernameOf(value: unknown): string {
    const user = plain(value);
    return stringOf(user.displayName)
        || stringOf(user.username)
        || stringOf(user.id)
        || "unknown user";
}

export function listLines<T>(
    items: T[],
    format: (item: T, index: number) => string,
    empty = "Nothing found.",
): string {
    return items.length === 0
        ? empty
        : items.map((item, index) => format(item, index)).join("\n");
}

export function code(value: unknown): string {
    return `\`${truncate(stringify(value), 1000).replaceAll("`", "ˋ")}\``;
}
