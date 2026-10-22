export const EMOJIS = ['👍', '❤️', '😂'];
export function summarizeReactions(values, messageId, userId) {
  const counts = Object.fromEntries(EMOJIS.map((emoji) => [emoji, 0]));
  let mine = null;
  for (const [field, emoji] of Object.entries(values || {})) {
    if (!field.startsWith(messageId + ':') || !EMOJIS.includes(emoji)) {
      continue;
    }
    counts[emoji]++;
    if (field === `${messageId}:${userId}`) {
      mine = emoji;
    }
  }
  return { counts, mine };
}
