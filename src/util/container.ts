import type {
    RawContainerActionRow,
    RawContainerCardPayload,
    RawContainerChild,
    RawContainerPayload,
    RawContainerTextDisplay,
} from "../types/payload/container";

const MAX_TEXT = 4000;
const MAX_CHILDREN = 10;
const DEFAULT_ACCENT_COLOR = 0x5865f2;

export function createContainer(card: RawContainerCardPayload = {}): RawContainerPayload[] {
    const children: RawContainerChild[] = [];

    if (card.title) {
        children.push(textDisplay(`## ${card.title}`));
    }

    if (card.description) {
        children.push(textDisplay(card.description));
    }

    for (const section of card.sections ?? []) {
        if (children.length >= MAX_CHILDREN - 1) break;
        if (section.divider && children.length > 0) {
            children.push({ type: 14, divider: true, spacing: 1 });
        }
        if (section.content) {
            children.push(textDisplay(section.content));
        }
    }

    if (card.footer && children.length < MAX_CHILDREN) {
        if (children.length > 0) {
            children.push({ type: 14, divider: true, spacing: 1 });
        }
        if (children.length < MAX_CHILDREN) {
            children.push(textDisplay(`-# ${card.footer}`));
        }
    }

    const requestedAccentColor = card.accentColor;
    const accentColor = typeof requestedAccentColor === "number"
        && Number.isInteger(requestedAccentColor)
        && requestedAccentColor >= 0
        && requestedAccentColor <= 0xffffff
        ? requestedAccentColor
        : DEFAULT_ACCENT_COLOR;

    if (card.linkButtons && card.linkButtons.length > 0) {
        const buttons = card.linkButtons.slice(0, 5).map(linkButton);
        const row: RawContainerActionRow = { type: 1, components: buttons };

        if (children.length >= MAX_CHILDREN) {
            throw new RangeError("The container has no room for link buttons.");
        }

        children.push(row);
    }

    if (children.length === 0) {
        children.push(textDisplay(" "));
    }

    return [{ type: 17, accent_color: accentColor, components: children }];
}

export function isValidContainerPayload(value: unknown): value is RawContainerPayload[] {
    if (!Array.isArray(value) || value.length !== 1) return false;

    const root = value[0];

    return typeof root === "object"
        && root !== null
        && (root as { type?: unknown }).type === 17
        && Array.isArray((root as { components?: unknown }).components);
}

function textDisplay(content: string): RawContainerTextDisplay {
    const value = String(content ?? "").trim() || "\u200b";

    if (value.length > MAX_TEXT) {
        throw new RangeError(`Container text must be ${MAX_TEXT} characters or fewer.`);
    }

    return { type: 10, content: value };
}

function linkButton(button: { label: string; url: string }) {
    if (typeof button.label !== "string"
        || button.label.trim().length === 0
        || button.label.length > 80) {
        throw new TypeError("Link button labels must be 1–80 characters.");
    }

    const parsed = new URL(button.url);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new TypeError("Link buttons must use HTTP or HTTPS.");
    }

    return {
        type: 2 as const,
        style: 5 as const,
        label: button.label,
        url: parsed.toString(),
    };
}
