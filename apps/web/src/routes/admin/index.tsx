import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";

export const Route = createFileRoute("/admin/")({
	component: AdminDashboard,
});

function AdminDashboard() {
	const [stats, setStats] = useState({
		categoriesCount: 0,
		pendingCount: 0,
	});

	useEffect(() => {
		Promise.all([
			api.get<any[]>("/api/categories"),
			api.get<any[]>("/api/articles/admin/pending"),
		]).then(([cats, pending]) => {
			setStats({
				categoriesCount: cats.length,
				pendingCount: pending.length,
			});
		});
	}, []);

	return (
		<div className="grid gap-4 sm:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle>Categories</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-2xl font-bold">
						{stats.categoriesCount}
					</p>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Pending Moderation</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-2xl font-bold">{stats.pendingCount}</p>
				</CardContent>
			</Card>
		</div>
	);
}
