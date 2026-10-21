import { ComponentType } from "../types/payload/component";
import type { RawActionRowPayload } from "../types/payload/component";
import { validateActionRowPayload } from "../util/validate";
import { ButtonBuilder } from "./ButtonBuilder";

export class ActionRowBuilder {
    private readonly buttons: ButtonBuilder[] = [];

    public addButton(button: ButtonBuilder): this {
        this.buttons.push(button);
        return this;
    }

    public addButtons(...buttons: ButtonBuilder[]): this {
        this.buttons.push(...buttons);
        return this;
    }

    public addLinkButton(label: string, url: string): this {
        return this.addButton(ButtonBuilder.link(label, url));
    }

    public toJSON(): RawActionRowPayload {
        const data: RawActionRowPayload = {
            type: ComponentType.ActionRow,
            components: this.buttons.map((button) => button.toJSON()),
        };

        validateActionRowPayload(data);
        return structuredClone(data);
    }
}
