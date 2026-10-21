import { ButtonStyle, ComponentType } from "../types/payload/component";
import type { RawButtonPayload } from "../types/payload/component";
import { validateButtonPayload } from "../util/validate";

export class ButtonBuilder {
    private readonly data: RawButtonPayload;

    private constructor(data: RawButtonPayload) {
        this.data = data;
    }

    public static link(label: string, url: string): ButtonBuilder {
        return new ButtonBuilder({
            type: ComponentType.Button,
            style: ButtonStyle.Link,
            label,
            url,
        });
    }

    public static primary(label: string, customId: string): ButtonBuilder {
        return ButtonBuilder.custom(ButtonStyle.Primary, label, customId);
    }

    public static secondary(label: string, customId: string): ButtonBuilder {
        return ButtonBuilder.custom(ButtonStyle.Secondary, label, customId);
    }

    public static success(label: string, customId: string): ButtonBuilder {
        return ButtonBuilder.custom(ButtonStyle.Success, label, customId);
    }

    public static danger(label: string, customId: string): ButtonBuilder {
        return ButtonBuilder.custom(ButtonStyle.Danger, label, customId);
    }

    public static custom(
        style: Exclude<ButtonStyle, ButtonStyle.Link>,
        label: string,
        customId: string,
    ): ButtonBuilder {
        return new ButtonBuilder({
            type: ComponentType.Button,
            style,
            label,
            custom_id: customId,
        });
    }

    public setDisabled(disabled = true): this {
        this.data.disabled = disabled;
        return this;
    }

    public toJSON(): RawButtonPayload {
        validateButtonPayload(this.data);
        return structuredClone(this.data);
    }
}
