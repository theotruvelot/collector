import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";

type Stats = {
	articlesCount: number;
	salesCount: number;
	purchasesCount: number;
};

export const Route = createFileRoute("/dashboard/")({
	component: DashboardOverview,
});

function DashboardOverview() {
	const [stats, setStats] = useState<Stats>({
		articlesCount: 0,
		salesCount: 0,
		purchasesCount: 0,
	});

	useEffect(() => {
		Promise.all([
			api.get<any[]>("/api/articles/seller/my-articles"),
			api.get<any[]>("/api/orders?type=sales"),
			api.get<any[]>("/api/orders?type=purchases"),
		]).then(([articles, sales, purchases]) => {
			setStats({
				articlesCount: articles.length,
				salesCount: sales.length,
				purchasesCount: purchases.length,
			});
		});
	}, []);

	return (
		<div className="grid gap-4 sm:grid-cols-3">
			<Card>
				<CardHeader>
					<CardTitle>My Articles</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-2xl font-bold">{stats.articlesCount}</p>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Sales</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-2xl font-bold">{stats.salesCount}</p>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Purchases</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-2xl font-bold">{stats.purchasesCount}</p>
				</CardContent>
			</Card>
		</div>
	);
}
