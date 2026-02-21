import { Link, useRouterState } from "@tanstack/react-router";
import { BellIcon, GalleryVerticalEndIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

const AUTH_ROUTES = ["/login"];

export default function Header() {
	const { data: session } = authClient.useSession();
	const [unread, setUnread] = useState(0);
	const { location } = useRouterState();

	const isAuthPage = AUTH_ROUTES.includes(location.pathname);

	useEffect(() => {
		if (!session) return;
		api
			.get<{ unreadCount: number }>("/api/notifications")
			.then((data) => setUnread(data.unreadCount))
			.catch(() => { });
	}, [session]);

	const navLinks = [
		{ to: "/", label: "Home", exact: true },
		{ to: "/catalog", label: "Catalog", exact: false },
		...(session ? [{ to: "/dashboard", label: "Dashboard", exact: false }] : []),
	] as const;

	/* ─── Auth pages: minimal header ────────────────────────── */
	if (isAuthPage) {
		return (
			<header className="border-border/50 flex h-12 items-center justify-between border-b px-4">
				<Link
					to="/"
					className="flex items-center gap-2 font-semibold transition-opacity hover:opacity-80"
				>
					<div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-sm">
						<GalleryVerticalEndIcon className="size-3.5" />
					</div>
					<span className="text-sm">Collector</span>
				</Link>
				<ModeToggle />
			</header>
		);
	}

	/* ─── Regular pages: full navbar ────────────────────────── */
	return (
		<header className="border-border/50 bg-background/90 sticky top-0 z-50 border-b backdrop-blur-sm">
			<div className="mx-auto flex h-12 max-w-screen-xl items-center justify-between px-4">
				{/* ── Left: logo + nav ─────────────────────────────── */}
				<div className="flex items-center gap-1">
					<Link
						to="/"
						className="mr-4 flex items-center gap-2 font-semibold transition-opacity hover:opacity-80"
					>
						<div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-sm">
							<GalleryVerticalEndIcon className="size-3.5" />
						</div>
						<span className="text-sm">Collector</span>
					</Link>

					{/* separator */}
					<div className="bg-border mr-3 h-4 w-px" />

					<nav className="flex items-center">
						{navLinks.map(({ to, label, exact }) => (
							<Link
								key={to}
								to={to}
								activeOptions={{ exact }}
								className="text-muted-foreground hover:text-foreground data-[status=active]:text-foreground relative rounded-sm px-2.5 py-1 text-sm transition-colors [&[data-status=active]]:after:absolute [&[data-status=active]]:after:inset-x-2 [&[data-status=active]]:after:-bottom-[calc(0.75rem+1px)] [&[data-status=active]]:after:h-px [&[data-status=active]]:after:bg-foreground"
							>
								{label}
							</Link>
						))}
					</nav>
				</div>

				{/* ── Right: actions ───────────────────────────────── */}
				<div className="flex items-center gap-1">
					{session && unread > 0 && (
						<Link
							to="/dashboard/notifications"
							className="text-muted-foreground hover:text-foreground hover:bg-muted relative rounded-sm p-1.5 transition-colors"
							title="Notifications"
						>
							<BellIcon className="size-4" />
							<span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold">
								{unread > 9 ? "9+" : unread}
							</span>
						</Link>
					)}
					<ModeToggle />
					<UserMenu />
				</div>
			</div>
		</header>
	);
}
