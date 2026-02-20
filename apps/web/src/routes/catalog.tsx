import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

type Category = {
	id: string;
	name: string;
	slug: string;
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

const searchSchema = z.object({
	category: z.string().optional(),
	search: z.string().optional(),
	page: z.number().optional(),
});

export const Route = createFileRoute("/catalog")({
	component: CatalogComponent,
	validateSearch: searchSchema,
});

function CatalogComponent() {
	const { category: categorySlug, search, page = 1 } = Route.useSearch();
	const navigate = Route.useNavigate();

	const [categories, setCategories] = useState<Category[]>([]);
	const [articles, setArticles] = useState<Article[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchInput, setSearchInput] = useState(search || "");

	useEffect(() => {
		api.get<Category[]>("/api/categories").then(setCategories);
	}, []);

	useEffect(() => {
		setLoading(true);
		const params = new URLSearchParams();
		if (categorySlug) params.set("category", categorySlug);
		if (search) params.set("search", search);
		params.set("page", String(page));
		params.set("limit", "20");

		api
			.get<{ articles: Article[] }>(`/api/articles?${params}`)
			.then((data) => setArticles(data.articles))
			.finally(() => setLoading(false));
	}, [categorySlug, search, page]);

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		navigate({
			search: (prev) => ({
				...prev,
				search: searchInput || undefined,
				page: undefined,
			}),
		});
	};

	return (
		<div className="container mx-auto max-w-6xl px-4 py-6">
			<h1 className="mb-4 text-2xl font-bold">Catalog</h1>

			<div className="mb-6 flex flex-col gap-4 sm:flex-row">
				<form
					onSubmit={handleSearch}
					className="flex flex-1 gap-2"
				>
					<Input
						placeholder="Search articles..."
						value={searchInput}
						onChange={(e) =>
							setSearchInput((e.target as HTMLInputElement).value)
						}
						className="flex-1"
					/>
					<Button type="submit" size="sm">
						Search
					</Button>
				</form>

				<div className="flex flex-wrap gap-2">
					<Link to="/catalog" search={{}}>
						<Button
							variant={!categorySlug ? "default" : "outline"}
							size="sm"
						>
							All
						</Button>
					</Link>
					{categories.map((cat) => (
						<Link
							key={cat.id}
							to="/catalog"
							search={{ category: cat.slug }}
						>
							<Button
								variant={
									categorySlug === cat.slug
										? "default"
										: "outline"
								}
								size="sm"
							>
								{cat.name}
							</Button>
						</Link>
					))}
				</div>
			</div>

			{loading ? (
				<p className="text-muted-foreground text-sm">Loading...</p>
			) : articles.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					No articles found.
				</p>
			) : (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
					{articles.map((article) => (
						<Link
							key={article.id}
							to="/article/$slug"
							params={{ slug: article.slug }}
						>
							<Card className="hover:ring-foreground/20 transition-all">
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

			<div className="mt-6 flex justify-center gap-2">
				{page > 1 && (
					<Button
						variant="outline"
						size="sm"
						onClick={() =>
							navigate({
								search: (prev) => ({ ...prev, page: page - 1 }),
							})
						}
					>
						Previous
					</Button>
				)}
				{articles.length === 20 && (
					<Button
						variant="outline"
						size="sm"
						onClick={() =>
							navigate({
								search: (prev) => ({
									...prev,
									page: page + 1,
								}),
							})
						}
					>
						Next
					</Button>
				)}
			</div>
		</div>
	);
}
