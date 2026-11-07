import type { ApiError, Balance, Bill, Home, Member } from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers
      }
    });
  } catch {
    throw new Error("Could not reach the server. Check that the API is running and try again.");
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof (payload as ApiError).error === "string"
        ? (payload as ApiError).error
        : `Request failed (${response.status}). Please try again.`;
    throw new Error(message);
  }

  return payload as T;
}

export const api = {
  createHome: (name: string) =>
    request<Home>("/api/homes", {
      method: "POST",
      body: JSON.stringify({ name })
    }),
  getHome: (homeId: string) => request<Home>(`/api/homes/${encodeURIComponent(homeId)}`),
  addMember: (homeId: string, name: string) =>
    request<Member>(`/api/homes/${encodeURIComponent(homeId)}/members`, {
      method: "POST",
      body: JSON.stringify({ name })
    }),
  createBill: (homeId: string, title: string, totalCents: number) =>
    request<Bill>(`/api/homes/${encodeURIComponent(homeId)}/bills`, {
      method: "POST",
      body: JSON.stringify({ title, totalCents })
    }),
  getBills: (homeId: string) =>
    request<{ bills: Bill[] }>(`/api/homes/${encodeURIComponent(homeId)}/bills`),
  getBalances: (homeId: string) =>
    request<{ balances: Balance[] }>(`/api/homes/${encodeURIComponent(homeId)}/balances`),
  payShare: (billId: string, shareId: string, key: string) =>
    request<{ id: string; memberId: string; amountCents: number; paidAt: string }>(
      `/api/bills/${encodeURIComponent(billId)}/shares/${encodeURIComponent(shareId)}/pay`,
      { method: "POST", headers: { "Idempotency-Key": key } }
    )
};
