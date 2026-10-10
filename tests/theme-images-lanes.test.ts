import { describe, expect, it } from "vitest";
import { runLanes, type LaneOutcome } from "../scripts/theme-images/lanes";

describe("runLanes", () => {
  it("runs every lane and reports each outcome", async () => {
    const outcomes = await runLanes([
      { id: "a", run: async () => ({ id: "a", ok: true, detail: "ok" }) },
      { id: "b", run: async () => ({ id: "b", ok: true, detail: "ok" }) },
    ]);
    expect(outcomes.map((o) => o.id)).toEqual(["a", "b"]);
    expect(outcomes.every((o) => o.ok)).toBe(true);
  });

  it("runs lanes concurrently, not sequentially", async () => {
    const order: string[] = [];
    const slow: LaneOutcome = { id: "slow", ok: true, detail: "ok" };
    const fast: LaneOutcome = { id: "fast", ok: true, detail: "ok" };

    await runLanes([
      {
        id: "slow",
        run: () =>
          new Promise((resolve) =>
            setTimeout(() => {
              order.push("slow");
              resolve(slow);
            }, 20),
          ),
      },
      {
        id: "fast",
        run: () =>
          new Promise((resolve) =>
            setTimeout(() => {
              order.push("fast");
              resolve(fast);
            }, 1),
          ),
      },
    ]);

    expect(order).toEqual(["fast", "slow"]);
  });

  it("reports a rejecting lane as a failure without losing the other lane's result", async () => {
    const outcomes = await runLanes([
      {
        id: "failing",
        run: () => Promise.reject(new Error("spawn ENOENT")),
      },
      { id: "ok", run: async () => ({ id: "ok", ok: true, detail: "ok" }) },
    ]);

    expect(outcomes).toEqual([
      { id: "failing", ok: false, detail: "spawn ENOENT" },
      { id: "ok", ok: true, detail: "ok" },
    ]);
  });

  it("reports a lane that resolves with ok:false as-is", async () => {
    const outcomes = await runLanes([
      { id: "a", run: async () => ({ id: "a", ok: false, detail: "exited with status 1" }) },
    ]);
    expect(outcomes).toEqual([{ id: "a", ok: false, detail: "exited with status 1" }]);
  });
});
