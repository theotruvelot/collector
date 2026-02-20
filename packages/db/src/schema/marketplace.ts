import { relations, sql } from "drizzle-orm";
import {
	index,
	integer,
	real,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const articleStatusEnum = [
	"draft",
	"pending",
	"approved",
	"rejected",
	"sold",
] as const;
export type ArticleStatus = (typeof articleStatusEnum)[number];

export const orderStatusEnum = [
	"pending",
	"paid",
	"shipped",
	"delivered",
	"cancelled",
] as const;
export type OrderStatus = (typeof orderStatusEnum)[number];

export const notificationTypeEnum = [
	"price_change",
	"new_article",
	"order_status",
	"moderation",
] as const;
export type NotificationType = (typeof notificationTypeEnum)[number];

// --- Categories ---

export const category = sqliteTable("category", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	description: text("description"),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => new Date())
		.notNull(),
});

// --- Articles ---

export const article = sqliteTable(
	"article",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		title: text("title").notNull(),
		slug: text("slug").notNull().unique(),
		description: text("description").notNull(),
		price: real("price").notNull(),
		shippingCost: real("shipping_cost").default(0).notNull(),
		status: text("status", { enum: articleStatusEnum })
			.default("draft")
			.notNull(),
		categoryId: text("category_id")
			.notNull()
			.references(() => category.id, { onDelete: "restrict" }),
		sellerId: text("seller_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("article_categoryId_idx").on(table.categoryId),
		index("article_sellerId_idx").on(table.sellerId),
		index("article_status_idx").on(table.status),
	],
);

// --- Article Images ---

export const articleImage = sqliteTable(
	"article_image",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		articleId: text("article_id")
			.notNull()
			.references(() => article.id, { onDelete: "cascade" }),
		url: text("url").notNull(),
		order: integer("order").default(0).notNull(),
	},
	(table) => [index("articleImage_articleId_idx").on(table.articleId)],
);

// --- Price History ---

export const priceHistory = sqliteTable(
	"price_history",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		articleId: text("article_id")
			.notNull()
			.references(() => article.id, { onDelete: "cascade" }),
		oldPrice: real("old_price").notNull(),
		newPrice: real("new_price").notNull(),
		changedAt: integer("changed_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [index("priceHistory_articleId_idx").on(table.articleId)],
);

// --- Orders ---

export const order = sqliteTable(
	"order",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		articleId: text("article_id")
			.notNull()
			.references(() => article.id, { onDelete: "restrict" }),
		buyerId: text("buyer_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		sellerId: text("seller_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		amount: real("amount").notNull(),
		commission: real("commission").notNull(),
		status: text("status", { enum: orderStatusEnum })
			.default("pending")
			.notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("order_buyerId_idx").on(table.buyerId),
		index("order_sellerId_idx").on(table.sellerId),
		index("order_articleId_idx").on(table.articleId),
	],
);

// --- Notifications ---

export const notification = sqliteTable(
	"notification",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		type: text("type", { enum: notificationTypeEnum }).notNull(),
		title: text("title").notNull(),
		message: text("message").notNull(),
		articleId: text("article_id").references(() => article.id, {
			onDelete: "set null",
		}),
		read: integer("read", { mode: "boolean" }).default(false).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("notification_userId_idx").on(table.userId),
		index("notification_read_idx").on(table.read),
	],
);

// --- Relations ---

export const categoryRelations = relations(category, ({ many }) => ({
	articles: many(article),
}));

export const articleRelations = relations(article, ({ one, many }) => ({
	category: one(category, {
		fields: [article.categoryId],
		references: [category.id],
	}),
	seller: one(user, {
		fields: [article.sellerId],
		references: [user.id],
	}),
	images: many(articleImage),
	priceHistory: many(priceHistory),
	orders: many(order),
}));

export const articleImageRelations = relations(articleImage, ({ one }) => ({
	article: one(article, {
		fields: [articleImage.articleId],
		references: [article.id],
	}),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
	article: one(article, {
		fields: [priceHistory.articleId],
		references: [article.id],
	}),
}));

export const orderRelations = relations(order, ({ one }) => ({
	article: one(article, {
		fields: [order.articleId],
		references: [article.id],
	}),
	buyer: one(user, {
		fields: [order.buyerId],
		references: [user.id],
		relationName: "buyerOrders",
	}),
	seller: one(user, {
		fields: [order.sellerId],
		references: [user.id],
		relationName: "sellerOrders",
	}),
}));

export const notificationRelations = relations(notification, ({ one }) => ({
	user: one(user, {
		fields: [notification.userId],
		references: [user.id],
	}),
	article: one(article, {
		fields: [notification.articleId],
		references: [article.id],
	}),
}));
