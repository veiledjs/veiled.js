export enum ComponentType {
    ActionRow = 1,
    Button = 2,
    StringSelect = 3,
    TextDisplay = 10,
    Separator = 14,
    Container = 17,
}

export enum ButtonStyle {
    Primary = 1,
    Secondary = 2,
    Success = 3,
    Danger = 4,
    Link = 5,
}

export interface RawButtonPayload {
    type: ComponentType.Button;
    style: ButtonStyle;
    label?: string;
    url?: string;
    custom_id?: string;
    disabled?: boolean;
    emoji?: unknown;
}

export interface RawStringSelectOptionPayload {
    label: string;
    value: string;
    description?: string;
    default?: boolean;
    emoji?: unknown;
}

export interface RawStringSelectPayload {
    type: ComponentType.StringSelect;
    custom_id: string;
    options: RawStringSelectOptionPayload[];
    placeholder?: string;
    min_values?: number;
    max_values?: number;
    disabled?: boolean;
}

export type RawActionRowComponentPayload = RawButtonPayload | RawStringSelectPayload;

export interface RawActionRowPayload {
    type: ComponentType.ActionRow;
    components: RawActionRowComponentPayload[];
}
