import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { article } from "./marketplace";

export const chat = sqliteTable(
    "chat",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        articleId: text("article_id")
            .notNull()
            .references(() => article.id, { onDelete: "cascade" }),
        buyerId: text("buyer_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
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
        index("chat_buyerId_idx").on(table.buyerId),
        index("chat_sellerId_idx").on(table.sellerId),
        index("chat_articleId_idx").on(table.articleId),
    ],
);

export const chatMessage = sqliteTable(
    "chat_message",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        chatId: text("chat_id")
            .notNull()
            .references(() => chat.id, { onDelete: "cascade" }),
        senderId: text("sender_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        content: text("content").notNull(),
        createdAt: integer("created_at", { mode: "timestamp_ms" })
            .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
            .notNull(),
    },
    (table) => [
        index("chatMessage_chatId_idx").on(table.chatId),
        index("chatMessage_senderId_idx").on(table.senderId),
    ],
);

export const chatRelations = relations(chat, ({ one, many }) => ({
    article: one(article, {
        fields: [chat.articleId],
        references: [article.id],
    }),
    buyer: one(user, {
        fields: [chat.buyerId],
        references: [user.id],
        relationName: "buyerChats",
    }),
    seller: one(user, {
        fields: [chat.sellerId],
        references: [user.id],
        relationName: "sellerChats",
    }),
    messages: many(chatMessage),
}));

export const chatMessageRelations = relations(chatMessage, ({ one }) => ({
    chat: one(chat, {
        fields: [chatMessage.chatId],
        references: [chat.id],
    }),
    sender: one(user, {
        fields: [chatMessage.senderId],
        references: [user.id],
    }),
}));
