export interface RawContainerLinkButtonPayload {
    label: string;
    url: string;
}

export interface RawContainerSectionPayload {
    divider?: boolean;
    content?: string;
}

export interface RawContainerCardPayload {
    title?: string;
    description?: string;
    sections?: RawContainerSectionPayload[];
    footer?: string;
    accentColor?: number;
    linkButtons?: RawContainerLinkButtonPayload[];
}

export interface RawContainerTextDisplay {
    type: 10;
    content: string;
}

export interface RawContainerDivider {
    type: 14;
    divider: true;
    spacing: number;
}

export interface RawContainerLinkButton {
    type: 2;
    style: 5;
    label: string;
    url: string;
}

export interface RawContainerActionRow {
    type: 1;
    components: RawContainerLinkButton[];
}

export type RawContainerChild =
    | RawContainerTextDisplay
    | RawContainerDivider
    | RawContainerActionRow;

export interface RawContainerPayload {
    type: 17;
    accent_color: number;
    components: RawContainerChild[];
}
