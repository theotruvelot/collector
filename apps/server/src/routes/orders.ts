import { db } from "@collector/db";
import { article, notification, order } from "@collector/db/schema/marketplace";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import type { AuthEnv } from "../middleware/auth";
import { calculateCommission, calculateTotal } from "../utils/commission";

const OrderSchema = z
	.object({
		id: z.string().openapi({ example: "order_01" }),
		articleId: z.string().openapi({ example: "art_01" }),
		buyerId: z.string().openapi({ example: "user_01" }),
		sellerId: z.string().openapi({ example: "user_02" }),
		amount: z.number().openapi({ example: 49.99 }),
		commission: z.number().openapi({ example: 5.0 }),
		status: z.string().openapi({ example: "paid" }),
		createdAt: z.string().nullable().openapi({ example: "2024-01-01T00:00:00.000Z" }),
	})
	.openapi("Order");

const ErrorSchema = z.object({ error: z.string() }).openapi("Error");

const IdParamSchema = z.object({
	id: z.string().openapi({ param: { name: "id", in: "path" }, example: "order_01" }),
});

const app = new OpenAPIHono<AuthEnv>();
app.use("/*", requireAuth as any);

// POST /
const createOrderRoute = createRoute({
	method: "post",
	path: "/",
	tags: ["Orders"],
	summary: "Passer une commande",
	security: [{ bearerAuth: [] }],
	request: {
		body: {
			content: {
				"application/json": {
					schema: z.object({ articleId: z.string().min(1).openapi({ example: "art_01" }) }),
				},
			},
		},
	},
	responses: {
		201: {
			content: { "application/json": { schema: OrderSchema } },
			description: "Commande créée",
		},
		400: { content: { "application/json": { schema: ErrorSchema } }, description: "Requête invalide" },
		404: { content: { "application/json": { schema: ErrorSchema } }, description: "Article non trouvé" },
	},
});

app.openapi(createOrderRoute, async (c) => {
	const userId = c.get("user").id;
	const { articleId } = c.req.valid("json");

	const art = await db
		.select()
		.from(article)
		.where(and(eq(article.id, articleId), eq(article.status, "approved")))
		.get();

	if (!art) return c.json({ error: "Article not available" }, 404);
	if (art.sellerId === userId) return c.json({ error: "Cannot buy your own article" }, 400);

	const amount = calculateTotal(art.price, art.shippingCost);
	const commission = calculateCommission(amount);

	const created = await db
		.insert(order)
		.values({ articleId: art.id, buyerId: userId, sellerId: art.sellerId, amount, commission, status: "paid" })
		.returning()
		.get();

	await db.update(article).set({ status: "sold" }).where(eq(article.id, art.id)).run();

	await db.insert(notification).values({
		userId: art.sellerId,
		type: "order_status",
		title: "New sale!",
		message: `Your article "${art.title}" has been sold for ${amount}€.`,
		articleId: art.id,
	});

	return c.json(created as any, 201);
});

// GET /
const listOrdersRoute = createRoute({
	method: "get",
	path: "/",
	tags: ["Orders"],
	summary: "Lister mes commandes / ventes",
	security: [{ bearerAuth: [] }],
	request: {
		query: z.object({
			type: z.enum(["purchases", "sales"]).optional().openapi({ example: "purchases" }),
		}),
	},
	responses: {
		200: {
			content: { "application/json": { schema: z.array(OrderSchema) } },
			description: "Liste des commandes",
		},
	},
});

app.openapi(listOrdersRoute, async (c) => {
	const userId = c.get("user").id;
	const { type } = c.req.valid("query");

	const condition = type === "sales" ? eq(order.sellerId, userId) : eq(order.buyerId, userId);

	const orders = await db.select().from(order).where(condition).orderBy(desc(order.createdAt)).all();
	return c.json(orders as any);
});

// GET /:id
const getOrderRoute = createRoute({
	method: "get",
	path: "/:id",
	tags: ["Orders"],
	summary: "Détail d'une commande",
	security: [{ bearerAuth: [] }],
	request: { params: IdParamSchema },
	responses: {
		200: {
			content: { "application/json": { schema: OrderSchema } },
			description: "Commande trouvée",
		},
		404: { content: { "application/json": { schema: ErrorSchema } }, description: "Non trouvée" },
	},
});

app.openapi(getOrderRoute, async (c) => {
	const userId = c.get("user").id;
	const { id } = c.req.valid("param");

	const found = await db
		.select()
		.from(order)
		.where(and(eq(order.id, id), sql`(${order.buyerId} = ${userId} OR ${order.sellerId} = ${userId})`))
		.get();

	if (!found) return c.json({ error: "Order not found" }, 404);

	const art = await db.select().from(article).where(eq(article.id, found.articleId)).get();
	return c.json({ ...found, article: art } as any);
});

// PUT /:id/status
const updateStatusRoute = createRoute({
	method: "put",
	path: "/:id/status",
	tags: ["Orders"],
	summary: "Mettre à jour le statut d'une commande",
	security: [{ bearerAuth: [] }],
	request: {
		params: IdParamSchema,
		body: {
			content: {
				"application/json": {
					schema: z.object({
						status: z.enum(["shipped", "delivered", "cancelled"]).openapi({ example: "shipped" }),
					}),
				},
			},
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: OrderSchema } },
			description: "Statut mis à jour",
		},
		403: { content: { "application/json": { schema: ErrorSchema } }, description: "Interdit" },
		404: { content: { "application/json": { schema: ErrorSchema } }, description: "Non trouvée" },
	},
});

app.openapi(updateStatusRoute, async (c) => {
	const userId = c.get("user").id;
	const { id } = c.req.valid("param");
	const { status } = c.req.valid("json");

	const existing = await db.select().from(order).where(eq(order.id, id)).get();
	if (!existing) return c.json({ error: "Order not found" }, 404);

	const isSeller = existing.sellerId === userId;
	const isBuyer = existing.buyerId === userId;

	if (status === "shipped" && !isSeller) return c.json({ error: "Only the seller can mark as shipped" }, 403);
	if (status === "delivered" && !isBuyer) return c.json({ error: "Only the buyer can confirm delivery" }, 403);

	const updated = await db
		.update(order)
		.set({ status })
		.where(eq(order.id, id))
		.returning()
		.get();

	const notifyUserId = isSeller ? existing.buyerId : existing.sellerId;
	await db.insert(notification).values({
		userId: notifyUserId,
		type: "order_status",
		title: `Order ${status}`,
		message: `Order #${id.slice(0, 8)} has been marked as ${status}.`,
		articleId: existing.articleId,
	});

	return c.json(updated as any);
});

export default app;
