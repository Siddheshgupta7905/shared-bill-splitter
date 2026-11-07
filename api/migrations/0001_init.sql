PRAGMA foreign_keys = ON;

CREATE TABLE homes (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CONSTRAINT homes_name_length CHECK (length(trim(name)) BETWEEN 1 AND 120)
);

CREATE TABLE members (
  id TEXT PRIMARY KEY NOT NULL,
  home_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CONSTRAINT members_home_fk FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE,
  CONSTRAINT members_name_length CHECK (length(trim(name)) BETWEEN 1 AND 80)
);

CREATE INDEX members_home_idx ON members(home_id);

CREATE TABLE bills (
  id TEXT PRIMARY KEY NOT NULL,
  home_id TEXT NOT NULL,
  title TEXT NOT NULL,
  total_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CONSTRAINT bills_home_fk FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE,
  CONSTRAINT bills_title_length CHECK (length(trim(title)) BETWEEN 1 AND 160),
  CONSTRAINT bills_positive_total CHECK (total_cents > 0)
);

CREATE TABLE shares (
  id TEXT PRIMARY KEY NOT NULL,
  bill_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  paid_at TEXT,
  idempotency_key TEXT,
  CONSTRAINT shares_bill_fk FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
  CONSTRAINT shares_member_fk FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  CONSTRAINT shares_nonnegative_amount CHECK (amount_cents >= 0),
  CONSTRAINT shares_one_per_member UNIQUE (bill_id, member_id),
  CONSTRAINT shares_payment_pair CHECK (
    (paid_at IS NULL AND idempotency_key IS NULL) OR
    (paid_at IS NOT NULL AND idempotency_key IS NOT NULL)
  )
);

CREATE INDEX bills_home_created_idx ON bills(home_id, created_at);
CREATE INDEX shares_bill_idx ON shares(bill_id);
CREATE INDEX shares_member_paid_idx ON shares(member_id, paid_at);
