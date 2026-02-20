import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
} from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/admin")({
	component: AdminLayout,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			redirect({ to: "/login", throw: true });
		}
		if ((session.data.user as any).role !== "admin") {
			redirect({ to: "/dashboard", throw: true });
		}
		return { session };
	},
});

const adminLinks = [
	{ to: "/admin", label: "Dashboard" },
	{ to: "/admin/categories", label: "Categories" },
	{ to: "/admin/moderation", label: "Moderation" },
] as const;

function AdminLayout() {
	return (
		<div className="container mx-auto max-w-6xl px-4 py-6">
			<div className="mb-4">
				<h1 className="text-2xl font-bold">Admin Panel</h1>
			</div>

			<nav className="mb-6 flex flex-wrap gap-2 border-b pb-4">
				{adminLinks.map(({ to, label }) => (
					<Link key={to} to={to}>
						{({ isActive }) => (
							<Button
								variant={isActive ? "default" : "ghost"}
								size="sm"
							>
								{label}
							</Button>
						)}
					</Link>
				))}
				<Link to="/dashboard">
					<Button variant="outline" size="sm">
						← Back to Dashboard
					</Button>
				</Link>
			</nav>

			<Outlet />
		</div>
	);
}
