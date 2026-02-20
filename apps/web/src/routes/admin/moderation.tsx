import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";

type Article = {
	id: string;
	title: string;
	description: string;
	price: number;
	sellerId: string;
	createdAt: string;
};

export const Route = createFileRoute("/admin/moderation")({
	component: ModerationPage,
});

function ModerationPage() {
	const [articles, setArticles] = useState<Article[]>([]);
	const [loading, setLoading] = useState(true);

	const loadPending = () => {
		setLoading(true);
		api
			.get<Article[]>("/api/articles/admin/pending")
			.then(setArticles)
			.finally(() => setLoading(false));
	};

	useEffect(loadPending, []);

	const moderate = async (id: string, status: "approved" | "rejected") => {
		try {
			await api.put(`/api/articles/admin/${id}/moderate`, { status });
			toast.success(
				status === "approved" ? "Article approved" : "Article rejected",
			);
			loadPending();
		} catch (e: any) {
			toast.error(e.message);
		}
	};

	return (
		<div>
			<h2 className="mb-4 font-semibold text-lg">
				Pending Moderation ({articles.length})
			</h2>

			{loading ? (
				<p className="text-muted-foreground text-sm">Loading...</p>
			) : articles.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					No articles pending review.
				</p>
			) : (
				<div className="space-y-3">
					{articles.map((article) => (
						<Card key={article.id}>
							<CardHeader>
								<CardTitle className="text-sm">{article.title}</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="line-clamp-3 text-xs">{article.description}</p>
								<p className="mt-2 font-bold text-sm">
									{article.price.toFixed(2)} €
								</p>
								<p className="text-muted-foreground text-xs">
									Submitted: {new Date(article.createdAt).toLocaleDateString()}
								</p>
							</CardContent>
							<CardFooter className="gap-2">
								<Button
									size="sm"
									onClick={() => moderate(article.id, "approved")}
								>
									Approve
								</Button>
								<Button
									variant="destructive"
									size="sm"
									onClick={() => moderate(article.id, "rejected")}
								>
									Reject
								</Button>
							</CardFooter>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
