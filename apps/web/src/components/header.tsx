import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
	const { data: session } = authClient.useSession();
	const [unread, setUnread] = useState(0);

	useEffect(() => {
		if (!session) return;
		api
			.get<{ unreadCount: number }>("/api/notifications")
			.then((data) => setUnread(data.unreadCount))
			.catch(() => {});
	}, [session]);

	const links = [
		{ to: "/", label: "Home" },
		{ to: "/catalog", label: "Catalog" },
		{ to: "/dashboard", label: "Dashboard" },
	] as const;

	return (
		<div>
			<div className="flex flex-row items-center justify-between px-2 py-1">
				<nav className="flex items-center gap-4 text-lg">
					{links.map(({ to, label }) => (
						<Link key={to} to={to}>
							{label}
						</Link>
					))}
				</nav>
				<div className="flex items-center gap-2">
					{session && unread > 0 && (
						<Link
							to="/dashboard/notifications"
							className="relative text-sm"
						>
							<span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
								{unread}
							</span>
							<span className="px-1">🔔</span>
						</Link>
					)}
					<ModeToggle />
					<UserMenu />
				</div>
			</div>
			<hr />
		</div>
	);
}
