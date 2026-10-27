/**
 * Card name -> primary Pokémon type, for the same ~60 cards
 * `pokemon-dex-numbers.ts` maps to a national dex number.
 *
 * Checked in for the same reason as that table: pinning it here makes a wrong
 * entry a one-line PR comment instead of a silent drift, and keeps
 * `pokeapi-official-artwork`'s background colour reproducible without a
 * network lookup. Dual-typed Pokémon (e.g. Lugia is Psychic/Flying) record
 * only the FIRST-listed ("primary") type, which is what the official Pokédex
 * entry leads with.
 *
 * Only the two Pokémon themes are covered; see `pokemon-dex-numbers.ts` for
 * why a lookup miss there is treated as "not one of these cards" rather than
 * an error. A missing entry here instead falls back to `"normal"`'s colours
 * (`backgroundForType`) rather than throwing, since the background is a
 * cosmetic default, not a correctness-critical mapping like the dex number.
 */
export const POKEMON_PRIMARY_TYPES: Readonly<Record<string, string>> = {
  // Kanto Pokémon
  Bulbasaur: "grass",
  Charmander: "fire",
  Charizard: "fire",
  Squirtle: "water",
  Caterpie: "bug",
  Pidgey: "normal",
  Rattata: "normal",
  Ekans: "poison",
  Nidoking: "poison",
  Jigglypuff: "normal",
  Diglett: "ground",
  Meowth: "normal",
  Psyduck: "water",
  Growlithe: "fire",
  Arcanine: "fire",
  Alakazam: "psychic",
  Machamp: "fighting",
  Gengar: "ghost",
  Magikarp: "water",
  Gyarados: "water",
  Eevee: "normal",
  Vaporeon: "water",
  Snorlax: "normal",
  Articuno: "ice",
  Zapdos: "electric",
  Moltres: "fire",
  Dragonite: "dragon",
  Mewtwo: "psychic",
  Mew: "psychic",
  Pikachu: "electric",

  // Johto Pokémon
  Chikorita: "grass",
  Meganium: "grass",
  Cyndaquil: "fire",
  Typhlosion: "fire",
  Totodile: "water",
  Feraligatr: "water",
  Sentret: "normal",
  Hoothoot: "normal",
  Ledyba: "bug",
  Spinarak: "bug",
  Pichu: "electric",
  Togepi: "fairy",
  Mareep: "electric",
  Ampharos: "electric",
  Marill: "water",
  Hoppip: "grass",
  Wooper: "water",
  Espeon: "psychic",
  Umbreon: "dark",
  Pineco: "bug",
  Scizor: "bug",
  Slugma: "fire",
  Houndoom: "dark",
  Raikou: "electric",
  Entei: "fire",
  Suicune: "water",
  Tyranitar: "rock",
  Lugia: "psychic",
  "Ho-Oh": "fire",
  Celebi: "psychic",
};

/** Primary type for a card name, or undefined if not mapped. */
export function primaryType(name: string): string | undefined {
  return POKEMON_PRIMARY_TYPES[name];
}

/**
 * A soft, kid-friendly radial-gradient colour pair per Pokémon type: `center`
 * (lighter, at the middle of the frame) and `edge` (the type's colour, at the
 * frame's corners). Covers every type the main series uses, not only the
 * ones these two themes' primary types happen to hit, so a future theme
 * reusing this helper never needs a new palette entry.
 */
export const TYPE_BACKGROUND_PALETTE: Readonly<
  Record<string, { center: string; edge: string }>
> = {
  normal: { center: "#faf8f0", edge: "#e3ded0" },
  fire: { center: "#fff3e0", edge: "#ffb380" },
  water: { center: "#e3f6ff", edge: "#8ecfff" },
  electric: { center: "#fffde7", edge: "#ffe066" },
  grass: { center: "#eefbe8", edge: "#9ee6a0" },
  ice: { center: "#f0fbff", edge: "#b3e8f0" },
  fighting: { center: "#fdeeee", edge: "#e8a0a0" },
  poison: { center: "#f6ecfb", edge: "#d59fe0" },
  ground: { center: "#faf1e0", edge: "#e0c088" },
  flying: { center: "#f0f6ff", edge: "#c3d7f5" },
  psychic: { center: "#fff0f6", edge: "#ffb0d0" },
  bug: { center: "#f6fbe8", edge: "#cfe6a0" },
  rock: { center: "#f5f0e6", edge: "#d0c3a0" },
  ghost: { center: "#f3eefb", edge: "#b8a0d8" },
  dragon: { center: "#eef0fb", edge: "#a8b0e8" },
  dark: { center: "#efeef2", edge: "#a8a0b0" },
  steel: { center: "#f2f4f5", edge: "#c0c8cc" },
  fairy: { center: "#fff0f6", edge: "#ffc0da" },
};

/** Background colour pair for a type, falling back to `normal`'s if unknown. */
export function backgroundForType(type: string): { center: string; edge: string } {
  return TYPE_BACKGROUND_PALETTE[type] ?? TYPE_BACKGROUND_PALETTE.normal!;
}
