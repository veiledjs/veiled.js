import { defineCommands } from "./types";
import { sendEmbed, successEmbed } from "../lib/respond";
import { fieldsEmbed } from "../lib/embeds";
import { truncate } from "../lib/format";
import { wordsOf } from "../lib/args";

export const uploadCommands = defineCommands(
    {
        name: "files",
        description: "Upload a text file with a visual container.",
        usage: "files [text]",
        run: async ({ client, laneId, args }) => {
            const body = args || `Uploaded by the veiled.js example at ${new Date().toISOString()}.`;
            const data = new TextEncoder().encode(body);
            const result = await client.rest.sendContainerWithFiles(laneId, {
                title: "Staged upload",
                description: "This file was uploaded first, then sent with `stagedUploadIds`.",
                sections: [
                    { divider: true, content: `**Filename** example.txt\n**Size** ${data.byteLength} bytes` },
                ],
                footer: "exemple/commands/uploads.ts",
                accentColor: 0x57f287,
            }, [
                {
                    data,
                    filename: "example.txt",
                    contentType: "text/plain",
                },
            ]);

            await sendEmbed(client, laneId, successEmbed("File sent")
                .addField("Message", result.message?.id ?? "unknown", true)
                .addField("Uploads", String(result.uploads.length), true)
                .addField("Content", truncate(body, 1000), false));
        },
    },
    {
        name: "upload",
        description: "Stage an upload without sending a message.",
        usage: "upload <filename> [text]",
        run: async ({ client, laneId, args }) => {
            const [filename = "example.txt", ...rest] = wordsOf(args);
            const body = rest.join(" ") || `Staged by the veiled.js example at ${new Date().toISOString()}.`;
            const upload = await client.rest.stageUpload(new TextEncoder().encode(body), {
                filename,
                contentType: "text/plain",
                description: "Staged by veiled.js",
            });

            await sendEmbed(client, laneId, fieldsEmbed("Upload staged", [
                { name: "ID", value: upload?.id ?? "unknown", inline: true },
                { name: "Filename", value: upload?.filename ?? filename, inline: true },
                { name: "Type", value: upload?.contentType ?? "unknown", inline: true },
                { name: "Size", value: String(upload?.size ?? body.length), inline: true },
                { name: "URL", value: truncate(upload?.url ?? "not returned", 1000), inline: false },
            ]));
        },
    },
    {
        name: "jsonFile",
        description: "Upload the latest arguments as a JSON file.",
        usage: "jsonFile [text]",
        run: async ({ client, laneId, args }) => {
            const payload = JSON.stringify({
                laneId,
                text: args,
                sentAt: new Date().toISOString(),
            }, null, 2);
            const result = await client.rest.sendContainerWithFiles(laneId, {
                title: "JSON upload",
                description: "A generated JSON file attached to a Components V2 container.",
                accentColor: 0xfee75c,
            }, [{
                data: new TextEncoder().encode(payload),
                filename: "payload.json",
                contentType: "application/json",
            }]);

            await sendEmbed(client, laneId, successEmbed("JSON file sent")
                .addField("Message", result.message?.id ?? "unknown", true)
                .addField("Upload", result.uploads[0]?.id ?? "unknown", true));
        },
    },
);
