import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";

type Category = {
	id: string;
	name: string;
	slug: string;
	description: string | null;
};

type Article = {
	id: string;
	title: string;
	slug: string;
	price: number;
	shippingCost: number;
	createdAt: string;
	images: { url: string; order: number }[];
};

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	const [categories, setCategories] = useState<Category[]>([]);
	const [articles, setArticles] = useState<Article[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		Promise.all([
			api.get<Category[]>("/api/categories"),
			api.get<{ articles: Article[] }>("/api/articles?limit=8"),
		])
			.then(([cats, arts]) => {
				setCategories(cats);
				setArticles(arts.articles);
			})
			.finally(() => setLoading(false));
	}, []);

	return (
		<div className="container mx-auto max-w-6xl px-4 py-6">
			<section className="mb-8">
				<h1 className="mb-2 font-bold text-2xl">Collector.shop</h1>
				<p className="text-muted-foreground">
					Marketplace d'objets de collection entre particuliers
				</p>
			</section>

			<section className="mb-8">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="font-semibold text-lg">Categories</h2>
				</div>
				{loading ? (
					<p className="text-muted-foreground text-sm">Loading...</p>
				) : categories.length === 0 ? (
					<p className="text-muted-foreground text-sm">No categories yet.</p>
				) : (
					<div className="flex flex-wrap gap-2">
						{categories.map((cat) => (
							<Link key={cat.id} to="/catalog" search={{ category: cat.slug }}>
								<Button variant="outline" size="sm">
									{cat.name}
								</Button>
							</Link>
						))}
					</div>
				)}
			</section>

			<section>
				<div className="mb-4 flex items-center justify-between">
					<h2 className="font-semibold text-lg">Recent Articles</h2>
					<Link to="/catalog">
						<Button variant="ghost" size="sm">
							View all
						</Button>
					</Link>
				</div>
				{loading ? (
					<p className="text-muted-foreground text-sm">Loading...</p>
				) : articles.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						No articles yet. Be the first to sell!
					</p>
				) : (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
						{articles.map((article) => (
							<Link
								key={article.id}
								to="/article/$slug"
								params={{ slug: article.slug }}
							>
								<Card className="transition-all hover:ring-foreground/20">
									{article.images[0] && (
										<img
											src={article.images[0].url}
											alt={article.title}
											className="h-40 w-full object-cover"
										/>
									)}
									<CardHeader>
										<CardTitle className="line-clamp-1">
											{article.title}
										</CardTitle>
									</CardHeader>
									<CardFooter className="justify-between">
										<span className="font-bold">
											{article.price.toFixed(2)} €
										</span>
										{article.shippingCost > 0 && (
											<span className="text-muted-foreground text-xs">
												+{article.shippingCost.toFixed(2)} € shipping
											</span>
										)}
									</CardFooter>
								</Card>
							</Link>
						))}
					</div>
				)}
			</section>
		</div>
	);
}
