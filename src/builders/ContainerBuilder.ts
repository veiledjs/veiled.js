import { ComponentType } from "../types/payload/component";
import type {
    RawContainerActionRow,
    RawContainerCardPayload,
    RawContainerChild,
    RawContainerPayload,
} from "../types/payload/container";
import {
    validateContainerActionRowPayload,
    validateContainerPayload,
} from "../util/validate";
import { ActionRowBuilder } from "./ActionRowBuilder";
import { ButtonBuilder } from "./ButtonBuilder";
import { SeparatorBuilder } from "./SeparatorBuilder";
import { TextDisplayBuilder } from "./TextDisplayBuilder";

const DEFAULT_ACCENT_COLOR = 0x5865f2;

export class ContainerBuilder {
    private readonly data: RawContainerPayload = {
        type: ComponentType.Container,
        accent_color: DEFAULT_ACCENT_COLOR,
        components: [],
    };

    public setAccentColor(color: number): this {
        this.data.accent_color = color;
        return this;
    }

    public addTitle(title: string): this {
        return this.addTextDisplay(new TextDisplayBuilder(`## ${title}`));
    }

    public addDescription(description: string): this {
        return this.addTextDisplay(new TextDisplayBuilder(description));
    }

    public addTextDisplay(content: string | TextDisplayBuilder): this {
        const display = typeof content === "string"
            ? new TextDisplayBuilder(content)
            : content;

        this.data.components.push(display.toJSON());
        return this;
    }

    public addSeparator(separator: number | SeparatorBuilder = 1): this {
        const value = typeof separator === "number"
            ? new SeparatorBuilder(separator)
            : separator;

        this.data.components.push(value.toJSON());
        return this;
    }

    public addActionRow(row: ActionRowBuilder | RawContainerActionRow): this {
        const value = row instanceof ActionRowBuilder
            ? row.toJSON() as RawContainerActionRow
            : row;

        validateContainerActionRowPayload(value);
        this.data.components.push(value);
        return this;
    }

    public addActionRows(...rows: Array<ActionRowBuilder | RawContainerActionRow>): this {
        for (const row of rows) this.addActionRow(row);
        return this;
    }

    public addComponent(component: RawContainerChild): this {
        this.data.components.push(structuredClone(component));
        return this;
    }

    public toJSON(): RawContainerPayload {
        validateContainerPayload(this.data);
        return structuredClone(this.data);
    }
}

export function createContainer(card: RawContainerCardPayload = {}): RawContainerPayload[] {
    const builder = new ContainerBuilder();
    let hasContent = false;

    if (card.accentColor !== undefined) builder.setAccentColor(card.accentColor);

    if (card.title) {
        builder.addTitle(card.title);
        hasContent = true;
    }

    if (card.description) {
        builder.addDescription(card.description);
        hasContent = true;
    }

    for (const section of card.sections ?? []) {
        if (section.divider && hasContent) builder.addSeparator();
        if (section.content) {
            builder.addTextDisplay(section.content);
            hasContent = true;
        }
    }

    if (card.footer) {
        if (hasContent) builder.addSeparator();
        builder.addTextDisplay(`-# ${card.footer}`);
        hasContent = true;
    }

    if (card.linkButtons && card.linkButtons.length > 0) {
        const row = new ActionRowBuilder();

        for (const button of card.linkButtons.slice(0, 5)) {
            row.addButton(ButtonBuilder.link(button.label, button.url));
        }

        builder.addActionRow(row);
        hasContent = true;
    }

    for (const row of card.actionRows ?? []) {
        builder.addActionRow(row);
        hasContent = true;
    }

    if (!hasContent) builder.addTextDisplay(" ");

    return [builder.toJSON()];
}

export function isValidContainerPayload(value: unknown): value is RawContainerPayload[] {
    if (!Array.isArray(value) || value.length !== 1) return false;

    try {
        validateContainerPayload(value[0] as RawContainerPayload);
        return true;
    } catch {
        return false;
    }
}
