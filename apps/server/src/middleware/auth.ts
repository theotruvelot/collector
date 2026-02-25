import { auth } from "@collector/auth";
import { createMiddleware } from "hono/factory";

export type AuthUser = {
	id: string;
	name: string;
	email: string;
	role: string;
};

export type AuthEnv = {
	Variables: {
		user: AuthUser;
	};
};

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	});

	if (!session?.user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	c.set("user", session.user as AuthUser);
	return next();
});

export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	});

	if (!session?.user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if ((session.user as AuthUser).role !== "admin") {
		return c.json({ error: "Forbidden" }, 403);
	}

	c.set("user", session.user as AuthUser);
	return next();
});
