import { Hono } from "hono";
import { cleanString, jsonError, readJsonObject } from "../lib/http";
import { createId } from "../lib/ids";
import { splitBill } from "../services/bill-splitting";
import type { BillRecord, Bindings, MemberRecord, ShareRecord } from "../types";

const bills = new Hono<{ Bindings: Bindings }>();

bills.post("/homes/:homeId/bills", async (context) => {
  const homeId = context.req.param("homeId");
  const home = await context.env.DB.prepare("SELECT id FROM homes WHERE id = ?")
    .bind(homeId).first<{ id: string }>();
  if (!home) return jsonError(context, 404, "Home not found.");

  const body = await readJsonObject(context.req.raw);
  const title = cleanString(body?.title, 160);
  const totalCents = body?.totalCents;

  if (!title) return jsonError(context, 422, "Bill title must be a non-empty string of at most 160 characters.");
  if (typeof totalCents !== "number" || !Number.isSafeInteger(totalCents) || totalCents <= 0) {
    return jsonError(context, 422, "totalCents must be a positive whole number of cents.");
  }

  const memberResult = await context.env.DB.prepare(
    "SELECT id, home_id, name FROM members WHERE home_id = ? ORDER BY rowid ASC",
  ).bind(homeId).all<MemberRecord>();
  const members = memberResult.results;
  if (members.length === 0) return jsonError(context, 422, "Cannot create a bill for a home with no members.");

  const allocations = splitBill(totalCents, members);
  const billId = createId();
  const shareRows = allocations.map((allocation) => ({
    id: createId(),
    memberId: allocation.memberId,
    amountCents: allocation.amountCents,
    paidAt: null,
  }));

  const statements = [
    context.env.DB.prepare(
      "INSERT INTO bills (id, home_id, title, total_cents) VALUES (?, ?, ?, ?)",
    ).bind(billId, homeId, title, totalCents),
    ...shareRows.map((share) => context.env.DB.prepare(
      "INSERT INTO shares (id, bill_id, member_id, amount_cents) VALUES (?, ?, ?, ?)",
    ).bind(share.id, billId, share.memberId, share.amountCents)),
  ];

  try {
    await context.env.DB.batch(statements);
  } catch {
    return jsonError(context, 500, "Could not save the bill. Please try again.");
  }

  return context.json({
    id: billId,
    homeId,
    title,
    totalCents,
    shares: shareRows,
  }, 201);
});

bills.get("/homes/:homeId/bills", async (context) => {
  const homeId = context.req.param("homeId");
  const home = await context.env.DB.prepare("SELECT id FROM homes WHERE id = ?")
    .bind(homeId).first<{ id: string }>();
  if (!home) return jsonError(context, 404, "Home not found.");

  const billResult = await context.env.DB.prepare(
    "SELECT id, home_id, title, total_cents, created_at FROM bills WHERE home_id = ? ORDER BY created_at ASC, rowid ASC",
  ).bind(homeId).all<BillRecord>();

  const result = [];
  for (const bill of billResult.results) {
    const shareResult = await context.env.DB.prepare(
      "SELECT id, member_id, amount_cents, paid_at FROM shares WHERE bill_id = ? ORDER BY rowid ASC",
    ).bind(bill.id).all<ShareRecord>();

    result.push({
      id: bill.id,
      homeId: bill.home_id,
      title: bill.title,
      totalCents: bill.total_cents,
      shares: shareResult.results.map((share) => ({
        id: share.id,
        memberId: share.member_id,
        amountCents: share.amount_cents,
        paidAt: share.paid_at,
      })),
    });
  }

  return context.json({ bills: result });
});

bills.get("/homes/:homeId/balances", async (context) => {
  const homeId = context.req.param("homeId");
  const home = await context.env.DB.prepare("SELECT id FROM homes WHERE id = ?")
    .bind(homeId).first<{ id: string }>();
  if (!home) return jsonError(context, 404, "Home not found.");

  const result = await context.env.DB.prepare(
    `SELECT m.id AS member_id, m.name AS name,
      COALESCE(SUM(CASE WHEN s.paid_at IS NULL AND b.id IS NOT NULL THEN s.amount_cents ELSE 0 END), 0) AS outstanding_cents
     FROM members m
     LEFT JOIN shares s ON s.member_id = m.id
     LEFT JOIN bills b ON b.id = s.bill_id AND b.home_id = m.home_id
     WHERE m.home_id = ?
     GROUP BY m.id, m.name
     ORDER BY m.rowid ASC`,
  ).bind(homeId).all<{ member_id: string; name: string; outstanding_cents: number }>();

  return context.json({
    balances: result.results.map((row) => ({
      memberId: row.member_id,
      name: row.name,
      outstandingCents: row.outstanding_cents,
    })),
  });
});

export default bills;
