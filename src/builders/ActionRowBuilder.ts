import { ComponentType } from "../types/payload/component";
import type {
    RawActionRowComponentPayload,
    RawActionRowPayload,
} from "../types/payload/component";
import { validateActionRowPayload } from "../util/validate";
import { ButtonBuilder } from "./ButtonBuilder";
import { StringSelectMenuBuilder } from "./StringSelectMenuBuilder";

export interface ActionRowComponentBuilder<T extends RawActionRowComponentPayload = RawActionRowComponentPayload> {
    toJSON(): T;
}

export class ActionRowBuilder {
    private readonly components: ActionRowComponentBuilder[] = [];

    public addComponent(component: ActionRowComponentBuilder): this {
        this.components.push(component);
        return this;
    }

    public addComponents(...components: ActionRowComponentBuilder[]): this {
        this.components.push(...components);
        return this;
    }

    public addButton(button: ButtonBuilder): this {
        return this.addComponent(button);
    }

    public addButtons(...buttons: ButtonBuilder[]): this {
        return this.addComponents(...buttons);
    }

    public addSelectMenu(select: StringSelectMenuBuilder): this {
        return this.addComponent(select);
    }

    public addLinkButton(label: string, url: string): this {
        return this.addButton(ButtonBuilder.link(label, url));
    }

    public toJSON(): RawActionRowPayload {
        const data: RawActionRowPayload = {
            type: ComponentType.ActionRow,
            components: this.components.map((component) => component.toJSON()),
        };

        validateActionRowPayload(data);
        return structuredClone(data);
    }
}
