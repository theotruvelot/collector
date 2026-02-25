import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/messages/")({
    component: RouteComponent,
});

type User = { id: string; name: string; image: string | null };
type Article = { id: string; title: string; price: number };
type Message = { id: string; content: string; createdAt: string; senderId: string };

type ChatItem = {
    id: string;
    articleId: string;
    buyerId: string;
    sellerId: string;
    createdAt: string;
    updatedAt: string;
    article: Article;
    buyer: User;
    seller: User;
    messages: Message[];
};

function RouteComponent() {
    const { data: session } = authClient.useSession();
    const [chats, setChats] = useState<ChatItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchChats() {
            try {
                const data = await api.get<ChatItem[]>("/api/chats");
                setChats(data instanceof Array ? data : []);
            } catch (error: any) {
                toast.error(error.message || "An error occurred while loading messages.");
            } finally {
                setLoading(false);
            }
        }

        if (session) {
            fetchChats();
        }
    }, [session]);

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    Messages
                </h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Vos conversations avec les vendeurs et acheteurs.
                </p>
            </div>

            {chats.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 py-16 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <span className="text-2xl">💬</span>
                    </div>
                    <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                        No messages yet
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        When you contact a seller or a buyer contacts you, you'll see the
                        conversation here.
                    </p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {chats.map((chat) => {
                        const isBuyer = chat.buyerId === session?.user.id;
                        const otherUser = isBuyer ? chat.seller : chat.buyer;
                        const lastMessage = chat.messages?.[0];

                        return (
                            <Link
                                key={chat.id}
                                to="/messages/$chatId"
                                params={{ chatId: chat.id }}
                                className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:bg-zinc-50 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                            >
                                {otherUser.image ? (
                                    <img
                                        src={otherUser.image}
                                        alt={otherUser.name}
                                        className="h-12 w-12 rounded-full object-cover shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800"
                                    />
                                ) : (
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                                        {otherUser.name?.[0]?.toUpperCase()}
                                    </div>
                                )}
                                <div className="flex flex-1 flex-col min-w-0">
                                    <div className="flex items-center justify-between gap-2 overflow-hidden">
                                        <p className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                            {otherUser.name}
                                        </p>
                                        <span className="shrink-0 text-xs text-zinc-500">
                                            {lastMessage
                                                ? new Date(lastMessage.createdAt).toLocaleDateString()
                                                : new Date(chat.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 overflow-hidden">
                                        <span className="truncate text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded w-fit">
                                            {chat.article.title}
                                        </span>
                                        <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                                            {lastMessage?.content || "No messages yet"}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </main>
    );
}
