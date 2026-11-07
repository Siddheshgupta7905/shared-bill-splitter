export type Bindings = {
  DB: D1Database;
};

export type HomeRecord = {
  id: string;
  name: string;
};

export type MemberRecord = {
  id: string;
  home_id: string;
  name: string;
};

export type BillRecord = {
  id: string;
  home_id: string;
  title: string;
  total_cents: number;
  created_at: string;
};

export type ShareRecord = {
  id: string;
  bill_id: string;
  member_id: string;
  amount_cents: number;
  paid_at: string | null;
  idempotency_key: string | null;
};

export type ApiError = { error: string };
