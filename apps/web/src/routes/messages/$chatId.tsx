import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUp, MoveLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { env } from "@collector/env/web";
import { authClient } from "@/lib/auth-client";
import { api } from "@/lib/api";

export const Route = createFileRoute("/messages/$chatId")({
    component: RouteComponent,
});

type Message = { id: string; content: string; createdAt: string; senderId: string };

function RouteComponent() {
    const { chatId } = Route.useParams();
    const { data: session } = authClient.useSession();

    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        async function fetchMessages() {
            try {
                const data = await api.get<Message[]>(`/api/chats/${chatId}/messages`);
                setMessages(data instanceof Array ? data : []);
            } catch (error: any) {
                toast.error(error.message || "Failed to load conversation messages");
            } finally {
                setLoading(false);
            }
        }
        if (session) fetchMessages();
    }, [session, chatId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // SSE pour les nouveaux messages en temps réel
    useEffect(() => {
        if (!session || loading) return;

        const sseUrl = `${env.VITE_SERVER_URL}/api/chats/${chatId}/stream`;

        const eventSource = new EventSource(sseUrl, { withCredentials: true });

        const onMessage = (event: MessageEvent) => {
            try {
                const message: Message = JSON.parse(event.data);
                setMessages((prev) => {
                    if (prev.some((m) => m.id === message.id)) return prev;
                    return [...prev, message];
                });
            } catch {
                // Ignore malformed events
            }
        };

        eventSource.addEventListener("message", onMessage);

        eventSource.onerror = () => {
            // En cas d'erreur, on ferme la connexion, EventSource va tenter de se reconnecter automatiquement
            eventSource.close();
        };

        return () => {
            eventSource.removeEventListener("message", onMessage);
            eventSource.close();
        };
    }, [chatId, session, loading]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        setSending(true);
        try {
            await api.post<Message>(`/api/chats/${chatId}/messages`, {
                content: newMessage.trim(),
            });
            // Le SSE livre le message à tous (expéditeur inclus) — pas besoin d'ajout ici
            setNewMessage("");
        } catch (error: any) {
            toast.error(error.message || "Failed to send message");
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col h-[calc(100vh-48px)] px-4 py-6">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
                <Link
                    to="/messages"
                    className="rounded-full p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                    <MoveLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                    Conversation
                </h1>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-6 pr-2 space-y-4">
                {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                            <span className="text-2xl">👋</span>
                        </div>
                        <h3 className="mt-4 text-base font-medium text-zinc-900 dark:text-zinc-100">Say hello!</h3>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            Start the conversation with the seller/buyer.
                        </p>
                    </div>
                ) : (
                    messages.map((message) => {
                        const isMe = message.senderId === session?.user.id;
                        return (
                            <div key={message.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isMe
                                        ? "bg-primary text-primary-foreground rounded-br-none"
                                        : "bg-zinc-100 text-zinc-900 rounded-bl-none dark:bg-zinc-800 dark:text-zinc-100"
                                        }`}
                                >
                                    <p>{message.content}</p>
                                    <p className={`mt-1 text-[10px] ${isMe ? "text-primary-foreground/70" : "text-zinc-500 dark:text-zinc-400"}`}>
                                        {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="pt-4 mt-auto border-t border-zinc-200 dark:border-zinc-800">
                <form
                    onSubmit={sendMessage}
                    className="flex items-center gap-2 rounded-full border border-zinc-300 bg-white p-1 focus-within:ring-2 focus-within:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-900"
                >
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Ecrivez un message..."
                        className="flex-1 bg-transparent px-4 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-500 rounded-l-full dark:text-zinc-100"
                        disabled={sending}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                    >
                        <ArrowUp className="h-5 w-5" />
                    </button>
                </form>
                <p className="mt-2 text-center text-[10px] text-zinc-500">
                    Veuillez ne pas partager de numéro de téléphone ou adresse email pour votre sécurité.
                </p>
            </div>
        </main>
    );
}
