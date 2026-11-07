import type { Context } from "hono";

export function jsonError(
  context: Context,
  status: 400 | 404 | 409 | 422 | 500,
  message: string,
) {
  return context.json({ error: message }, status);
}

export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (cleaned.length === 0 || cleaned.length > maxLength) return null;
  return cleaned;
}
