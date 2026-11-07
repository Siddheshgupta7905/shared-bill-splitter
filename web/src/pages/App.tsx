import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../lib/api";
import type { Balance, Bill, Home } from "../types";

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}

function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function App() {
  const [homeId, setHomeId] = useState(() => new URLSearchParams(window.location.search).get("homeId") ?? "");
  const [home, setHome] = useState<Home | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyShares, setBusyShares] = useState<Set<string>>(() => new Set());

  const [homeName, setHomeName] = useState("");
  const [memberName, setMemberName] = useState("");
  const [billTitle, setBillTitle] = useState("");
  const [billAmount, setBillAmount] = useState("");

  const loadHome = useCallback(async (id: string) => {
    if (!id.trim()) {
      setError("Enter a home ID to load its bills.");
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const [loadedHome, billData, balanceData] = await Promise.all([
        api.getHome(id),
        api.getBills(id),
        api.getBalances(id)
      ]);
      setHome(loadedHome);
      setBills(billData.bills);
      setBalances(balanceData.balances);
      const url = new URL(window.location.href);
      url.searchParams.set("homeId", id);
      window.history.replaceState({}, "", url);
    } catch (caught) {
      setHome(null);
      setBills([]);
      setBalances([]);
      setError(caught instanceof Error ? caught.message : "Unable to load this home.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialId = new URLSearchParams(window.location.search).get("homeId");
    if (initialId) void loadHome(initialId);
  }, [loadHome]);

  const refresh = useCallback(async () => {
    if (!homeId.trim()) return;
    const [billData, balanceData] = await Promise.all([
      api.getBills(homeId),
      api.getBalances(homeId)
    ]);
    setBills(billData.bills);
    setBalances(balanceData.balances);
  }, [homeId]);

  const outstandingTotal = useMemo(
    () => balances.reduce((total, balance) => total + balance.outstandingCents, 0),
    [balances]
  );

  async function handleCreateHome(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const created = await api.createHome(homeName);
      setHomeName("");
      setHomeId(created.id);
      setNotice(`Home created. Its ID is ${created.id}.`);
      await loadHome(created.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create home.");
    }
  }

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!home) return;
    setError(null);
    try {
      await api.addMember(home.id, memberName);
      setMemberName("");
      await refresh();
      setNotice("Member added.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add member.");
    }
  }

  async function handleCreateBill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!home) return;
    const amount = Number(billAmount);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setError("Enter a positive whole number of cents.");
      return;
    }
    setError(null);
    try {
      await api.createBill(home.id, billTitle, amount);
      setBillTitle("");
      setBillAmount("");
      await refresh();
      setNotice("Bill created and split between the current members.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create bill.");
    }
  }

  async function handlePay(billId: string, shareId: string) {
    setBusyShares((current) => new Set(current).add(shareId));
    setError(null);
    setNotice(null);
    try {
      await api.payShare(billId, shareId, newIdempotencyKey());
      await refresh();
      setNotice("Payment recorded.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Payment failed. The share remains unpaid.");
      // Refresh only after a successful payment. On failure the displayed share
      // stays unpaid rather than optimistically changing its state.
    } finally {
      setBusyShares((current) => {
        const next = new Set(current);
        next.delete(shareId);
        return next;
      });
    }
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="wordmark" href="/">SHARED / ACCOUNTS</a>
        <span className="topbar-note">Household bill tracking</span>
      </header>

      <section className="intro">
        <p className="eyebrow">HOUSEHOLD FINANCES</p>
        <h1>Shared bills,<br />kept in order.</h1>
        <p className="intro-copy">Create a home, add its members, and keep every shared expense accounted for.</p>
      </section>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {notice && <div className="alert alert-success" role="status">{notice}</div>}

      <section className="workspace">
        <div className="panel home-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">WORKSPACE</p>
              <h2>Choose a home</h2>
            </div>
            {loading && <span className="status-text">Loading</span>}
          </div>
          <form className="inline-form" onSubmit={(event) => { event.preventDefault(); void loadHome(homeId); }}>
            <label className="sr-only" htmlFor="home-id">Home ID</label>
            <input id="home-id" value={homeId} onChange={(event) => setHomeId(event.target.value)} placeholder="Paste a home ID" />
            <button type="submit" disabled={loading || !homeId.trim()}>Load home</button>
          </form>
          {home && <p className="home-caption">Currently viewing <strong>{home.name}</strong></p>}
          <details className="create-home">
            <summary>Create a new home</summary>
            <form className="stack-form" onSubmit={handleCreateHome}>
              <label htmlFor="home-name">Home name</label>
              <input id="home-name" value={homeName} onChange={(event) => setHomeName(event.target.value)} maxLength={120} required placeholder="e.g. Cedar House" />
              <button type="submit">Create home</button>
            </form>
          </details>
        </div>

        {home && (
          <>
            <section className="summary-grid" aria-label="Home summary">
              <div className="summary-card">
                <span className="summary-label">UNPAID BALANCE</span>
                <strong>{formatMoney(outstandingTotal)}</strong>
                <span className="summary-footnote">Across all recorded bills</span>
              </div>
              <div className="summary-card">
                <span className="summary-label">BILLS RECORDED</span>
                <strong>{bills.length}</strong>
                <span className="summary-footnote">For {home.name}</span>
              </div>
              <div className="summary-card">
                <span className="summary-label">MEMBERS</span>
                <strong>{balances.length}</strong>
                <span className="summary-footnote">Listed in join order</span>
              </div>
            </section>

            <div className="management-grid">
              <section className="panel">
                <p className="eyebrow">HOME MEMBERS</p>
                <h2>Add a member</h2>
                <form className="stack-form" onSubmit={handleAddMember}>
                  <label htmlFor="member-name">Member name</label>
                  <input id="member-name" value={memberName} onChange={(event) => setMemberName(event.target.value)} maxLength={80} required placeholder="Full name" />
                  <button type="submit">Add member</button>
                </form>
                <div className="member-list">
                  {balances.length === 0 ? <p className="muted">No members yet. Add the first member to get started.</p> :
                    balances.map((member, index) => (
                      <div className="member-row" key={member.memberId}>
                        <span className="member-index">{String(index + 1).padStart(2, "0")}</span>
                        <strong>{member.name}</strong>
                        <span className="member-balance">{formatMoney(member.outstandingCents)}</span>
                      </div>
                    ))}
                </div>
              </section>

              <section className="panel">
                <p className="eyebrow">NEW EXPENSE</p>
                <h2>Record a bill</h2>
                <form className="stack-form" onSubmit={handleCreateBill}>
                  <label htmlFor="bill-title">Bill title</label>
                  <input id="bill-title" value={billTitle} onChange={(event) => setBillTitle(event.target.value)} maxLength={160} required placeholder="e.g. Weekly groceries" />
                  <label htmlFor="bill-amount">Total amount in cents</label>
                  <input id="bill-amount" type="number" min="1" step="1" value={billAmount} onChange={(event) => setBillAmount(event.target.value)} required placeholder="e.g. 12500" />
                  <p className="field-hint">Enter whole cents. 12500 means $125.00.</p>
                  <button type="submit">Create and split bill</button>
                </form>
              </section>
            </div>

            <section className="bills-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">LEDGER</p>
                  <h2>Recent bills</h2>
                </div>
                <button className="button-secondary" type="button" onClick={() => void loadHome(home.id)} disabled={loading}>Refresh</button>
              </div>
              {loading ? <div className="empty-state">Loading bills…</div> :
                bills.length === 0 ? <div className="empty-state"><strong>No bills yet</strong><span>Once a bill is recorded, its split and payment status will appear here.</span></div> :
                <div className="bill-list">
                  {bills.map((bill) => {
                    const paid = bill.shares.filter((share) => share.paidAt !== null).reduce((sum, share) => sum + share.amountCents, 0);
                    return (
                      <article className="bill-card" key={bill.id}>
                        <div className="bill-header">
                          <div>
                            <h3>{bill.title}</h3>
                            <p>{bill.shares.length} member shares</p>
                          </div>
                          <div className="bill-total">
                            <strong>{formatMoney(bill.totalCents)}</strong>
                            <span>{formatMoney(bill.totalCents - paid)} outstanding</span>
                          </div>
                        </div>
                        <div className="share-table">
                          <div className="share-table-head"><span>MEMBER</span><span>SHARE</span><span>STATUS</span><span></span></div>
                          {bill.shares.map((share) => {
                            const member = balances.find((item) => item.memberId === share.memberId);
                            const isPaid = share.paidAt !== null;
                            const busy = busyShares.has(share.id);
                            return (
                              <div className="share-row" key={share.id}>
                                <strong>{member?.name ?? "Former member"}</strong>
                                <span>{formatMoney(share.amountCents)}</span>
                                <span className={isPaid ? "paid-label" : "unpaid-label"}>{isPaid ? "Paid" : "Unpaid"}</span>
                                {isPaid ? <span className="paid-date">{share.paidAt ? new Date(share.paidAt).toLocaleDateString() : ""}</span> :
                                  <button className="pay-button" type="button" onClick={() => void handlePay(bill.id, share.id)} disabled={busy}>{busy ? "Saving…" : "Mark paid"}</button>}
                              </div>
                            );
                          })}
                        </div>
                      </article>
                    );
                  })}
                </div>
              }
            </section>
          </>
        )}
      </section>
      <footer className="footer"><span>SHARED / ACCOUNTS</span><span>Amounts are stored in whole cents.</span></footer>
    </main>
  );
}
