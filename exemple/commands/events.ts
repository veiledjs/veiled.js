import { defineCommands } from "./types";
import { reply, sendEmbed, successEmbed } from "../lib/respond";
import { fieldsEmbed, listEmbed } from "../lib/embeds";
import { shortDate } from "../lib/format";
import { requireText, targetId, targetText } from "../lib/args";

export const eventCommands = defineCommands(
    {
        name: "events",
        description: "List scheduled events.",
        usage: "events [roomId]",
        run: async ({ client, laneId, roomId, args }) => {
            const id = targetId(args, roomId, "room");
            const events = await client.rest.getScheduledEvents(id, { limit: 20 });

            await sendEmbed(client, laneId, listEmbed(
                `Scheduled events in ${id}`,
                events,
                (event, index) => `**${index + 1}.** ${event.name ?? "unnamed"} — \`${event.id}\`\n` +
                    `-# ${event.status ?? "unknown"} • starts ${shortDate(event.scheduledStartAt)}`,
                "No scheduled events.",
            ));
        },
    },
    {
        name: "event",
        description: "Show a scheduled event.",
        usage: "event <eventId>",
        run: async ({ client, laneId, args }) => {
            const eventId = targetId(args, "", "event");
            const event = await client.rest.getScheduledEvent(eventId);

            if (!event) {
                await reply(client, laneId, "Event not found.");
                return;
            }

            await sendEmbed(client, laneId, fieldsEmbed("Scheduled event", [
                { name: "Name", value: event.name ?? "unnamed", inline: true },
                { name: "ID", value: event.id, inline: true },
                { name: "Status", value: event.status ?? "unknown", inline: true },
                { name: "Room", value: event.roomId ?? "unknown", inline: true },
                { name: "Lane", value: event.laneId ?? "unknown", inline: true },
                { name: "Location", value: event.externalLocation ?? event.locationType ?? "unknown", inline: true },
                { name: "Starts", value: shortDate(event.scheduledStartAt), inline: true },
                { name: "Ends", value: shortDate(event.scheduledEndAt), inline: true },
                { name: "Description", value: event.description ?? "—", inline: false },
            ]));
        },
    },
    {
        name: "eventCreate",
        description: "Create an event in the current room.",
        usage: "eventCreate <name> [description]",
        aliases: ["createEvent"],
        run: async ({ client, laneId, roomId, args }) => {
            const [name = "", ...description] = args.split("|").map((part) => part.trim());
            const title = requireText(name, "Event name");
            const start = new Date(Date.now() + 60 * 60 * 1000).toISOString();
            const event = await client.rest.createScheduledEvent(roomId, {
                name: title,
                laneId,
                description: description.join(" | ") || null,
                locationType: "LANE",
                scheduledStartAt: start,
            });

            await sendEmbed(client, laneId, successEmbed("Event created")
                .addField("Name", event?.name ?? title, true)
                .addField("ID", event?.id ?? "unknown", true)
                .addField("Starts", shortDate(event?.scheduledStartAt ?? new Date(start)), true));
        },
    },
    {
        name: "eventUpdate",
        description: "Rename a scheduled event.",
        usage: "eventUpdate <eventId> <name>",
        run: async ({ client, laneId, args }) => {
            const target = targetText(args, "", "event");
            const event = await client.rest.updateScheduledEvent(target.id, { name: target.text });

            await sendEmbed(client, laneId, successEmbed("Event updated")
                .addField("ID", event?.id ?? target.id, true)
                .addField("Name", event?.name ?? target.text, true));
        },
    },
    {
        name: "eventDelete",
        description: "Cancel a scheduled event.",
        usage: "eventDelete <eventId>",
        run: async ({ client, laneId, args }) => {
            const eventId = targetId(args, "", "event");
            await client.rest.cancelScheduledEvent(eventId);
            await sendEmbed(client, laneId, successEmbed("Event cancelled", `Event \`${eventId}\` was cancelled.`));
        },
    },
    {
        name: "rsvp",
        description: "Set your RSVP status for an event.",
        usage: "rsvp <eventId> <status>",
        run: async ({ client, laneId, args }) => {
            const [eventId = "", status = "INTERESTED"] = args.trim().split(/\s+/);
            const normalized = status.toUpperCase();

            if (!eventId) throw new Error("Usage: rsvp <eventId> <INTERESTED|GOING|NOT_GOING>");

            await client.rest.setEventRsvp(eventId, normalized);
            await sendEmbed(client, laneId, successEmbed("RSVP set")
                .addField("Event", eventId, true)
                .addField("Status", normalized, true));
        },
    },
    {
        name: "unrsvp",
        description: "Remove your RSVP from an event.",
        usage: "unrsvp <eventId>",
        run: async ({ client, laneId, args }) => {
            const eventId = targetId(args, "", "event");
            await client.rest.removeEventRsvp(eventId);
            await sendEmbed(client, laneId, successEmbed("RSVP removed", `RSVP removed from \`${eventId}\`.`));
        },
    },
);
