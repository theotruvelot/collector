import { auth } from "@collector/auth";
import { env } from "@collector/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import articles from "./routes/articles";
import categories from "./routes/categories";
import notifications from "./routes/notifications";
import orders from "./routes/orders";

const app = new Hono();

app.use(logger());
app.use(secureHeaders());
app.use(
	"/*",
	cors({
		origin: env.CORS_ORIGIN,
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.route("/api/categories", categories);
app.route("/api/articles", articles);
app.route("/api/orders", orders);
app.route("/api/notifications", notifications);

app.get("/", (c) => {
	return c.text("OK");
});

export default app;
