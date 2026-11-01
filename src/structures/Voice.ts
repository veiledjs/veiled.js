import type {
    RawIceServer,
    RawIceServerResponse,
    RawTurnCredentials,
    RawVoiceState,
} from "../types/response/bot";
import type { RawUser } from "../types/response/user";
import {
    asArray,
    asBoolean,
    asNullableNumber,
    asNullableString,
    asNumber,
    asRecord,
    asString,
    hasRecord,
    unwrapList,
    unwrapRecord,
} from "../util/structure";
import { Structure } from "./Structure";
import { User } from "./User";

export class VoiceState extends Structure<RawVoiceState> {
    public readonly userId: string;
    public readonly laneId: string | null;
    public readonly roomId: string | null;
    public readonly sessionId: string | null;
    public readonly user: User | null;
    public readonly isMuted: boolean;
    public readonly isDeafened: boolean;
    public readonly isStreaming: boolean;
    public readonly isVideo: boolean;

    private constructor(raw: RawVoiceState) {
        super(raw);
        const userRaw = asRecord(raw.user ?? raw.User);
        this.user = hasRecord(userRaw) ? User.from(userRaw as unknown as RawUser) : null;
        this.userId = asString(raw.userId ?? raw.id ?? this.user?.id);
        this.laneId = asNullableString(raw.laneId);
        this.roomId = asNullableString(raw.roomId);
        this.sessionId = asNullableString(raw.sessionId);
        this.isMuted = asBoolean(raw.isMuted ?? raw.mute ?? raw.selfMute);
        this.isDeafened = asBoolean(raw.isDeafened ?? raw.deaf ?? raw.selfDeaf);
        this.isStreaming = asBoolean(raw.isStreaming ?? raw.streaming);
        this.isVideo = asBoolean(raw.isVideo ?? raw.video);
    }

    public static from(value: unknown): VoiceState {
        return new VoiceState(unwrapRecord(value, ["voiceState", "VoiceState", "state"]) as RawVoiceState);
    }
}

export class VoiceRoster extends Structure<Record<string, unknown>> {
    public readonly laneId: string | null;
    public readonly roomId: string | null;
    public readonly states: VoiceState[];

    private constructor(raw: Record<string, unknown>) {
        super(raw);
        this.laneId = asNullableString(raw.laneId);
        this.roomId = asNullableString(raw.roomId);
        this.states = unwrapList(raw, ["states", "voiceStates", "users"]).map(VoiceState.from);
    }

    public static from(value: unknown): VoiceRoster {
        return new VoiceRoster(unwrapRecord(value, ["voice", "roster", "VoiceRoster"]));
    }
}

export class IceServer extends Structure<RawIceServer> {
    public readonly urls: string[];
    public readonly username: string | null;
    public readonly credential: string | null;

    private constructor(raw: RawIceServer) {
        super(raw);
        this.urls = typeof raw.urls === "string" ? [raw.urls] : asArray(raw.urls).filter((url): url is string => typeof url === "string");
        this.username = asNullableString(raw.username);
        this.credential = asNullableString(raw.credential);
    }

    public static from(value: unknown): IceServer {
        return new IceServer(asRecord(value) as RawIceServer);
    }
}

export class IceServerResponse extends Structure<RawIceServerResponse> {
    public readonly iceServers: IceServer[];
    public readonly ttl: number | null;

    private constructor(raw: RawIceServerResponse) {
        super(raw);
        this.iceServers = asArray(raw.iceServers).map(IceServer.from);
        this.ttl = asNullableNumber(raw.ttl);
    }

    public static from(value: unknown): IceServerResponse {
        return new IceServerResponse(unwrapRecord(value, ["ice", "iceServersResponse"]) as RawIceServerResponse);
    }
}

export class VoiceCredentials extends Structure<RawTurnCredentials> {
    public readonly username: string | null;
    public readonly credential: string | null;
    public readonly urls: string[];
    public readonly ttl: number | null;

    private constructor(raw: RawTurnCredentials) {
        super(raw);
        this.username = asNullableString(raw.username);
        this.credential = asNullableString(raw.credential);
        this.urls = typeof raw.urls === "string" ? [raw.urls] : asArray(raw.urls).filter((url): url is string => typeof url === "string");
        this.ttl = asNullableNumber(raw.ttl);
    }

    public static from(value: unknown): VoiceCredentials {
        return new VoiceCredentials(unwrapRecord(value, ["credentials", "turn", "VoiceCredentials"]) as RawTurnCredentials);
    }
}
