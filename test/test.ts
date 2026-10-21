import { Webhook } from "../src";

const webhook = new Webhook(Bun.env.WEBHOOK_URL as string);

try {
    const response = await webhook.send("test");
    if (response.ok) {
        console.log("Webhook sent successfully!");
    } else {
        console.error("Failed to send webhook:", await response.text());
    }
} catch (error) {
    console.error("Error:", error);
}