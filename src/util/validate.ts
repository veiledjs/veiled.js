import { ButtonStyle, ComponentType } from "../types/payload/component";
import type { RawActionRowPayload, RawButtonPayload } from "../types/payload/component";
import type { RawEmbedPayload } from "../types/payload/embed";
import type { RawMessagePayload, RawWebhookMessagePayload } from "../types/payload/message";
import { isValidUrl } from "./isValidUrl";

export const LIMITS = {
    content: 2000,
    username: 80,
    embeds: 10,
    embedTitle: 256,
    embedDescription: 4096,
    embedAuthorName: 256,
    embedFooterText: 2048,
    embedFields: 25,
    embedFieldName: 256,
    embedFieldValue: 1024,
    actionRows: 5,
    buttonsPerRow: 5,
    buttonLabel: 80,
    buttonCustomId: 100,
} as const;

const COLOR = /^#[0-9a-f]{6}$/i;

function assertMaxLength(value: string, max: number, name: string): void {
    if (value.length > max) {
        throw new RangeError(`${name} must be at most ${max} characters`);
    }
}

function assertUrl(value: string, name: string): void {
    if (!isValidUrl(value)) {
        throw new TypeError(`${name} must be a valid URL`);
    }
}

function assertCustomId(value: string, name: string): void {
    if (value.length === 0) {
        throw new TypeError(`${name} must not be empty`);
    }

    assertMaxLength(value, LIMITS.buttonCustomId, name);
}

export function validateEmbedPayload(embed: RawEmbedPayload): void {
    if (embed.title !== undefined) {
        assertMaxLength(embed.title, LIMITS.embedTitle, "Embed title");
    }

    if (embed.description !== undefined) {
        assertMaxLength(embed.description, LIMITS.embedDescription, "Embed description");
    }

    if (embed.url !== undefined) {
        assertUrl(embed.url, "Embed url");
    }

    if (embed.color !== undefined && !COLOR.test(embed.color)) {
        throw new TypeError("Embed color must be a 6-digit hex color");
    }

    if (embed.author) {
        assertMaxLength(embed.author.name, LIMITS.embedAuthorName, "Embed author name");

        if (embed.author.url !== undefined) {
            assertUrl(embed.author.url, "Embed author url");
        }

        if (embed.author.icon_url !== undefined) {
            assertUrl(embed.author.icon_url, "Embed author icon url");
        }
    }

    if (embed.thumbnail) {
        assertUrl(embed.thumbnail.url, "Embed thumbnail url");
    }

    if (embed.image) {
        assertUrl(embed.image.url, "Embed image url");
    }

    if (embed.footer) {
        assertMaxLength(embed.footer.text, LIMITS.embedFooterText, "Embed footer text");

        if (embed.footer.icon_url !== undefined) {
            assertUrl(embed.footer.icon_url, "Embed footer icon url");
        }
    }

    if (embed.fields) {
        if (embed.fields.length > LIMITS.embedFields) {
            throw new RangeError(`Embeds can contain at most ${LIMITS.embedFields} fields`);
        }

        for (const field of embed.fields) {
            assertMaxLength(field.name, LIMITS.embedFieldName, "Embed field name");
            assertMaxLength(field.value, LIMITS.embedFieldValue, "Embed field value");
        }
    }

    if (embed.timestamp !== undefined && Number.isNaN(Date.parse(embed.timestamp))) {
        throw new TypeError("Embed timestamp must be a valid date");
    }
}

export function validateButtonPayload(button: RawButtonPayload): void {
    if (button.type !== ComponentType.Button) {
        throw new TypeError("Button type must be ComponentType.Button");
    }

    if (!Number.isInteger(button.style) || button.style < 1 || button.style > 5) {
        throw new TypeError("Button style must be a valid ButtonStyle");
    }

    if (button.label !== undefined) {
        assertMaxLength(button.label, LIMITS.buttonLabel, "Button label");
    }

    if (button.style === ButtonStyle.Link) {
        if (button.url === undefined) {
            throw new TypeError("Link buttons require a url");
        }

        if (button.custom_id !== undefined) {
            throw new TypeError("Link buttons cannot have a custom_id");
        }

        assertUrl(button.url, "Button url");
        return;
    }

    if (button.url !== undefined) {
        throw new TypeError("Interactive buttons cannot have a url");
    }

    if (button.custom_id === undefined) {
        throw new TypeError("Interactive buttons require a custom_id");
    }

    assertCustomId(button.custom_id, "Button custom_id");
}

export function validateActionRowPayload(row: RawActionRowPayload): void {
    if (row.type !== ComponentType.ActionRow) {
        throw new TypeError("Row type must be ComponentType.ActionRow");
    }

    if (row.components.length === 0) {
        throw new RangeError("Action rows must contain at least 1 button");
    }

    if (row.components.length > LIMITS.buttonsPerRow) {
        throw new RangeError(`Action rows can contain at most ${LIMITS.buttonsPerRow} buttons`);
    }

    for (const button of row.components) {
        validateButtonPayload(button);
    }
}

export function validateMessagePayload(payload: RawMessagePayload): void {
    if (payload.content !== undefined && payload.content !== null) {
        assertMaxLength(payload.content, LIMITS.content, "Content");
    }

    if (payload.embeds) {
        if (payload.embeds.length > LIMITS.embeds) {
            throw new RangeError(`Messages can contain at most ${LIMITS.embeds} embeds`);
        }

        for (const embed of payload.embeds) {
            validateEmbedPayload(embed);
        }
    }

    if (payload.components) {
        if (payload.components.length > LIMITS.actionRows) {
            throw new RangeError(`Messages can contain at most ${LIMITS.actionRows} action rows`);
        }

        for (const row of payload.components) {
            validateActionRowPayload(row);
        }
    }
}

export function validateWebhookMessagePayload(payload: RawWebhookMessagePayload): void {
    validateMessagePayload(payload);

    if (payload.username !== undefined) {
        assertMaxLength(payload.username, LIMITS.username, "Username");
    }

    if (payload.avatar_url !== undefined) {
        assertUrl(payload.avatar_url, "Avatar url");
    }
}
