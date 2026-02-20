import { db } from "@collector/db";
import { notification } from "@collector/db/schema/marketplace";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";

const app = new Hono()
	.use("/*", requireAuth)

	.get("/", async (c) => {
		const userId = c.get("user").id;

		const notifications = await db
			.select()
			.from(notification)
			.where(eq(notification.userId, userId))
			.orderBy(desc(notification.createdAt))
			.limit(50)
			.all();

		const unreadCount = notifications.filter((n) => !n.read).length;

		return c.json({ notifications, unreadCount });
	})

	.put("/:id/read", async (c) => {
		const userId = c.get("user").id;
		const id = c.req.param("id");

		const updated = await db
			.update(notification)
			.set({ read: true })
			.where(and(eq(notification.id, id), eq(notification.userId, userId)))
			.returning()
			.get();

		if (!updated) {
			return c.json({ error: "Notification not found" }, 404);
		}
		return c.json(updated);
	})

	.put("/read-all", async (c) => {
		const userId = c.get("user").id;

		await db
			.update(notification)
			.set({ read: true })
			.where(and(eq(notification.userId, userId), eq(notification.read, false)))
			.run();

		return c.json({ success: true });
	});

export default app;
