/**
 * Card name -> National Pokédex number, for the cards the
 * `pokeapi-official-artwork` provider can draw (Kanto Pokémon, Johto Pokémon).
 *
 * Checked in rather than resolved at request time: PokéAPI's `/pokemon/<name>`
 * lookup would make the mapping change underneath a reviewed image with no diff
 * to show for it, which is exactly the failure `promptHash` and `providerSegment`
 * exist to prevent elsewhere in this pipeline. Pinning it here makes a wrong
 * entry a one-line PR comment instead of a silent drift.
 *
 * Only the two Pokémon themes are covered. A card from any other theme is not
 * drawn by this lane at all — see `pokeapi-official-artwork.ts`'s
 * `resolvePokemonCard`, which never consults this table unless the prompt
 * already looks like one of these cards'.
 */
export const POKEMON_NATIONAL_DEX_NUMBERS: Readonly<Record<string, number>> = {
  // Kanto Pokémon
  Bulbasaur: 1,
  Charmander: 4,
  Charizard: 6,
  Squirtle: 7,
  Caterpie: 10,
  Pidgey: 16,
  Rattata: 19,
  Ekans: 23,
  Nidoking: 34,
  Jigglypuff: 39,
  Diglett: 50,
  Meowth: 52,
  Psyduck: 54,
  Growlithe: 58,
  Arcanine: 59,
  Alakazam: 65,
  Machamp: 68,
  Gengar: 94,
  Magikarp: 129,
  Gyarados: 130,
  Eevee: 133,
  Vaporeon: 134,
  Snorlax: 143,
  Articuno: 144,
  Zapdos: 145,
  Moltres: 146,
  Dragonite: 149,
  Mewtwo: 150,
  Mew: 151,
  Pikachu: 25,

  // Johto Pokémon
  Chikorita: 152,
  Meganium: 154,
  Cyndaquil: 155,
  Typhlosion: 157,
  Totodile: 158,
  Feraligatr: 160,
  Sentret: 161,
  Hoothoot: 163,
  Ledyba: 165,
  Spinarak: 167,
  Pichu: 172,
  Togepi: 175,
  Mareep: 179,
  Ampharos: 181,
  Marill: 183,
  Hoppip: 187,
  Wooper: 194,
  Espeon: 196,
  Umbreon: 197,
  Pineco: 204,
  Scizor: 212,
  Slugma: 218,
  Houndoom: 229,
  Raikou: 243,
  Entei: 244,
  Suicune: 245,
  Tyranitar: 248,
  Lugia: 249,
  "Ho-Oh": 250,
  Celebi: 251,
};

/** National Pokédex number for a card name, or undefined if not mapped. */
export function nationalDexNumber(name: string): number | undefined {
  return POKEMON_NATIONAL_DEX_NUMBERS[name];
}
