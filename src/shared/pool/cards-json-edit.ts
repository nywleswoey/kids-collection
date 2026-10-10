/**
 * Format-preserving writer for `pnpm theme-picks`'s Step 8 edit: set the
 * theme's `provider` and a sparse per-card `provider` override list in
 * `seed-content/cards.json`, touching no other field and no other theme
 * (see `docs/NEW-THEME-RUNBOOK.md` Step 8 and `src/shared/pool/theme-picks.ts`).
 *
 * `JSON.parse` + `JSON.stringify` is not an option: it would reformat the
 * whole 3000+ line file (key order, spacing, trailing newline) and turn a
 * two-line diff into a file-sized one. Instead this parses the raw text into
 * a minimal tree that also records each value's exact source span (`start`,
 * `end`) and, for objects, each top-level member's key position and the
 * positions of the commas between members — just enough to compute a small
 * set of character-range edits (replace one string's quoted value, delete a
 * member's own line, or insert a new line next to a sibling's) and splice
 * them into the original text. Everything outside those ranges — indentation,
 * key order, every other field — is untouched by construction.
 */

interface StringNode {
  type: "string";
  start: number;
  end: number;
  value: string;
}
interface ArrayNode {
  type: "array";
  start: number;
  end: number;
  elements: JNode[];
}
interface ObjectNode {
  type: "object";
  start: number;
  end: number;
  members: JMember[];
  /** Absolute positions of the commas between members, in order (length = members.length - 1). */
  commas: number[];
}
interface OtherNode {
  type: "other";
  start: number;
  end: number;
}
type JNode = StringNode | ArrayNode | ObjectNode | OtherNode;

interface JMember {
  key: string;
  /** Index of the key's opening quote. */
  keyStart: number;
  valueNode: JNode;
}

function skipWs(text: string, i: number): number {
  while (i < text.length && /\s/.test(text[i]!)) i++;
  return i;
}

function parseString(text: string, i: number): StringNode {
  const start = i;
  let j = i + 1;
  while (j < text.length) {
    const ch = text[j];
    if (ch === "\\") {
      j += 2;
      continue;
    }
    if (ch === '"') {
      j++;
      break;
    }
    j++;
  }
  return { type: "string", start, end: j, value: JSON.parse(text.slice(start, j)) };
}

function parseValue(text: string, i: number): JNode {
  i = skipWs(text, i);
  const c = text[i];
  if (c === "{") return parseObject(text, i);
  if (c === "[") return parseArray(text, i);
  if (c === '"') return parseString(text, i);
  let j = i;
  while (j < text.length && !",}] \n\r\t".includes(text[j]!)) j++;
  return { type: "other", start: i, end: j };
}

function parseObject(text: string, i: number): ObjectNode {
  const start = i;
  i++;
  const members: JMember[] = [];
  const commas: number[] = [];
  i = skipWs(text, i);
  if (text[i] === "}") return { type: "object", start, end: i + 1, members, commas };
  for (;;) {
    i = skipWs(text, i);
    const keyNode = parseString(text, i);
    const keyStart = i;
    i = skipWs(text, keyNode.end);
    if (text[i] !== ":") throw new Error(`cards-json-edit: expected ':' at index ${i}`);
    i = skipWs(text, i + 1);
    const valueNode = parseValue(text, i);
    members.push({ key: keyNode.value, keyStart, valueNode });
    i = skipWs(text, valueNode.end);
    if (text[i] === ",") {
      commas.push(i);
      i = i + 1;
      continue;
    }
    if (text[i] === "}") {
      i = i + 1;
      break;
    }
    throw new Error(`cards-json-edit: expected ',' or '}' at index ${i}`);
  }
  return { type: "object", start, end: i, members, commas };
}

function parseArray(text: string, i: number): ArrayNode {
  const start = i;
  i++;
  const elements: JNode[] = [];
  i = skipWs(text, i);
  if (text[i] === "]") return { type: "array", start, end: i + 1, elements };
  for (;;) {
    i = skipWs(text, i);
    const el = parseValue(text, i);
    elements.push(el);
    i = skipWs(text, el.end);
    if (text[i] === ",") {
      i = i + 1;
      continue;
    }
    if (text[i] === "]") {
      i = i + 1;
      break;
    }
    throw new Error(`cards-json-edit: expected ',' or ']' at index ${i}`);
  }
  return { type: "array", start, end: i, elements };
}

function member(obj: ObjectNode, key: string): JMember | undefined {
  return obj.members.find((m) => m.key === key);
}

function asString(node: JNode, what: string): StringNode {
  if (node.type !== "string") throw new Error(`cards-json-edit: expected ${what} to be a string`);
  return node;
}
function asArray(node: JNode, what: string): ArrayNode {
  if (node.type !== "array") throw new Error(`cards-json-edit: expected ${what} to be an array`);
  return node;
}
function asObject(node: JNode, what: string): ObjectNode {
  if (node.type !== "object") throw new Error(`cards-json-edit: expected ${what} to be an object`);
  return node;
}

/** Whitespace run immediately before `pos`, up to (not including) the preceding newline. */
function leadingIndent(text: string, pos: number): string {
  let i = pos;
  while (i > 0 && (text[i - 1] === " " || text[i - 1] === "\t")) i--;
  return text.slice(i, pos);
}

interface Edit {
  start: number;
  end: number;
  text: string;
}

/**
 * Edit `rawText` (the exact bytes of `seed-content/cards.json`) to set the
 * theme's `provider` to `picks.themeProvider` and each card's `provider` to
 * `picks.cardOverrides[cardName]` (removing any existing card-level
 * `provider` not in that map). Only those `provider` fields are touched;
 * every other byte, including whitespace, is reproduced unchanged.
 */
export function applyThemePicks(
  rawText: string,
  themeName: string,
  picks: { themeProvider: string; cardOverrides: Readonly<Record<string, string>> },
): string {
  const root = asObject(parseValue(rawText, 0), "the cards.json root");
  const themesMember = member(root, "themes");
  if (!themesMember) throw new Error('cards-json-edit: cards.json has no top-level "themes" array');
  const themesArray = asArray(themesMember.valueNode, '"themes"');

  const themeNode = themesArray.elements.find((el) => {
    const obj = el.type === "object" ? el : undefined;
    const nameMember = obj && member(obj, "name");
    return nameMember && nameMember.valueNode.type === "string" && nameMember.valueNode.value === themeName;
  });
  if (!themeNode) throw new Error(`cards-json-edit: no theme named "${themeName}" in cards.json`);
  const theme = asObject(themeNode, `theme "${themeName}"`);

  const edits: Edit[] = [];
  const themeEdit = setStringMember(rawText, theme, "provider", picks.themeProvider, "name", "after");
  if (themeEdit) edits.push(themeEdit);

  const cardsMember = member(theme, "cards");
  if (!cardsMember) throw new Error(`cards-json-edit: theme "${themeName}" has no "cards" array`);
  const cardsArray = asArray(cardsMember.valueNode, `"${themeName}".cards`);

  for (const el of cardsArray.elements) {
    const cardObj = asObject(el, `a card in theme "${themeName}"`);
    const nameMember = member(cardObj, "name");
    const cardName = nameMember ? asString(nameMember.valueNode, "card name").value : undefined;
    if (cardName === undefined) continue;
    const desired = picks.cardOverrides[cardName];
    const cardEdit = setStringMember(rawText, cardObj, "provider", desired, "sourceUrl", "last");
    if (cardEdit) edits.push(cardEdit);
  }

  edits.sort((a, b) => b.start - a.start);
  let result = rawText;
  for (const e of edits) {
    result = result.slice(0, e.start) + e.text + result.slice(e.end);
  }
  return result;
}

/**
 * Compute the edit (if any) to set or clear a string member on `obj`.
 *
 * `anchorKey` names the sibling member a *new* member is inserted next to
 * (only used when `value` is defined and no member named `key` exists yet):
 * `anchorMode: "after"` inserts immediately after the anchor as a new
 * non-last member (theme `provider`, right after `name`); `"last"` inserts
 * right after the anchor's value as the new last member (card `provider`,
 * right after `sourceUrl`). Removing an existing member works at any
 * position, regardless of where it was inserted.
 */
function setStringMember(
  text: string,
  obj: ObjectNode,
  key: string,
  value: string | undefined,
  anchorKey: string,
  anchorMode: "after" | "last",
): Edit | undefined {
  const idx = obj.members.findIndex((m) => m.key === key);
  if (idx !== -1) {
    const existing = obj.members[idx]!;
    if (value !== undefined) {
      return { start: existing.valueNode.start, end: existing.valueNode.end, text: JSON.stringify(value) };
    }
    const n = obj.members.length;
    if (idx === n - 1) {
      return { start: obj.commas[idx - 1]!, end: existing.valueNode.end, text: "" };
    }
    const start = idx === 0 ? obj.start + 1 : obj.commas[idx - 1]! + 1;
    const end = obj.commas[idx]! + 1;
    return { start, end, text: "" };
  }

  if (value === undefined) return undefined;

  const anchor = member(obj, anchorKey);
  if (!anchor) throw new Error(`cards-json-edit: no "${anchorKey}" member to anchor "${key}" on`);
  const anchorIdx = obj.members.indexOf(anchor);
  const indentText = leadingIndent(text, anchor.keyStart);

  if (anchorMode === "last") {
    return {
      start: anchor.valueNode.end,
      end: anchor.valueNode.end,
      text: `,\n${indentText}"${key}": ${JSON.stringify(value)}`,
    };
  }

  const commaPos = obj.commas[anchorIdx]!;
  return {
    start: commaPos + 1,
    end: commaPos + 1,
    text: `\n${indentText}"${key}": ${JSON.stringify(value)},`,
  };
}
