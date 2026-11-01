import { ButtonStyle, ComponentType } from "../types/payload/component";
import type {
    RawActionRowComponentPayload,
    RawActionRowPayload,
    RawButtonPayload,
    RawStringSelectOptionPayload,
    RawStringSelectPayload,
} from "../types/payload/component";
import type {
    RawContainerActionRow,
    RawContainerPayload,
    RawContainerTextDisplay,
    RawContainerDivider,
} from "../types/payload/container";
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
    selectOptions: 25,
    selectLabel: 100,
    selectValue: 100,
    selectDescription: 100,
    selectPlaceholder: 150,
    containerText: 4000,
    containerChildren: 10,
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

    const protocol = new URL(value).protocol;

    if (protocol !== "http:" && protocol !== "https:") {
        throw new TypeError(`${name} must use HTTP or HTTPS`);
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

    if (button.label === undefined && button.emoji === undefined) {
        throw new TypeError("Buttons must have a label or an emoji");
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

export function validateStringSelectOptionPayload(option: RawStringSelectOptionPayload): void {
    if (typeof option.label !== "string" || option.label.length === 0) {
        throw new TypeError("Select option labels must not be empty");
    }

    assertMaxLength(option.label, LIMITS.selectLabel, "Select option label");

    if (typeof option.value !== "string" || option.value.length === 0) {
        throw new TypeError("Select option values must not be empty");
    }

    assertMaxLength(option.value, LIMITS.selectValue, "Select option value");

    if (option.description !== undefined) {
        assertMaxLength(option.description, LIMITS.selectDescription, "Select option description");
    }
}

export function validateStringSelectPayload(select: RawStringSelectPayload): void {
    if (select.type !== ComponentType.StringSelect) {
        throw new TypeError("Select menu type must be ComponentType.StringSelect");
    }

    assertCustomId(select.custom_id, "Select menu custom_id");

    if (!Array.isArray(select.options) || select.options.length === 0) {
        throw new RangeError("Select menus must contain at least 1 option");
    }

    if (select.options.length > LIMITS.selectOptions) {
        throw new RangeError(`Select menus can contain at most ${LIMITS.selectOptions} options`);
    }

    if (select.placeholder !== undefined) {
        assertMaxLength(select.placeholder, LIMITS.selectPlaceholder, "Select menu placeholder");
    }

    for (const option of select.options) {
        validateStringSelectOptionPayload(option);
    }

    if (select.min_values !== undefined
        && (!Number.isInteger(select.min_values) || select.min_values < 0 || select.min_values > select.options.length)) {
        throw new RangeError("Select menu min_values is invalid");
    }

    if (select.max_values !== undefined
        && (!Number.isInteger(select.max_values) || select.max_values < 1 || select.max_values > select.options.length)) {
        throw new RangeError("Select menu max_values is invalid");
    }

    if (select.min_values !== undefined
        && select.max_values !== undefined
        && select.min_values > select.max_values) {
        throw new RangeError("Select menu min_values cannot exceed max_values");
    }
}

export function validateActionRowComponentPayload(component: RawActionRowComponentPayload): void {
    if (component.type === ComponentType.Button) {
        validateButtonPayload(component);
        return;
    }

    if (component.type === ComponentType.StringSelect) {
        validateStringSelectPayload(component);
        return;
    }

    throw new TypeError("Unsupported action row component type");
}

export function validateActionRowPayload(row: RawActionRowPayload): void {
    if (row.type !== ComponentType.ActionRow) {
        throw new TypeError("Row type must be ComponentType.ActionRow");
    }

    if (row.components.length === 0) {
        throw new RangeError("Action rows must contain at least 1 component");
    }

    if (row.components.length > LIMITS.buttonsPerRow) {
        throw new RangeError(`Action rows can contain at most ${LIMITS.buttonsPerRow} components`);
    }

    for (const component of row.components) {
        validateActionRowComponentPayload(component);
    }
}

export function validateTextDisplayPayload(display: RawContainerTextDisplay): void {
    if (display.type !== ComponentType.TextDisplay) {
        throw new TypeError("Text display type must be ComponentType.TextDisplay");
    }

    if (typeof display.content !== "string" || display.content.trim().length === 0) {
        throw new TypeError("Text display content must not be empty");
    }

    assertMaxLength(display.content, LIMITS.containerText, "Container text");
}

export function validateSeparatorPayload(separator: RawContainerDivider): void {
    if (separator.type !== ComponentType.Separator || separator.divider !== true) {
        throw new TypeError("Separator must use the divider separator type");
    }

    if (!Number.isInteger(separator.spacing) || separator.spacing < 1 || separator.spacing > 2) {
        throw new RangeError("Separator spacing must be 1 or 2");
    }
}

export function validateContainerActionRowPayload(row: RawContainerActionRow): void {
    validateActionRowPayload(row as RawActionRowPayload);
}

export function validateContainerPayload(container: RawContainerPayload): void {
    if (container.type !== ComponentType.Container) {
        throw new TypeError("Container type must be ComponentType.Container");
    }

    if (!Number.isInteger(container.accent_color)
        || container.accent_color < 0
        || container.accent_color > 0xffffff) {
        throw new RangeError("Container accent_color must be a valid color integer");
    }

    if (!Array.isArray(container.components) || container.components.length === 0) {
        throw new RangeError("Containers must contain at least 1 component");
    }

    if (container.components.length > LIMITS.containerChildren) {
        throw new RangeError(`Containers can contain at most ${LIMITS.containerChildren} components`);
    }

    const customIds = new Set<string>();

    for (const component of container.components) {
        if (component.type === ComponentType.ActionRow) {
            validateContainerActionRowPayload(component);

            for (const child of component.components) {
                const customId = "custom_id" in child ? child.custom_id : undefined;

                if (typeof customId === "string") {
                    if (customIds.has(customId)) {
                        throw new TypeError("Interactive component custom_id values must be unique within a message");
                    }

                    customIds.add(customId);
                }
            }
        } else if (component.type === ComponentType.TextDisplay) {
            validateTextDisplayPayload(component);
        } else if (component.type === ComponentType.Separator) {
            validateSeparatorPayload(component);
        } else {
            throw new TypeError("Unsupported container component type");
        }
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
