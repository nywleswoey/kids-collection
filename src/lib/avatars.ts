/** Preset child avatars (Q3 = preset set, no upload). Stored as a key. */
export const AVATAR_PRESETS = [
  { key: "fox", emoji: "🦊", label: "Fox" },
  { key: "dino", emoji: "🦕", label: "Dino" },
  { key: "robot", emoji: "🤖", label: "Robot" },
  { key: "cat", emoji: "🐱", label: "Cat" },
  { key: "owl", emoji: "🦉", label: "Owl" },
  { key: "shark", emoji: "🦈", label: "Shark" },
  { key: "unicorn", emoji: "🦄", label: "Unicorn" },
  { key: "dragon", emoji: "🐉", label: "Dragon" },
] as const;

export type AvatarKey = (typeof AVATAR_PRESETS)[number]["key"];

/** Array of all valid avatar keys. */
export const AVATAR_KEYS = AVATAR_PRESETS.map((a) => a.key) as AvatarKey[];

/** Type guard: true if the given string is a valid avatar key. */
export function isValidAvatar(key: string): key is AvatarKey {
  return AVATAR_KEYS.includes(key as AvatarKey);
}

/** Get the emoji for a given avatar key, defaulting to "❓" if not found. */
export function avatarEmoji(key: string): string {
  return AVATAR_PRESETS.find((a) => a.key === key)?.emoji ?? "❓";
}
