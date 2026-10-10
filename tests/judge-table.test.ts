import { describe, expect, it } from "vitest";
import { buildPickCommand, renderJudgeTable, type JudgeTableRow, type PickSelection } from "../src/shared/pool/judge-table";

function row(overrides: Partial<JudgeTableRow>): JudgeTableRow {
  return {
    name: "Longbowman",
    rarity: "common",
    imagePrompt: "a cheerful archer",
    candidates: [
      { providerId: "cloudflare-sdxl", fileName: "warriors-longbowman-aaaa-cloudflare-sdxl-bbbb.png" },
      { providerId: "supergrok-manual", fileName: "warriors-longbowman-aaaa-supergrok-manual-cccc.png" },
    ],
    outcome: { status: "missing" },
    ...overrides,
  };
}

describe("renderJudgeTable", () => {
  it("badges the judged winner's cell and shows its reason", () => {
    const html = renderJudgeTable({
      theme: "Warriors",
      rows: [row({ outcome: { status: "judged", winner: "cloudflare-sdxl", reason: "sharper lines" } })],
    });
    expect(html).toContain("Recommended");
    expect(html).toContain("sharper lines");
    expect(html).toContain("warriors-longbowman-aaaa-cloudflare-sdxl-bbbb.png");
    expect(html).toContain("warriors-longbowman-aaaa-supergrok-manual-cccc.png");
  });

  it("badges the only candidate for a single-candidate card, with no judge call implied", () => {
    const html = renderJudgeTable({
      theme: "Warriors",
      rows: [
        row({
          candidates: [{ providerId: "cloudflare-sdxl", fileName: "only.png" }],
          outcome: { status: "single", winner: "cloudflare-sdxl", reason: "only candidate available" },
        }),
      ],
    });
    expect(html).toContain("Recommended");
    expect(html).toContain("only candidate available");
  });

  it("shows a cached verdict distinctly from a freshly judged one, both still reasoned", () => {
    const html = renderJudgeTable({
      theme: "Warriors",
      rows: [row({ outcome: { status: "cached", winner: "supergrok-manual", reason: "better likeness" } })],
    });
    expect(html).toContain("cached");
    expect(html).toContain("better likeness");
  });

  it("shows no badge and the reason for an unjudged card", () => {
    const html = renderJudgeTable({
      theme: "Warriors",
      rows: [row({ outcome: { status: "unjudged", reason: "the claude CLI is not on PATH" } })],
    });
    expect(html).not.toContain('class="badge"');
    expect(html).toContain("the claude CLI is not on PATH");
  });

  it("shows a missing-candidate placeholder for a card with no candidate at all", () => {
    const html = renderJudgeTable({
      theme: "Warriors",
      rows: [
        row({
          candidates: [
            { providerId: "cloudflare-sdxl", fileName: undefined },
            { providerId: "supergrok-manual", fileName: undefined },
          ],
          outcome: { status: "missing" },
        }),
      ],
    });
    expect(html).toContain("no candidate");
    expect(html).not.toContain('class="badge"');
  });

  it("escapes card names and reasons", () => {
    const html = renderJudgeTable({
      theme: "Warriors",
      rows: [
        row({
          name: `<script>alert(1)</script>`,
          outcome: { status: "judged", winner: "cloudflare-sdxl", reason: `"quoted" & <tag>` },
        }),
      ],
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders a theme-wide --use-free command when every row agrees", () => {
    const html = renderJudgeTable({
      theme: "Warriors",
      rows: [
        row({ name: "A", outcome: { status: "judged", winner: "cloudflare-sdxl", reason: "x" } }),
        row({ name: "B", outcome: { status: "cached", winner: "cloudflare-sdxl", reason: "x" } }),
      ],
    });
    expect(html).toContain(`pnpm theme-picks "Warriors"</code>`);
  });

  it("renders a --use for the row(s) that differ from the majority", () => {
    const html = renderJudgeTable({
      theme: "Warriors",
      rows: [
        row({ name: "A", outcome: { status: "judged", winner: "cloudflare-sdxl", reason: "x" } }),
        row({ name: "B", outcome: { status: "judged", winner: "cloudflare-sdxl", reason: "x" } }),
        row({ name: "C", outcome: { status: "judged", winner: "supergrok-manual", reason: "x" } }),
      ],
    });
    expect(html).toContain(`--use \"C=supergrok-manual\"`);
  });

  it("leaves a card with no candidate at all out of the generated command", () => {
    const html = renderJudgeTable({
      theme: "Warriors",
      rows: [
        row({ name: "A", outcome: { status: "judged", winner: "cloudflare-sdxl", reason: "x" } }),
        row({
          name: "B",
          candidates: [
            { providerId: "cloudflare-sdxl", fileName: undefined },
            { providerId: "supergrok-manual", fileName: undefined },
          ],
          outcome: { status: "missing" },
        }),
      ],
    });
    expect(html).not.toContain("B=");
  });
});

describe("buildPickCommand", () => {
  function sel(name: string, providerId?: string): PickSelection {
    return { name, providerId };
  }

  it("produces a bare theme command when every selection agrees", () => {
    expect(buildPickCommand("Warriors", [sel("A", "cloudflare-sdxl"), sel("B", "cloudflare-sdxl")])).toBe(
      'pnpm theme-picks "Warriors"',
    );
  });

  it("adds --use only for selections that differ from the majority", () => {
    expect(
      buildPickCommand("Warriors", [
        sel("A", "cloudflare-sdxl"),
        sel("B", "cloudflare-sdxl"),
        sel("C", "supergrok-manual"),
      ]),
    ).toBe('pnpm theme-picks "Warriors" --use "C=supergrok-manual"');
  });

  it("skips a selection with no providerId (no candidate to pick)", () => {
    expect(buildPickCommand("Warriors", [sel("A", "cloudflare-sdxl"), sel("B", undefined)])).toBe(
      'pnpm theme-picks "Warriors"',
    );
  });

  it("breaks a tie toward whichever provider reaches the max count first", () => {
    expect(
      buildPickCommand("Warriors", [
        sel("A", "supergrok-manual"),
        sel("B", "cloudflare-sdxl"),
        sel("C", "supergrok-manual"),
        sel("D", "cloudflare-sdxl"),
      ]),
    ).toBe('pnpm theme-picks "Warriors" --use "B=cloudflare-sdxl" --use "D=cloudflare-sdxl"');
  });

  it("shell-quotes a theme or card name containing a double quote", () => {
    expect(buildPickCommand('Odd "Theme"', [sel("A", "cloudflare-sdxl"), sel("B", "supergrok-manual")])).toBe(
      'pnpm theme-picks "Odd \\"Theme\\"" --use "B=supergrok-manual"',
    );
  });
});
