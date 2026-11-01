import type { RawStringSelectOptionPayload } from "../types/payload/component";
import { validateStringSelectOptionPayload } from "../util/validate";

export class StringSelectMenuOptionBuilder {
    private readonly data: RawStringSelectOptionPayload;

    public constructor(label: string, value: string) {
        this.data = { label, value };
    }

    public setLabel(label: string): this {
        this.data.label = label;
        return this;
    }

    public setValue(value: string): this {
        this.data.value = value;
        return this;
    }

    public setDescription(description: string): this {
        this.data.description = description;
        return this;
    }

    public setDefault(isDefault = true): this {
        this.data.default = isDefault;
        return this;
    }

    public setEmoji(emoji: unknown): this {
        this.data.emoji = emoji;
        return this;
    }

    public toJSON(): RawStringSelectOptionPayload {
        validateStringSelectOptionPayload(this.data);
        return structuredClone(this.data);
    }
}
