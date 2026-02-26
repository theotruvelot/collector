import { db } from "@collector/db";
import { category } from "@collector/db/schema/marketplace";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth";
import type { AuthEnv } from "../middleware/auth";

const CategorySchema = z
	.object({
		id: z.string().openapi({ example: "cat_01" }),
		name: z.string().openapi({ example: "Figurines" }),
		slug: z.string().openapi({ example: "figurines" }),
		description: z.string().nullable().openapi({ example: "Figurines de collection" }),
		createdAt: z.string().nullable().openapi({ example: "2024-01-01T00:00:00.000Z" }),
	})
	.openapi("Category");

const CategoryBodySchema = z.object({
	name: z.string().min(1).max(100).openapi({ example: "Figurines" }),
	slug: z
		.string()
		.min(1)
		.max(100)
		.regex(/^[a-z0-9-]+$/)
		.openapi({ example: "figurines" }),
	description: z.string().max(500).optional().openapi({ example: "Figurines de collection" }),
});

const ErrorSchema = z.object({ error: z.string() }).openapi("Error");

const app = new OpenAPIHono<AuthEnv>();

// GET /
const listRoute = createRoute({
	method: "get",
	path: "/",
	tags: ["Categories"],
	summary: "Lister toutes les catégories",
	responses: {
		200: {
			content: { "application/json": { schema: z.array(CategorySchema) } },
			description: "Liste des catégories",
		},
	},
});

app.openapi(listRoute, async (c) => {
	const categories = await db.select().from(category).all();
	return c.json(categories as any, 200);
});

// POST /
const createCategoryRoute = createRoute({
	method: "post",
	path: "/",
	tags: ["Categories"],
	summary: "Créer une catégorie (admin)",
	security: [{ bearerAuth: [] }],
	request: { body: { content: { "application/json": { schema: CategoryBodySchema } } } },
	responses: {
		201: {
			content: { "application/json": { schema: CategorySchema } },
			description: "Catégorie créée",
		},
		409: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Slug déjà existant",
		},
	},
});

app.use("/", requireAdmin as any);
app.openapi(createCategoryRoute, async (c) => {
	const data = c.req.valid("json");

	const existing = await db
		.select()
		.from(category)
		.where(eq(category.slug, data.slug))
		.get();
	if (existing) {
		return c.json({ error: "Category slug already exists" }, 409);
	}

	const created = await db.insert(category).values(data).returning().get();
	return c.json(created as any, 201);
});

// PUT /:id
const updateCategoryRoute = createRoute({
	method: "put",
	path: "/:id",
	tags: ["Categories"],
	summary: "Mettre à jour une catégorie (admin)",
	security: [{ bearerAuth: [] }],
	request: {
		params: z.object({ id: z.string().openapi({ param: { name: "id", in: "path" }, example: "cat_01" }) }),
		body: { content: { "application/json": { schema: CategoryBodySchema.partial() } } },
	},
	responses: {
		200: {
			content: { "application/json": { schema: CategorySchema } },
			description: "Catégorie mise à jour",
		},
		404: { content: { "application/json": { schema: ErrorSchema } }, description: "Non trouvée" },
	},
});

app.use("/:id", requireAdmin as any);
app.openapi(updateCategoryRoute, async (c) => {
	const { id } = c.req.valid("param");
	const data = c.req.valid("json");

	const updated = await db
		.update(category)
		.set(data)
		.where(eq(category.id, id))
		.returning()
		.get();

	if (!updated) {
		return c.json({ error: "Category not found" }, 404);
	}
	return c.json(updated as any, 200);
});

// DELETE /:id
const deleteCategoryRoute = createRoute({
	method: "delete",
	path: "/:id",
	tags: ["Categories"],
	summary: "Supprimer une catégorie (admin)",
	security: [{ bearerAuth: [] }],
	request: {
		params: z.object({ id: z.string().openapi({ param: { name: "id", in: "path" }, example: "cat_01" }) }),
	},
	responses: {
		200: {
			content: { "application/json": { schema: z.object({ success: z.boolean() }) } },
			description: "Supprimée",
		},
		404: { content: { "application/json": { schema: ErrorSchema } }, description: "Non trouvée" },
	},
});

app.openapi(deleteCategoryRoute, async (c) => {
	const { id } = c.req.valid("param");

	const deleted = await db
		.delete(category)
		.where(eq(category.id, id))
		.returning()
		.get();

	if (!deleted) {
		return c.json({ error: "Category not found" }, 404);
	}
	return c.json({ success: true }, 200);
});

export default app;
