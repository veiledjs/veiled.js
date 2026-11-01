export function normalizeBotToken(token: string): string {
    const trimmed = token.trim();
    return trimmed.startsWith("Bot ") ? trimmed : `Bot ${trimmed}`;
}
