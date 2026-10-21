export enum ComponentType {
    ActionRow = 1,
    Button = 2,
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
}

export interface RawActionRowPayload {
    type: ComponentType.ActionRow;
    components: RawButtonPayload[];
}
