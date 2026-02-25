import { db } from "@collector/db";
import { chat, chatMessage } from "@collector/db/schema/chat";
import { article as articleTable } from "@collector/db/schema/marketplace";
import { and, desc, eq, or } from "drizzle-orm";
import { Hono } from "hono";
import { requireAuth, type AuthEnv } from "../middleware/auth";
import { EventEmitter } from "node:events";

const chats = new Hono<AuthEnv>();
const chatEmitter = new EventEmitter();

chats.use("*", requireAuth);

// Get all chats for the authenticated user
chats.get("/", async (c) => {
    const userSession = c.get("user");

    const userChats = await db.query.chat.findMany({
        where: or(
            eq(chat.buyerId, userSession.id),
            eq(chat.sellerId, userSession.id)
        ),
        with: {
            article: true,
            buyer: {
                columns: { id: true, name: true, image: true },
            },
            seller: {
                columns: { id: true, name: true, image: true },
            },
            messages: {
                orderBy: [desc(chatMessage.createdAt)],
                limit: 1,
            }
        },
        orderBy: [desc(chat.updatedAt)],
    });

    return c.json(userChats);
});

// Create a new chat or return existing one
chats.post("/", async (c) => {
    const userSession = c.get("user");
    const body = await c.req.json();

    if (!body.articleId) {
        return c.json({ error: "articleId is required" }, 400);
    }

    const articleDetails = await db.query.article.findFirst({
        where: eq(articleTable.id, body.articleId),
    });

    if (!articleDetails) {
        return c.json({ error: "Article not found" }, 404);
    }

    if (articleDetails.sellerId === userSession.id) {
        return c.json({ error: "Sellers cannot start a chat with themselves for their own article" }, 400);
    }

    // Check if chat already exists
    const existingChat = await db.query.chat.findFirst({
        where: and(
            eq(chat.articleId, body.articleId),
            eq(chat.buyerId, userSession.id)
        ),
    });

    if (existingChat) {
        return c.json(existingChat);
    }

    // Create new chat
    const [newChat] = await db
        .insert(chat)
        .values({
            articleId: body.articleId,
            buyerId: userSession.id,
            sellerId: articleDetails.sellerId,
        })
        .returning();

    return c.json(newChat);
});

// Get messages for a specific chat
chats.get("/:chatId/messages", async (c) => {
    const chatId = c.req.param("chatId");
    const userSession = c.get("user");

    // Verify user is part of the chat
    const chatDetails = await db.query.chat.findFirst({
        where: eq(chat.id, chatId),
    });

    if (!chatDetails) {
        return c.json({ error: "Chat not found" }, 404);
    }

    if (chatDetails.buyerId !== userSession.id && chatDetails.sellerId !== userSession.id) {
        return c.json({ error: "Unauthorized" }, 403);
    }

    const messages = await db.query.chatMessage.findMany({
        where: eq(chatMessage.chatId, chatId),
        orderBy: [chatMessage.createdAt],
    });

    return c.json(messages);
});

// SSE endpoint for real-time messages
chats.get("/:chatId/stream", async (c) => {
    const chatId = c.req.param("chatId");
    const userSession = c.get("user");

    // Verify user is part of the chat
    const chatDetails = await db.query.chat.findFirst({
        where: eq(chat.id, chatId),
    });

    if (!chatDetails || (chatDetails.buyerId !== userSession.id && chatDetails.sellerId !== userSession.id)) {
        return c.json({ error: "Unauthorized" }, 403); // Can't easily return 403 in SSE stream before starting, but we can close it
    }

    const encoder = new TextEncoder();

    let cleanup: (() => void) | null = null;

    const body = new ReadableStream({
        start(controller) {
            const write = (event: string, data: string) => {
                try {
                    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
                } catch {
                    cleanup?.();
                    cleanup = null;
                }
            };

            const listener = (message: any) => write("message", JSON.stringify(message));

            chatEmitter.on(`chat:${chatId}`, listener);

            const pingInterval = setInterval(() => write("ping", "ping"), 25000);

            cleanup = () => {
                chatEmitter.off(`chat:${chatId}`, listener);
                clearInterval(pingInterval);
            };
        },
        cancel() {
            cleanup?.();
            cleanup = null;
        },
    });

    return new Response(body, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
});

// Send a message
chats.post("/:chatId/messages", async (c) => {
    const chatId = c.req.param("chatId");
    const userSession = c.get("user");
    const body = await c.req.json();

    if (!body.content || typeof body.content !== "string") {
        return c.json({ error: "Message content is required" }, 400);
    }

    // Filter phone numbers and emails
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/i;
    const phoneRegex = /(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/; // Basic French phone regex

    if (emailRegex.test(body.content) || phoneRegex.test(body.content)) {
        return c.json({ error: "Partager un numéro de téléphone ou un email n'est pas autorisé." }, 400);
    }

    // Verify user is part of the chat
    const chatDetails = await db.query.chat.findFirst({
        where: eq(chat.id, chatId),
    });

    if (!chatDetails) {
        return c.json({ error: "Chat not found" }, 404);
    }

    if (chatDetails.buyerId !== userSession.id && chatDetails.sellerId !== userSession.id) {
        return c.json({ error: "Unauthorized" }, 403);
    }

    // Save message
    const [newMessage] = await db
        .insert(chatMessage)
        .values({
            chatId,
            senderId: userSession.id,
            content: body.content,
        })
        .returning();

    // Update chat's updatedAt timestamp
    await db.update(chat).set({ updatedAt: new Date() }).where(eq(chat.id, chatId));

    // Emit event to SSE clients
    chatEmitter.emit(`chat:${chatId}`, newMessage);

    return c.json(newMessage);
});

export default chats;
