import { Hono } from "hono";
import { jsonError } from "../lib/http";
import type { Bindings, ShareRecord } from "../types";

const payments = new Hono<{ Bindings: Bindings }>();

payments.post("/bills/:billId/shares/:shareId/pay", async (context) => {
  const billId = context.req.param("billId");
  const shareId = context.req.param("shareId");
  const idempotencyKey = context.req.header("Idempotency-Key")?.trim();

  if (!idempotencyKey) return jsonError(context, 400, "Idempotency-Key header is required.");
  if (idempotencyKey.length > 200) return jsonError(context, 400, "Idempotency-Key must be at most 200 characters.");

  const share = await context.env.DB.prepare(
    `SELECT s.id, s.bill_id, s.member_id, s.amount_cents, s.paid_at, s.idempotency_key
     FROM shares s
     WHERE s.id = ? AND s.bill_id = ?`,
  ).bind(shareId, billId).first<ShareRecord>();

  if (!share) return jsonError(context, 404, "Bill or share not found.");

  if (share.paid_at !== null) {
    if (share.idempotency_key === idempotencyKey) {
      return context.json({
        id: share.id,
        memberId: share.member_id,
        amountCents: share.amount_cents,
        paidAt: share.paid_at,
      });
    }
    return jsonError(context, 409, "Share has already been paid.");
  }

  const paidAt = new Date().toISOString();
  const update = await context.env.DB.prepare(
    `UPDATE shares
     SET paid_at = ?, idempotency_key = ?
     WHERE id = ? AND bill_id = ? AND paid_at IS NULL`,
  ).bind(paidAt, idempotencyKey, shareId, billId).run();

  if (update.meta.changes === 1) {
    return context.json({
      id: share.id,
      memberId: share.member_id,
      amountCents: share.amount_cents,
      paidAt,
    });
  }

  // Another request may have won the conditional update. Re-read to make
  // retries with the winning key idempotent and reject all other keys.
  const latest = await context.env.DB.prepare(
    `SELECT id, member_id, amount_cents, paid_at, idempotency_key
     FROM shares WHERE id = ? AND bill_id = ?`,
  ).bind(shareId, billId).first<ShareRecord>();

  if (!latest) return jsonError(context, 404, "Bill or share not found.");
  if (latest.paid_at !== null && latest.idempotency_key === idempotencyKey) {
    return context.json({
      id: latest.id,
      memberId: latest.member_id,
      amountCents: latest.amount_cents,
      paidAt: latest.paid_at,
    });
  }
  return jsonError(context, 409, "Share has already been paid.");
});

export default payments;
