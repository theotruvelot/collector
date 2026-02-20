import { db } from "@collector/db";
import { category } from "@collector/db/schema/marketplace";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { requireAdmin } from "../middleware/auth";

const categorySchema = z.object({
	name: z.string().min(1).max(100),
	slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
	description: z.string().max(500).optional(),
});

const app = new Hono()
	.get("/", async (c) => {
		const categories = await db.select().from(category).all();
		return c.json(categories);
	})

	.post("/", requireAdmin, async (c) => {
		const body = await c.req.json();
		const parsed = categorySchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: parsed.error.flatten() }, 400);
		}

		const existing = await db
			.select()
			.from(category)
			.where(eq(category.slug, parsed.data.slug))
			.get();
		if (existing) {
			return c.json({ error: "Category slug already exists" }, 409);
		}

		const created = await db
			.insert(category)
			.values(parsed.data)
			.returning()
			.get();
		return c.json(created, 201);
	})

	.put("/:id", requireAdmin, async (c) => {
		const id = c.req.param("id");
		const body = await c.req.json();
		const parsed = categorySchema.partial().safeParse(body);
		if (!parsed.success) {
			return c.json({ error: parsed.error.flatten() }, 400);
		}

		const updated = await db
			.update(category)
			.set(parsed.data)
			.where(eq(category.id, id))
			.returning()
			.get();
		if (!updated) {
			return c.json({ error: "Category not found" }, 404);
		}
		return c.json(updated);
	})

	.delete("/:id", requireAdmin, async (c) => {
		const id = c.req.param("id");
		const deleted = await db
			.delete(category)
			.where(eq(category.id, id))
			.returning()
			.get();
		if (!deleted) {
			return c.json({ error: "Category not found" }, 404);
		}
		return c.json({ success: true });
	});

export default app;
