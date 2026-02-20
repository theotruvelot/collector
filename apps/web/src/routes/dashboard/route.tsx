import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
} from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard")({
	component: DashboardLayout,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			throw redirect({ to: "/login" });
		}
		return { session };
	},
});

const navLinks = [
	{ to: "/dashboard", label: "Overview" },
	{ to: "/dashboard/articles", label: "My Articles" },
	{ to: "/dashboard/sales", label: "Sales" },
	{ to: "/dashboard/purchases", label: "Purchases" },
	{ to: "/dashboard/notifications", label: "Notifications" },
] as const;

function DashboardLayout() {
	const { session } = Route.useRouteContext();

	return (
		<div className="container mx-auto max-w-6xl px-4 py-6">
			<div className="mb-4">
				<h1 className="font-bold text-2xl">Dashboard</h1>
				<p className="text-muted-foreground text-sm">
					Welcome, {session.data?.user.name}
				</p>
			</div>

			<nav className="mb-6 flex flex-wrap gap-2 border-b pb-4">
				{navLinks.map(({ to, label }) => (
					<Link key={to} to={to}>
						{({ isActive }) => (
							<Button variant={isActive ? "default" : "ghost"} size="sm">
								{label}
							</Button>
						)}
					</Link>
				))}
				{(session.data?.user as any)?.role === "admin" && (
					<Link to="/admin">
						<Button variant="outline" size="sm">
							Admin Panel
						</Button>
					</Link>
				)}
			</nav>

			<Outlet />
		</div>
	);
}
