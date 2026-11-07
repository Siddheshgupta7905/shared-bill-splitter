export type MemberForSplit = { id: string };

export type ShareAllocation = {
  memberId: string;
  amountCents: number;
};

/**
 * Allocates every cent. Members must already be ordered by insertion order.
 * The first `remainder` members receive one additional cent.
 */
export function splitBill(
  totalCents: number,
  members: readonly MemberForSplit[],
): ShareAllocation[] {
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0) {
    throw new Error("Total must be a positive whole number of cents.");
  }
  if (members.length === 0) {
    throw new Error("A bill requires at least one home member.");
  }

  const base = Math.floor(totalCents / members.length);
  const remainder = totalCents % members.length;

  return members.map((member, index) => ({
    memberId: member.id,
    amountCents: base + (index < remainder ? 1 : 0),
  }));
}
