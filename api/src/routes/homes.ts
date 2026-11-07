import { Hono } from "hono";
import { cleanString, jsonError, readJsonObject } from "../lib/http";
import { createId } from "../lib/ids";
import type { Bindings, HomeRecord } from "../types";

const homes = new Hono<{ Bindings: Bindings }>();

homes.post("/homes", async (context) => {
  const body = await readJsonObject(context.req.raw);
  const name = cleanString(body?.name, 120);
  if (!name) return jsonError(context, 422, "Home name must be a non-empty string of at most 120 characters.");

  const id = createId();
  await context.env.DB.prepare("INSERT INTO homes (id, name) VALUES (?, ?)")
    .bind(id, name)
    .run();

  return context.json({ id, name }, 201);
});

homes.get("/homes/:homeId", async (context) => {
  const home = await context.env.DB.prepare(
    "SELECT id, name FROM homes WHERE id = ?",
  ).bind(context.req.param("homeId")).first<HomeRecord>();

  if (!home) return jsonError(context, 404, "Home not found.");
  return context.json(home);
});

homes.post("/homes/:homeId/members", async (context) => {
  const homeId = context.req.param("homeId");
  const home = await context.env.DB.prepare("SELECT id FROM homes WHERE id = ?")
    .bind(homeId)
    .first<{ id: string }>();
  if (!home) return jsonError(context, 404, "Home not found.");

  const body = await readJsonObject(context.req.raw);
  const name = cleanString(body?.name, 80);
  if (!name) return jsonError(context, 422, "Member name must be a non-empty string of at most 80 characters.");

  const id = createId();
  await context.env.DB.prepare(
    "INSERT INTO members (id, home_id, name) VALUES (?, ?, ?)",
  ).bind(id, homeId, name).run();

  return context.json({ id, homeId, name }, 201);
});

export default homes;
