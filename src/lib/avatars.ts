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

export const AVATAR_KEYS = AVATAR_PRESETS.map((a) => a.key) as AvatarKey[];

export function isValidAvatar(key: string): key is AvatarKey {
  return AVATAR_KEYS.includes(key as AvatarKey);
}

export function avatarEmoji(key: string): string {
  return AVATAR_PRESETS.find((a) => a.key === key)?.emoji ?? "❓";
}
