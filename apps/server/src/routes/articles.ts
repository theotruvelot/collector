import { db } from "@collector/db";
import { user } from "@collector/db/schema/auth";
import {
	article,
	articleImage,
	category,
	notification,
	priceHistory,
} from "@collector/db/schema/marketplace";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { and, desc, eq, like, sql } from "drizzle-orm";
import { requireAdmin, requireAuth } from "../middleware/auth";
import type { AuthEnv } from "../middleware/auth";
import { slugify } from "../utils/slugify";

// ────────────────────────────── Schemas ──────────────────────────────

const ArticleImageSchema = z.object({
	id: z.string(),
	articleId: z.string(),
	url: z.url(),
	order: z.number(),
});

const ArticleSchema = z
	.object({
		id: z.string().openapi({ example: "art_01" }),
		title: z.string().openapi({ example: "Carte Pokémon Pikachu holographique" }),
		slug: z.string().openapi({ example: "carte-pikachu-holographique-1700000000000" }),
		description: z.string().openapi({ example: "Carte en parfait état, jamais jouée." }),
		price: z.number().openapi({ example: 49.99 }),
		shippingCost: z.number().openapi({ example: 5.0 }),
		categoryId: z.string().openapi({ example: "cat_01" }),
		sellerId: z.string().openapi({ example: "user_01" }),
		status: z.string().openapi({ example: "approved" }),
		createdAt: z.string().nullable(),
	})
	.openapi("Article");

const ArticleWithImagesSchema = ArticleSchema.extend({
	images: z.array(ArticleImageSchema),
}).openapi("ArticleWithImages");

const CreateArticleSchema = z.object({
	title: z.string().min(1).max(200).openapi({ example: "Carte Pokémon Pikachu" }),
	description: z.string().min(1).max(5000).openapi({ example: "Parfait état." }),
	price: z.number().positive().openapi({ example: 49.99 }),
	shippingCost: z.number().min(0).default(0).openapi({ example: 5.0 }),
	categoryId: z.string().min(1).openapi({ example: "cat_01" }),
	images: z.array(z.string().url()).min(1).max(10).openapi({ example: ["https://example.com/img.jpg"] }),
});

const UpdateArticleSchema = z.object({
	title: z.string().min(1).max(200).optional().openapi({ example: "Nouveau titre" }),
	description: z.string().min(1).max(5000).optional(),
	price: z.number().positive().optional().openapi({ example: 59.99 }),
	shippingCost: z.number().min(0).optional(),
	categoryId: z.string().min(1).optional(),
	images: z.array(z.string().url()).min(1).max(10).optional(),
});

const ErrorSchema = z.object({ error: z.string() }).openapi("Error");

const SlugParamSchema = z.object({
	slug: z.string().openapi({ param: { name: "slug", in: "path" }, example: "carte-pikachu-1700000000000" }),
});

const IdParamSchema = z.object({
	id: z.string().openapi({ param: { name: "id", in: "path" }, example: "art_01" }),
});

// ────────────────────────────── App ──────────────────────────────

const app = new OpenAPIHono<AuthEnv>();

// ─── Public: list articles ─────────────────────────────────────────

const listArticlesRoute = createRoute({
	method: "get",
	path: "/",
	tags: ["Articles"],
	summary: "Lister les articles approuvés",
	request: {
		query: z.object({
			category: z.string().optional().openapi({ example: "figurines" }),
			page: z.string().optional().openapi({ example: "1" }),
			limit: z.string().optional().openapi({ example: "20" }),
			search: z.string().optional().openapi({ example: "pikachu" }),
		}),
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.object({
						articles: z.array(ArticleWithImagesSchema),
						page: z.number(),
						limit: z.number(),
					}),
				},
			},
			description: "Liste paginée d'articles",
		},
	},
});

app.openapi(listArticlesRoute, async (c) => {
	const categorySlug = c.req.valid("query").category;
	const page = Number.parseInt(c.req.valid("query").page || "1");
	const limit = Math.min(Number.parseInt(c.req.valid("query").limit || "20"), 50);
	const offset = (page - 1) * limit;
	const search = c.req.valid("query").search;

	const conditions = [eq(article.status, "approved")];
	if (search) conditions.push(like(article.title, `%${search}%`));

	if (categorySlug) {
		const cat = await db.select().from(category).where(eq(category.slug, categorySlug)).get();
		if (cat) conditions.push(eq(article.categoryId, cat.id));
	}

	const results = await db
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
			.where(sql`${articleImage.articleId} IN (${sql.join(results.map((r) => sql`${r.id}`), sql`,`)})`)
			.all()
		: [];

	const articlesWithImages = results.map((a) => ({
		...a,
		status: "approved",
		description: "",
		images: images.filter((img) => img.articleId === a.id).sort((x, y) => x.order - y.order),
	}));

	return c.json({ articles: articlesWithImages as any, page, limit });
});

// ─── Seller: my articles ───────────────────────────────────────────

const myArticlesRoute = createRoute({
	method: "get",
	path: "/seller/my-articles",
	tags: ["Articles"],
	summary: "Mes articles (vendeur connecté)",
	security: [{ bearerAuth: [] }],
	responses: {
		200: {
			content: { "application/json": { schema: z.array(ArticleWithImagesSchema) } },
			description: "Mes articles",
		},
	},
});

app.use("/seller/my-articles", requireAuth as any);
app.openapi(myArticlesRoute, async (c) => {
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
			.where(sql`${articleImage.articleId} IN (${sql.join(articles.map((r) => sql`${r.id}`), sql`,`)})`)
			.all()
		: [];

	return c.json(
		articles.map((a) => ({
			...a,
			images: images.filter((img) => img.articleId === a.id).sort((x, y) => x.order - y.order),
		})) as any,
	);
});

// ─── Admin: pending articles ───────────────────────────────────────

const pendingRoute = createRoute({
	method: "get",
	path: "/admin/pending",
	tags: ["Articles - Admin"],
	summary: "Articles en attente de modération (admin)",
	security: [{ bearerAuth: [] }],
	responses: {
		200: {
			content: { "application/json": { schema: z.array(ArticleSchema) } },
			description: "Articles en attente",
		},
	},
});

app.use("/admin/pending", requireAdmin as any);
app.openapi(pendingRoute, async (c) => {
	const pending = await db
		.select()
		.from(article)
		.where(eq(article.status, "pending"))
		.orderBy(article.createdAt)
		.all();
	return c.json(pending as any);
});

// ─── Admin: moderate ──────────────────────────────────────────────

const moderateRoute = createRoute({
	method: "put",
	path: "/admin/{id}/moderate",
	tags: ["Articles - Admin"],
	summary: "Modérer un article (approuver / rejeter)",
	security: [{ bearerAuth: [] }],
	request: {
		params: IdParamSchema,
		body: {
			content: {
				"application/json": {
					schema: z.object({
						status: z.enum(["approved", "rejected"]).openapi({ example: "approved" }),
						reason: z.string().optional().openapi({ example: "Contenu inapproprié" }),
					}),
				},
			},
		},
	},
	responses: {
		200: { content: { "application/json": { schema: ArticleSchema } }, description: "Article modéré" },
		404: { content: { "application/json": { schema: ErrorSchema } }, description: "Non trouvé" },
	},
});

app.use("/admin/:id/moderate", requireAdmin as any);
app.openapi(moderateRoute, async (c) => {
	const { id } = c.req.valid("param");
	const { status, reason } = c.req.valid("json");

	const existing = await db.select().from(article).where(eq(article.id, id)).get();
	if (!existing) return c.json({ error: "Article not found" }, 404);

	const updated = await db.update(article).set({ status }).where(eq(article.id, id)).returning().get();

	await db.insert(notification).values({
		userId: existing.sellerId,
		type: "moderation",
		title: status === "approved" ? "Article approved" : "Article rejected",
		message:
			status === "approved"
				? `Your article "${existing.title}" has been approved and is now live.`
				: `Your article "${existing.title}" was rejected. ${reason || ""}`,
		articleId: id,
	});

	return c.json(updated as any);
});

// ─── Admin: delete ────────────────────────────────────────────────

const adminDeleteRoute = createRoute({
	method: "delete",
	path: "/admin/{id}",
	tags: ["Articles - Admin"],
	summary: "Supprimer un article (admin)",
	security: [{ bearerAuth: [] }],
	request: { params: IdParamSchema },
	responses: {
		200: { content: { "application/json": { schema: z.object({ success: z.boolean() }) } }, description: "Supprimé" },
		404: { content: { "application/json": { schema: ErrorSchema } }, description: "Non trouvé" },
	},
});

app.use("/admin/:id", requireAdmin as any);
app.openapi(adminDeleteRoute, async (c) => {
	const { id } = c.req.valid("param");

	const existing = await db.select().from(article).where(eq(article.id, id)).get();
	if (!existing) return c.json({ error: "Article not found" }, 404) as any;

	await db.insert(notification).values({
		userId: existing.sellerId,
		type: "moderation",
		title: "Article removed",
		message: `Your article "${existing.title}" was removed for violating platform guidelines.`,
		articleId: id,
	});

	await db.delete(article).where(eq(article.id, id)).run();
	return c.json({ success: true as const }, 200);
});

// ─── Public: single article by slug ──────────────────────────────

const getBySlugRoute = createRoute({
	method: "get",
	path: "/{slug}",
	tags: ["Articles"],
	summary: "Obtenir un article par son slug",
	request: { params: SlugParamSchema },
	responses: {
		200: {
			content: { "application/json": { schema: ArticleWithImagesSchema } },
			description: "Article trouvé",
		},
		404: { content: { "application/json": { schema: ErrorSchema } }, description: "Non trouvé" },
	},
});

app.openapi(getBySlugRoute, async (c) => {
	const { slug } = c.req.valid("param");

	const found = await db
		.select()
		.from(article)
		.where(and(eq(article.slug, slug), eq(article.status, "approved")))
		.get();

	if (!found) return c.json({ error: "Article not found" }, 404);

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

	const cat = await db.select().from(category).where(eq(category.id, found.categoryId)).get();

	return c.json({ ...found, images, seller, category: cat } as any);
});

// ─── Seller: create article ────────────────────────────────────────

const createArticleRoute = createRoute({
	method: "post",
	path: "/",
	tags: ["Articles"],
	summary: "Créer un article (vendeur)",
	security: [{ bearerAuth: [] }],
	request: {
		body: { content: { "application/json": { schema: CreateArticleSchema } } },
	},
	responses: {
		201: { content: { "application/json": { schema: ArticleSchema } }, description: "Article créé (en attente)" },
		404: { content: { "application/json": { schema: ErrorSchema } }, description: "Catégorie non trouvée" },
	},
});

app.use("/", requireAuth as any);
app.openapi(createArticleRoute, async (c) => {
	const userId = c.get("user").id;
	const data = c.req.valid("json");

	const cat = await db.select().from(category).where(eq(category.id, data.categoryId)).get();
	if (!cat) return c.json({ error: "Category not found" }, 404);

	const slug = `${slugify(data.title)}-${Date.now()}`;

	const created = await db
		.insert(article)
		.values({
			title: data.title,
			slug,
			description: data.description,
			price: data.price,
			shippingCost: data.shippingCost,
			categoryId: data.categoryId,
			sellerId: userId,
			status: "pending",
		})
		.returning()
		.get();

	if (data.images.length > 0) {
		await db.insert(articleImage).values(data.images.map((url, i) => ({ articleId: created.id, url, order: i })));
	}

	return c.json(created as any, 201);
});

// ─── Seller: update article ────────────────────────────────────────

const updateArticleRoute = createRoute({
	method: "put",
	path: "/{id}",
	tags: ["Articles"],
	summary: "Modifier un article (vendeur propriétaire)",
	security: [{ bearerAuth: [] }],
	request: {
		params: IdParamSchema,
		body: { content: { "application/json": { schema: UpdateArticleSchema } } },
	},
	responses: {
		200: { content: { "application/json": { schema: ArticleSchema } }, description: "Article mis à jour" },
		404: { content: { "application/json": { schema: ErrorSchema } }, description: "Non trouvé" },
	},
});

app.use("/:id", requireAuth as any);
app.openapi(updateArticleRoute, async (c) => {
	const userId = c.get("user").id;
	const { id } = c.req.valid("param");
	const data = c.req.valid("json");

	const existing = await db
		.select()
		.from(article)
		.where(and(eq(article.id, id), eq(article.sellerId, userId)))
		.get();
	if (!existing) return c.json({ error: "Article not found" }, 404);

	if (data.price && data.price !== existing.price) {
		await db.insert(priceHistory).values({ articleId: id, oldPrice: existing.price, newPrice: data.price });
		await db.insert(notification).values({
			userId: existing.sellerId,
			type: "price_change",
			title: "Price updated",
			message: `Price of "${existing.title}" changed from ${existing.price}€ to ${data.price}€`,
			articleId: id,
		});
	}

	const { images, ...updateData } = data;

	const updated = await db.update(article).set(updateData).where(eq(article.id, id)).returning().get();

	if (images) {
		await db.delete(articleImage).where(eq(articleImage.articleId, id)).run();
		await db.insert(articleImage).values(images.map((url, i) => ({ articleId: id, url, order: i })));
	}

	return c.json(updated as any);
});

// ─── Seller: delete article ────────────────────────────────────────

const deleteArticleRoute = createRoute({
	method: "delete",
	path: "/{id}",
	tags: ["Articles"],
	summary: "Supprimer son propre article (vendeur)",
	security: [{ bearerAuth: [] }],
	request: { params: IdParamSchema },
	responses: {
		200: { content: { "application/json": { schema: z.object({ success: z.boolean() }) } }, description: "Supprimé" },
		404: { content: { "application/json": { schema: ErrorSchema } }, description: "Non trouvé" },
	},
});

app.openapi(deleteArticleRoute, async (c) => {
	const userId = c.get("user").id;
	const { id } = c.req.valid("param");

	const deleted = await db
		.delete(article)
		.where(and(eq(article.id, id), eq(article.sellerId, userId)))
		.returning()
		.get();

	if (!deleted) return c.json({ error: "Article not found" }, 404) as any;
	return c.json({ success: true as const }, 200);
});

export default app;
