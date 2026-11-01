import { ComponentType } from "../types/payload/component";
import type { RawStringSelectPayload } from "../types/payload/component";
import { validateStringSelectPayload } from "../util/validate";
import { StringSelectMenuOptionBuilder } from "./StringSelectMenuOptionBuilder";

export class StringSelectMenuBuilder {
    private readonly data: RawStringSelectPayload = {
        type: ComponentType.StringSelect,
        custom_id: "",
        options: [],
    };

    public constructor(customId?: string) {
        if (customId !== undefined) this.data.custom_id = customId;
    }

    public setCustomId(customId: string): this {
        this.data.custom_id = customId;
        return this;
    }

    public setPlaceholder(placeholder: string): this {
        this.data.placeholder = placeholder;
        return this;
    }

    public setMinValues(minValues: number): this {
        this.data.min_values = minValues;
        return this;
    }

    public setMaxValues(maxValues: number): this {
        this.data.max_values = maxValues;
        return this;
    }

    public setDisabled(disabled = true): this {
        this.data.disabled = disabled;
        return this;
    }

    public addOption(option: StringSelectMenuOptionBuilder): this {
        this.data.options.push(option.toJSON());
        return this;
    }

    public addOptions(...options: StringSelectMenuOptionBuilder[]): this {
        this.data.options.push(...options.map((option) => option.toJSON()));
        return this;
    }

    public toJSON(): RawStringSelectPayload {
        validateStringSelectPayload(this.data);
        return structuredClone(this.data);
    }
}
