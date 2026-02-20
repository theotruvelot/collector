import { db } from "@collector/db";
import { article } from "@collector/db/schema/marketplace";
import { notification, order } from "@collector/db/schema/marketplace";
import { and, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { calculateCommission, calculateTotal } from "../utils/commission";

const app = new Hono()
	.use("/*", requireAuth)

	.post("/", async (c) => {
		const userId = c.get("user").id;
		const body = await c.req.json();
		const parsed = z.object({ articleId: z.string().min(1) }).safeParse(body);
		if (!parsed.success) {
			return c.json({ error: parsed.error.flatten() }, 400);
		}

		const art = await db
			.select()
			.from(article)
			.where(
				and(
					eq(article.id, parsed.data.articleId),
					eq(article.status, "approved"),
				),
			)
			.get();

		if (!art) {
			return c.json({ error: "Article not available" }, 404);
		}
		if (art.sellerId === userId) {
			return c.json({ error: "Cannot buy your own article" }, 400);
		}

		const amount = calculateTotal(art.price, art.shippingCost);
		const commission = calculateCommission(amount);

		const created = await db
			.insert(order)
			.values({
				articleId: art.id,
				buyerId: userId,
				sellerId: art.sellerId,
				amount,
				commission,
				status: "paid",
			})
			.returning()
			.get();

		await db
			.update(article)
			.set({ status: "sold" })
			.where(eq(article.id, art.id))
			.run();

		await db.insert(notification).values({
			userId: art.sellerId,
			type: "order_status",
			title: "New sale!",
			message: `Your article "${art.title}" has been sold for ${amount}€.`,
			articleId: art.id,
		});

		return c.json(created, 201);
	})

	.get("/", async (c) => {
		const userId = c.get("user").id;
		const type = c.req.query("type");

		const condition =
			type === "sales"
				? eq(order.sellerId, userId)
				: eq(order.buyerId, userId);

		const orders = await db
			.select()
			.from(order)
			.where(condition)
			.orderBy(desc(order.createdAt))
			.all();

		return c.json(orders);
	})

	.get("/:id", async (c) => {
		const userId = c.get("user").id;
		const id = c.req.param("id");

		const found = await db
			.select()
			.from(order)
			.where(
				and(
					eq(order.id, id),
					// User must be buyer or seller
					sql`(${order.buyerId} = ${userId} OR ${order.sellerId} = ${userId})`,
				),
			)
			.get();

		if (!found) {
			return c.json({ error: "Order not found" }, 404);
		}

		const art = await db
			.select()
			.from(article)
			.where(eq(article.id, found.articleId))
			.get();

		return c.json({ ...found, article: art });
	})

	.put("/:id/status", async (c) => {
		const userId = c.get("user").id;
		const id = c.req.param("id");
		const body = await c.req.json();
		const parsed = z
			.object({ status: z.enum(["shipped", "delivered", "cancelled"]) })
			.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: parsed.error.flatten() }, 400);
		}

		const existing = await db
			.select()
			.from(order)
			.where(eq(order.id, id))
			.get();
		if (!existing) {
			return c.json({ error: "Order not found" }, 404);
		}

		const isSeller = existing.sellerId === userId;
		const isBuyer = existing.buyerId === userId;

		if (parsed.data.status === "shipped" && !isSeller) {
			return c.json({ error: "Only the seller can mark as shipped" }, 403);
		}
		if (parsed.data.status === "delivered" && !isBuyer) {
			return c.json({ error: "Only the buyer can confirm delivery" }, 403);
		}

		const updated = await db
			.update(order)
			.set({ status: parsed.data.status })
			.where(eq(order.id, id))
			.returning()
			.get();

		const notifyUserId = isSeller ? existing.buyerId : existing.sellerId;
		await db.insert(notification).values({
			userId: notifyUserId,
			type: "order_status",
			title: `Order ${parsed.data.status}`,
			message: `Order #${id.slice(0, 8)} has been marked as ${parsed.data.status}.`,
			articleId: existing.articleId,
		});

		return c.json(updated);
	});

export default app;
