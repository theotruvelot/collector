import { db } from "@collector/db";
import { user } from "@collector/db/schema/auth";
import {
	article,
	articleImage,
	category,
	notification,
	priceHistory,
} from "@collector/db/schema/marketplace";
import { and, desc, eq, like, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { slugify } from "../utils/slugify";

const createArticleSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().min(1).max(5000),
	price: z.number().positive(),
	shippingCost: z.number().min(0).default(0),
	categoryId: z.string().min(1),
	images: z.array(z.string().url()).min(1).max(10),
});

const updateArticleSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().min(1).max(5000).optional(),
	price: z.number().positive().optional(),
	shippingCost: z.number().min(0).optional(),
	categoryId: z.string().min(1).optional(),
	images: z.array(z.string().url()).min(1).max(10).optional(),
});

const app = new Hono()
	// --- Public routes ---
	.get("/", async (c) => {
		const categorySlug = c.req.query("category");
		const page = Number.parseInt(c.req.query("page") || "1");
		const limit = Math.min(Number.parseInt(c.req.query("limit") || "20"), 50);
		const offset = (page - 1) * limit;
		const search = c.req.query("search");

		const conditions = [eq(article.status, "approved")];
		if (search) {
			conditions.push(like(article.title, `%${search}%`));
		}

		let results;
		if (categorySlug) {
			const cat = await db
				.select()
				.from(category)
				.where(eq(category.slug, categorySlug))
				.get();
			if (cat) {
				conditions.push(eq(article.categoryId, cat.id));
			}
		}

		results = await db
			.select({
				id: article.id,
				title: article.title,
				slug: article.slug,
				price: article.price,
				shippingCost: article.shippingCost,
				categoryId: article.categoryId,
				sellerId: article.sellerId,
				createdAt: article.createdAt,
			})
			.from(article)
			.where(and(...conditions))
			.orderBy(desc(article.createdAt))
			.limit(limit)
			.offset(offset)
			.all();

		const images = results.length
			? await db
				.select()
				.from(articleImage)
				.where(
					sql`${articleImage.articleId} IN (${sql.join(
						results.map((r) => sql`${r.id}`),
						sql`,`,
					)})`,
				)
				.all()
			: [];

		const articlesWithImages = results.map((a) => ({
			...a,
			images: images
				.filter((img) => img.articleId === a.id)
				.sort((x, y) => x.order - y.order),
		}));

		return c.json({ articles: articlesWithImages, page, limit });
	})

	// --- Seller routes ---
	.get("/seller/my-articles", requireAuth, async (c) => {
		const userId = c.get("user").id;

		const articles = await db
			.select()
			.from(article)
			.where(eq(article.sellerId, userId))
			.orderBy(desc(article.createdAt))
			.all();

		const images = articles.length
			? await db
				.select()
				.from(articleImage)
				.where(
					sql`${articleImage.articleId} IN (${sql.join(
						articles.map((r) => sql`${r.id}`),
						sql`,`,
					)})`,
				)
				.all()
			: [];

		return c.json(
			articles.map((a) => ({
				...a,
				images: images
					.filter((img) => img.articleId === a.id)
					.sort((x, y) => x.order - y.order),
			})),
		);
	})

	// --- Admin moderation ---
	.get("/admin/pending", requireAdmin, async (c) => {
		const pending = await db
			.select()
			.from(article)
			.where(eq(article.status, "pending"))
			.orderBy(article.createdAt)
			.all();
		return c.json(pending);
	})

	.put("/admin/:id/moderate", requireAdmin, async (c) => {
		const id = c.req.param("id");
		const body = await c.req.json();
		const schema = z.object({
			status: z.enum(["approved", "rejected"]),
			reason: z.string().optional(),
		});
		const parsed = schema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: parsed.error.flatten() }, 400);
		}

		const existing = await db
			.select()
			.from(article)
			.where(eq(article.id, id))
			.get();
		if (!existing) {
			return c.json({ error: "Article not found" }, 404);
		}

		const updated = await db
			.update(article)
			.set({ status: parsed.data.status })
			.where(eq(article.id, id))
			.returning()
			.get();

		await db.insert(notification).values({
			userId: existing.sellerId,
			type: "moderation",
			title:
				parsed.data.status === "approved"
					? "Article approved"
					: "Article rejected",
			message:
				parsed.data.status === "approved"
					? `Your article "${existing.title}" has been approved and is now live.`
					: `Your article "${existing.title}" was rejected. ${parsed.data.reason || ""}`,
			articleId: id,
		});

		return c.json(updated);
	})

	.delete("/admin/:id", requireAdmin, async (c) => {
		const id = c.req.param("id");
		const existing = await db
			.select()
			.from(article)
			.where(eq(article.id, id))
			.get();
		if (!existing) {
			return c.json({ error: "Article not found" }, 404);
		}

		await db.insert(notification).values({
			userId: existing.sellerId,
			type: "moderation",
			title: "Article removed",
			message: `Your article "${existing.title}" was removed for violating platform guidelines.`,
			articleId: id,
		});

		await db.delete(article).where(eq(article.id, id)).run();
		return c.json({ success: true });
	})

	// --- Public single article (keep last: /:slug catches everything) ---
	.get("/:slug", async (c) => {
		const slug = c.req.param("slug");

		const found = await db
			.select()
			.from(article)
			.where(and(eq(article.slug, slug), eq(article.status, "approved")))
			.get();

		if (!found) {
			return c.json({ error: "Article not found" }, 404);
		}

		const images = await db
			.select()
			.from(articleImage)
			.where(eq(articleImage.articleId, found.id))
			.orderBy(articleImage.order)
			.all();

		const seller = await db
			.select({ id: user.id, name: user.name })
			.from(user)
			.where(eq(user.id, found.sellerId))
			.get();

		const cat = await db
			.select()
			.from(category)
			.where(eq(category.id, found.categoryId))
			.get();

		return c.json({ ...found, images, seller, category: cat });
	})

	.post("/", requireAuth, async (c) => {
		const userId = c.get("user").id;
		const body = await c.req.json();
		const parsed = createArticleSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: parsed.error.flatten() }, 400);
		}

		const cat = await db
			.select()
			.from(category)
			.where(eq(category.id, parsed.data.categoryId))
			.get();
		if (!cat) {
			return c.json({ error: "Category not found" }, 404);
		}

		const slug = `${slugify(parsed.data.title)}-${Date.now()}`;

		const created = await db
			.insert(article)
			.values({
				title: parsed.data.title,
				slug,
				description: parsed.data.description,
				price: parsed.data.price,
				shippingCost: parsed.data.shippingCost,
				categoryId: parsed.data.categoryId,
				sellerId: userId,
				status: "pending",
			})
			.returning()
			.get();

		if (parsed.data.images.length > 0) {
			await db.insert(articleImage).values(
				parsed.data.images.map((url, i) => ({
					articleId: created.id,
					url,
					order: i,
				})),
			);
		}

		return c.json(created, 201);
	})

	.put("/:id", requireAuth, async (c) => {
		const userId = c.get("user").id;
		const id = c.req.param("id");
		const body = await c.req.json();
		const parsed = updateArticleSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: parsed.error.flatten() }, 400);
		}

		const existing = await db
			.select()
			.from(article)
			.where(and(eq(article.id, id), eq(article.sellerId, userId)))
			.get();
		if (!existing) {
			return c.json({ error: "Article not found" }, 404);
		}

		if (parsed.data.price && parsed.data.price !== existing.price) {
			await db.insert(priceHistory).values({
				articleId: id,
				oldPrice: existing.price,
				newPrice: parsed.data.price,
			});

			await db.insert(notification).values({
				userId: existing.sellerId,
				type: "price_change",
				title: "Price updated",
				message: `Price of "${existing.title}" changed from ${existing.price}€ to ${parsed.data.price}€`,
				articleId: id,
			});
		}

		const { images, ...updateData } = parsed.data;

		const updated = await db
			.update(article)
			.set(updateData)
			.where(eq(article.id, id))
			.returning()
			.get();

		if (images) {
			await db.delete(articleImage).where(eq(articleImage.articleId, id)).run();
			await db.insert(articleImage).values(
				images.map((url, i) => ({
					articleId: id,
					url,
					order: i,
				})),
			);
		}

		return c.json(updated);
	})

	.delete("/:id", requireAuth, async (c) => {
		const userId = c.get("user").id;
		const id = c.req.param("id");

		const deleted = await db
			.delete(article)
			.where(and(eq(article.id, id), eq(article.sellerId, userId)))
			.returning()
			.get();
		if (!deleted) {
			return c.json({ error: "Article not found" }, 404);
		}
		return c.json({ success: true });
	});

export default app;
