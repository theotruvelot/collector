import { db } from "@collector/db";
import { chat, chatMessage } from "@collector/db/schema/chat";
import { article as articleTable } from "@collector/db/schema/marketplace";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { and, desc, eq, gt, or } from "drizzle-orm";
import { sse } from "cloudflare-workers-sse";
import { requireAuth, type AuthEnv } from "../middleware/auth";

// ────────────────────────────── Schemas ──────────────────────────────

const MessageSchema = z
    .object({
        id: z.string().openapi({ example: "msg_01" }),
        chatId: z.string().openapi({ example: "chat_01" }),
        senderId: z.string().openapi({ example: "user_01" }),
        content: z.string().openapi({ example: "Bonjour, est-ce encore disponible ?" }),
        createdAt: z.string().nullable(),
    })
    .openapi("ChatMessage");

const ChatSchema = z
    .object({
        id: z.string().openapi({ example: "chat_01" }),
        articleId: z.string().openapi({ example: "art_01" }),
        buyerId: z.string().openapi({ example: "user_01" }),
        sellerId: z.string().openapi({ example: "user_02" }),
        createdAt: z.string().nullable(),
        updatedAt: z.string().nullable(),
    })
    .openapi("Chat");

const ErrorSchema = z.object({ error: z.string() }).openapi("Error");

const ChatIdParamSchema = z.object({
    chatId: z.string().openapi({ param: { name: "chatId", in: "path" }, example: "chat_01" }),
});

// ────────────────────────────── App ──────────────────────────────

const chats = new OpenAPIHono<AuthEnv>();
chats.use("*", requireAuth as any);

// GET / — lister mes chats
const listChatsRoute = createRoute({
    method: "get",
    path: "/",
    tags: ["Chats"],
    summary: "Lister mes conversations",
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            content: { "application/json": { schema: z.array(ChatSchema) } },
            description: "Liste des conversations de l'utilisateur connecté",
        },
    },
});

chats.openapi(listChatsRoute, async (c) => {
    const userSession = c.get("user");

    const userChats = await db.query.chat.findMany({
        where: or(eq(chat.buyerId, userSession.id), eq(chat.sellerId, userSession.id)),
        with: {
            article: true,
            buyer: { columns: { id: true, name: true, image: true } },
            seller: { columns: { id: true, name: true, image: true } },
            messages: { orderBy: [desc(chatMessage.createdAt)], limit: 1 },
        },
        orderBy: [desc(chat.updatedAt)],
    });

    return c.json(userChats as any);
});

// POST / — créer un chat ou retourner l'existant
const createChatRoute = createRoute({
    method: "post",
    path: "/",
    tags: ["Chats"],
    summary: "Démarrer une conversation sur un article",
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
        200: { content: { "application/json": { schema: ChatSchema } }, description: "Chat existant retourné" },
        400: { content: { "application/json": { schema: ErrorSchema } }, description: "Requête invalide" },
        404: { content: { "application/json": { schema: ErrorSchema } }, description: "Article non trouvé" },
    },
});

chats.openapi(createChatRoute, async (c) => {
    const userSession = c.get("user");
    const { articleId } = c.req.valid("json");

    const articleDetails = await db.query.article.findFirst({ where: eq(articleTable.id, articleId) });
    if (!articleDetails) return c.json({ error: "Article not found" }, 404);
    if (articleDetails.sellerId === userSession.id) {
        return c.json({ error: "Sellers cannot start a chat with themselves for their own article" }, 400);
    }

    const existingChat = await db.query.chat.findFirst({
        where: and(eq(chat.articleId, articleId), eq(chat.buyerId, userSession.id)),
    });

    if (existingChat) return c.json(existingChat as any);

    const [newChat] = await db
        .insert(chat)
        .values({ articleId, buyerId: userSession.id, sellerId: articleDetails.sellerId })
        .returning();

    return c.json(newChat as any);
});

// GET /:chatId/messages — lire les messages
const getMessagesRoute = createRoute({
    method: "get",
    path: "/{chatId}/messages",
    tags: ["Chats"],
    summary: "Lire les messages d'une conversation",
    security: [{ bearerAuth: [] }],
    request: { params: ChatIdParamSchema },
    responses: {
        200: {
            content: { "application/json": { schema: z.array(MessageSchema) } },
            description: "Messages de la conversation",
        },
        403: { content: { "application/json": { schema: ErrorSchema } }, description: "Accès interdit" },
        404: { content: { "application/json": { schema: ErrorSchema } }, description: "Chat non trouvé" },
    },
});

chats.openapi(getMessagesRoute, async (c) => {
    const { chatId } = c.req.valid("param");
    const userSession = c.get("user");

    const chatDetails = await db.query.chat.findFirst({ where: eq(chat.id, chatId) });
    if (!chatDetails) return c.json({ error: "Chat not found" }, 404);
    if (chatDetails.buyerId !== userSession.id && chatDetails.sellerId !== userSession.id) {
        return c.json({ error: "Unauthorized" }, 403);
    }

    const messages = await db.query.chatMessage.findMany({
        where: eq(chatMessage.chatId, chatId),
        orderBy: [chatMessage.createdAt],
    });

    return c.json(messages as any);
});

// POST /:chatId/messages — envoyer un message
const sendMessageRoute = createRoute({
    method: "post",
    path: "/{chatId}/messages",
    tags: ["Chats"],
    summary: "Envoyer un message dans une conversation",
    security: [{ bearerAuth: [] }],
    request: {
        params: ChatIdParamSchema,
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        content: z.string().min(1).openapi({ example: "Oui, il est toujours disponible !" }),
                    }),
                },
            },
        },
    },
    responses: {
        200: { content: { "application/json": { schema: MessageSchema } }, description: "Message envoyé" },
        400: { content: { "application/json": { schema: ErrorSchema } }, description: "Contenu invalide" },
        403: { content: { "application/json": { schema: ErrorSchema } }, description: "Accès interdit" },
        404: { content: { "application/json": { schema: ErrorSchema } }, description: "Chat non trouvé" },
    },
});

chats.openapi(sendMessageRoute, async (c) => {
    const { chatId } = c.req.valid("param");
    const userSession = c.get("user");
    const { content } = c.req.valid("json");

    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/i;
    const phoneRegex = /(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/;
    if (emailRegex.test(content) || phoneRegex.test(content)) {
        return c.json({ error: "Partager un numéro de téléphone ou un email n'est pas autorisé." }, 400);
    }

    const chatDetails = await db.query.chat.findFirst({ where: eq(chat.id, chatId) });
    if (!chatDetails) return c.json({ error: "Chat not found" }, 404);
    if (chatDetails.buyerId !== userSession.id && chatDetails.sellerId !== userSession.id) {
        return c.json({ error: "Unauthorized" }, 403);
    }

    const [newMessage] = await db
        .insert(chatMessage)
        .values({ chatId, senderId: userSession.id, content })
        .returning();

    await db.update(chat).set({ updatedAt: new Date() }).where(eq(chat.id, chatId));

    return c.json(newMessage as any);
});

// GET /:chatId/stream — SSE (non documenté dans OpenAPI, flux temps réel)
chats.get("/:chatId/stream", async (c) => {
    const chatId = c.req.param("chatId");
    const userSession = c.get("user");

    const chatDetails = await db.query.chat.findFirst({ where: eq(chat.id, chatId) });
    if (
        !chatDetails ||
        (chatDetails.buyerId !== userSession.id && chatDetails.sellerId !== userSession.id)
    ) {
        return c.json({ error: "Unauthorized" }, 403);
    }

    const handler = async function* () {
        let lastCreatedAt: Date | null = null;

        const latestMessage = await db.query.chatMessage.findFirst({
            where: eq(chatMessage.chatId, chatId),
            orderBy: [desc(chatMessage.createdAt)],
        });

        if (latestMessage) lastCreatedAt = latestMessage.createdAt;

        while (true) {
            const where =
                lastCreatedAt !== null
                    ? and(eq(chatMessage.chatId, chatId), gt(chatMessage.createdAt, lastCreatedAt))
                    : eq(chatMessage.chatId, chatId);

            const newMessages = await db.query.chatMessage.findMany({
                where,
                orderBy: [chatMessage.createdAt],
            });

            for (const message of newMessages) {
                lastCreatedAt = message.createdAt;
                yield { event: "message", data: message };
            }

            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
    };

    const fetchHandler = sse(handler as any);
    return fetchHandler(c.req.raw as any, c.env as AuthEnv, c.executionCtx as any);
});

export default chats;
