import { db } from "@collector/db";
import { notification } from "@collector/db/schema/marketplace";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import type { AuthEnv } from "../middleware/auth";

const NotificationSchema = z
	.object({
		id: z.string().openapi({ example: "notif_01" }),
		userId: z.string().openapi({ example: "user_01" }),
		type: z.string().openapi({ example: "order_status" }),
		title: z.string().openapi({ example: "Nouvelle vente !" }),
		message: z.string().openapi({ example: 'Votre article "Carte Pikachu" a été vendu.' }),
		read: z.boolean().openapi({ example: false }),
		articleId: z.string().nullable().openapi({ example: "art_01" }),
		createdAt: z.string().nullable().openapi({ example: "2024-01-01T00:00:00.000Z" }),
	})
	.openapi("Notification");

const ErrorSchema = z.object({ error: z.string() }).openapi("Error");

const IdParamSchema = z.object({
	id: z.string().openapi({ param: { name: "id", in: "path" }, example: "notif_01" }),
});

const app = new OpenAPIHono<AuthEnv>();
app.use("/*", requireAuth as any);

// GET /
const listRoute = createRoute({
	method: "get",
	path: "/",
	tags: ["Notifications"],
	summary: "Lister mes notifications",
	security: [{ bearerAuth: [] }],
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.object({
						notifications: z.array(NotificationSchema),
						unreadCount: z.number().openapi({ example: 3 }),
					}),
				},
			},
			description: "Liste des notifications de l'utilisateur connecté",
		},
	},
});

app.openapi(listRoute, async (c) => {
	const userId = c.get("user").id;

	const notifications = await db
		.select()
		.from(notification)
		.where(eq(notification.userId, userId))
		.orderBy(desc(notification.createdAt))
		.limit(50)
		.all();

	const unreadCount = notifications.filter((n) => !n.read).length;
	return c.json({ notifications: notifications as any, unreadCount });
});

// PUT /:id/read
const markReadRoute = createRoute({
	method: "put",
	path: "/:id/read",
	tags: ["Notifications"],
	summary: "Marquer une notification comme lue",
	security: [{ bearerAuth: [] }],
	request: { params: IdParamSchema },
	responses: {
		200: {
			content: { "application/json": { schema: NotificationSchema } },
			description: "Notification mise à jour",
		},
		404: { content: { "application/json": { schema: ErrorSchema } }, description: "Non trouvée" },
	},
});

app.openapi(markReadRoute, async (c) => {
	const userId = c.get("user").id;
	const { id } = c.req.valid("param");

	const updated = await db
		.update(notification)
		.set({ read: true })
		.where(and(eq(notification.id, id), eq(notification.userId, userId)))
		.returning()
		.get();

	if (!updated) {
		return c.json({ error: "Notification not found" }, 404);
	}
	return c.json(updated as any);
});

// PUT /read-all
const markAllReadRoute = createRoute({
	method: "put",
	path: "/read-all",
	tags: ["Notifications"],
	summary: "Marquer toutes les notifications comme lues",
	security: [{ bearerAuth: [] }],
	responses: {
		200: {
			content: { "application/json": { schema: z.object({ success: z.boolean() }) } },
			description: "Toutes les notifications marquées comme lues",
		},
	},
});

app.openapi(markAllReadRoute, async (c) => {
	const userId = c.get("user").id;

	await db
		.update(notification)
		.set({ read: true })
		.where(and(eq(notification.userId, userId), eq(notification.read, false)))
		.run();

	return c.json({ success: true });
});

export default app;
