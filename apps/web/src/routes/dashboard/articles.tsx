import { createFileRoute, Link } from "@tanstack/react-router";
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
	slug: string;
	price: number;
	status: string;
	createdAt: string;
};

export const Route = createFileRoute("/dashboard/articles")({
	component: MyArticles,
});

const statusColors: Record<string, string> = {
	draft: "bg-muted text-muted-foreground",
	pending: "bg-yellow-500/10 text-yellow-600",
	approved: "bg-green-500/10 text-green-600",
	rejected: "bg-red-500/10 text-red-600",
	sold: "bg-blue-500/10 text-blue-600",
};

function MyArticles() {
	const [articles, setArticles] = useState<Article[]>([]);
	const [loading, setLoading] = useState(true);

	const loadArticles = () => {
		setLoading(true);
		api
			.get<Article[]>("/api/articles/seller/my-articles")
			.then(setArticles)
			.finally(() => setLoading(false));
	};

	useEffect(loadArticles, []);

	const handleDelete = async (id: string) => {
		if (!confirm("Are you sure you want to delete this article?")) return;
		try {
			await api.delete(`/api/articles/${id}`);
			toast.success("Article deleted");
			loadArticles();
		} catch (e: any) {
			toast.error(e.message);
		}
	};

	return (
		<div>
			<div className="mb-4 flex items-center justify-between">
				<h2 className="font-semibold text-lg">My Articles</h2>
				<Link to="/dashboard/articles/new">
					<Button size="sm">New Article</Button>
				</Link>
			</div>

			{loading ? (
				<p className="text-muted-foreground text-sm">Loading...</p>
			) : articles.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					You haven't listed any articles yet.
				</p>
			) : (
				<div className="space-y-3">
					{articles.map((article) => (
						<Card key={article.id}>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									{article.title}
									<span
										className={`rounded px-2 py-0.5 text-xs ${statusColors[article.status] || ""}`}
									>
										{article.status}
									</span>
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-sm">{article.price.toFixed(2)} €</p>
							</CardContent>
							<CardFooter className="gap-2">
								<Link
									to="/dashboard/articles/$id/edit"
									params={{ id: article.id }}
								>
									<Button variant="outline" size="sm">
										Edit
									</Button>
								</Link>
								<Button
									variant="destructive"
									size="sm"
									onClick={() => handleDelete(article.id)}
								>
									Delete
								</Button>
							</CardFooter>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
