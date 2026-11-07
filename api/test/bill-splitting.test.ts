import { describe, expect, it } from "vitest";
import { splitBill } from "../src/services/bill-splitting";

describe("splitBill", () => {
  it("allocates remainder cents in member insertion order", () => {
    expect(splitBill(1000, [{ id: "a" }, { id: "b" }, { id: "c" }])).toEqual([
      { memberId: "a", amountCents: 334 },
      { memberId: "b", amountCents: 333 },
      { memberId: "c", amountCents: 333 }
    ]);
  });

  it("preserves the total exactly", () => {
    const allocations = splitBill(101, [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }]);
    expect(allocations.reduce((sum, share) => sum + share.amountCents, 0)).toBe(101);
  });

  it("rejects invalid totals and empty membership", () => {
    expect(() => splitBill(0, [{ id: "a" }])).toThrow();
    expect(() => splitBill(-2, [{ id: "a" }])).toThrow();
    expect(() => splitBill(1.5, [{ id: "a" }])).toThrow();
    expect(() => splitBill(100, [])).toThrow();
  });
});
