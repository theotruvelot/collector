import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

type Notification = {
	id: string;
	type: string;
	title: string;
	message: string;
	read: boolean;
	createdAt: string;
};

export const Route = createFileRoute("/dashboard/notifications")({
	component: NotificationsPage,
});

function NotificationsPage() {
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [loading, setLoading] = useState(true);

	const loadNotifications = () => {
		setLoading(true);
		api
			.get<{ notifications: Notification[] }>("/api/notifications")
			.then((data) => setNotifications(data.notifications))
			.finally(() => setLoading(false));
	};

	useEffect(loadNotifications, []);

	const markAsRead = async (id: string) => {
		await api.put(`/api/notifications/${id}/read`);
		loadNotifications();
	};

	const markAllAsRead = async () => {
		await api.put("/api/notifications/read-all");
		loadNotifications();
	};

	const unreadCount = notifications.filter((n) => !n.read).length;

	return (
		<div>
			<div className="mb-4 flex items-center justify-between">
				<h2 className="text-lg font-semibold">
					Notifications{" "}
					{unreadCount > 0 && (
						<span className="text-muted-foreground text-sm font-normal">
							({unreadCount} unread)
						</span>
					)}
				</h2>
				{unreadCount > 0 && (
					<Button variant="outline" size="sm" onClick={markAllAsRead}>
						Mark all as read
					</Button>
				)}
			</div>

			{loading ? (
				<p className="text-muted-foreground text-sm">Loading...</p>
			) : notifications.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					No notifications yet.
				</p>
			) : (
				<div className="space-y-2">
					{notifications.map((notif) => (
						<Card
							key={notif.id}
							className={notif.read ? "opacity-60" : ""}
						>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-sm">
									{!notif.read && (
										<span className="h-2 w-2 rounded-full bg-primary" />
									)}
									{notif.title}
									<span className="ml-auto text-muted-foreground text-xs font-normal">
										{new Date(
											notif.createdAt,
										).toLocaleDateString()}
									</span>
								</CardTitle>
							</CardHeader>
							<CardContent className="flex items-center justify-between">
								<p className="text-xs">{notif.message}</p>
								{!notif.read && (
									<Button
										variant="ghost"
										size="xs"
										onClick={() => markAsRead(notif.id)}
									>
										Mark read
									</Button>
								)}
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
