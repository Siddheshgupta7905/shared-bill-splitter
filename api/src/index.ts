import { Hono } from "hono";
import { cors } from "hono/cors";
import homes from "./routes/homes";
import bills from "./routes/bills";
import payments from "./routes/payments";
import type { Bindings } from "./types";

const app = new Hono<{ Bindings: Bindings }>();

app.use("/api/*", cors({
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Idempotency-Key"],
}));

app.get("/api/health", (context) => context.json({ status: "ok" }));
app.route("/api", homes);
app.route("/api", bills);
app.route("/api", payments);

app.notFound((context) => context.json({ error: "Not found." }, 404));
app.onError((error, context) => {
  console.error("Unhandled API error:", error);
  return context.json({ error: "Internal server error." }, 500);
});

export default app;
