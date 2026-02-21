import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	PackageSearchIcon,
	SearchIcon,
	XIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
	const inputRef = useRef<HTMLInputElement>(null);

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

	const clearSearch = () => {
		setSearchInput("");
		navigate({
			search: (prev) => ({ ...prev, search: undefined, page: undefined }),
		});
		inputRef.current?.focus();
	};

	const activeCategory = categories.find((c) => c.slug === categorySlug);
	const hasMore = articles.length === 20;

	return (
		<div className="flex flex-col">
			{/* ── Page header ──────────────────────────────────────── */}
			<div className="border-b px-4 py-6">
				<div className="mx-auto max-w-6xl">
					<h1 className="font-bold text-2xl tracking-tight">
						{activeCategory ? activeCategory.name : "All listings"}
					</h1>
					{(search || activeCategory) && (
						<p className="text-muted-foreground mt-1 text-sm">
							{search && (
								<>
									Results for{" "}
									<span className="text-foreground font-medium">
										"{search}"
									</span>
								</>
							)}
							{search && activeCategory && " in "}
							{activeCategory && (
								<span className="text-foreground font-medium">
									{activeCategory.name}
								</span>
							)}
						</p>
					)}
				</div>
			</div>

			{/* ── Sticky filter bar ────────────────────────────────── */}
			<div className="border-border/60 bg-background/90 sticky top-12 z-40 border-b backdrop-blur-sm">
				<div className="mx-auto max-w-6xl px-4 py-3">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						{/* Search */}
						<form onSubmit={handleSearch} className="relative flex-1">
							<SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
							<Input
								ref={inputRef}
								placeholder="Search listings…"
								value={searchInput}
								onChange={(e) =>
									setSearchInput((e.target as HTMLInputElement).value)
								}
								className="pl-8 pr-8 text-sm"
							/>
							{searchInput && (
								<button
									type="button"
									onClick={clearSearch}
									className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 transition-colors"
								>
									<XIcon className="size-3.5" />
								</button>
							)}
						</form>

						{/* Category chips */}
						<div className="flex flex-wrap items-center gap-1.5">
							<Link to="/catalog" search={{}}>
								<button
									type="button"
									className={cn(
										"rounded-sm border px-3 py-1 text-xs font-medium transition-colors",
										!categorySlug
											? "bg-primary text-primary-foreground border-primary"
											: "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
									)}
								>
									All
								</button>
							</Link>
							{categories.map((cat) => (
								<Link
									key={cat.id}
									to="/catalog"
									search={(prev) => ({
										...prev,
										category: cat.slug,
										page: undefined,
									})}
								>
									<button
										type="button"
										className={cn(
											"rounded-sm border px-3 py-1 text-xs font-medium transition-colors",
											categorySlug === cat.slug
												? "bg-primary text-primary-foreground border-primary"
												: "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
										)}
									>
										{cat.name}
									</button>
								</Link>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* ── Results ──────────────────────────────────────────── */}
			<div className="mx-auto w-full max-w-6xl px-4 py-8">
				{loading ? (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
						{Array.from({ length: 12 }).map((_, i) => (
							<div key={i} className="flex flex-col gap-2">
								<Skeleton className="aspect-[4/3] w-full" />
								<Skeleton className="h-4 w-3/4" />
								<Skeleton className="h-4 w-1/3" />
							</div>
						))}
					</div>
				) : articles.length === 0 ? (
					<div className="border-border flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed py-24 text-center">
						<PackageSearchIcon className="text-muted-foreground size-10" />
						<div>
							<p className="font-medium text-sm">No listings found</p>
							<p className="text-muted-foreground mt-1 text-xs">
								{search || categorySlug
									? "Try adjusting your filters."
									: "Be the first to list an item!"}
							</p>
						</div>
						{(search || categorySlug) && (
							<Link to="/catalog" search={{}}>
								<Button size="sm" variant="outline">
									Clear filters
								</Button>
							</Link>
						)}
					</div>
				) : (
					<>
						{/* Count */}
						<p className="text-muted-foreground mb-5 text-xs">
							{articles.length === 20
								? `Page ${page} · 20+ results`
								: `${articles.length} result${articles.length !== 1 ? "s" : ""}`}
						</p>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
							{articles.map((article) => (
								<Link
									key={article.id}
									to="/article/$slug"
									params={{ slug: article.slug }}
									className="group"
								>
									<article className="border-border bg-card overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
										{/* Image */}
										<div className="bg-muted relative aspect-[4/3] overflow-hidden">
											{article.images[0] ? (
												<img
													src={article.images[0].url}
													alt={article.title}
													className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
												/>
											) : (
												<div className="flex h-full items-center justify-center">
													<PackageSearchIcon className="text-muted-foreground/40 size-10" />
												</div>
											)}
											{/* Price badge */}
											<div className="bg-background/90 absolute right-2 bottom-2 px-2 py-0.5 text-xs font-bold backdrop-blur-sm">
												{article.price.toFixed(2)} €
											</div>
										</div>

										{/* Content */}
										<div className="p-3">
											<p className="group-hover:text-primary line-clamp-1 text-sm font-medium transition-colors">
												{article.title}
											</p>
											{article.shippingCost > 0 ? (
												<p className="text-muted-foreground mt-0.5 text-xs">
													+{article.shippingCost.toFixed(2)} € shipping
												</p>
											) : (
												<p className="text-primary mt-0.5 text-xs font-medium">
													Free shipping
												</p>
											)}
										</div>
									</article>
								</Link>
							))}
						</div>

						{/* Pagination */}
						{(page > 1 || hasMore) && (
							<div className="mt-10 flex items-center justify-center gap-2">
								{page > 1 && (
									<Button
										variant="outline"
										size="sm"
										className="gap-1"
										onClick={() =>
											navigate({
												search: (prev) => ({ ...prev, page: page - 1 }),
											})
										}
									>
										<ChevronLeftIcon className="size-3.5" />
										Previous
									</Button>
								)}
								<span className="text-muted-foreground px-2 text-xs">
									Page {page}
								</span>
								{hasMore && (
									<Button
										variant="outline"
										size="sm"
										className="gap-1"
										onClick={() =>
											navigate({
												search: (prev) => ({ ...prev, page: page + 1 }),
											})
										}
									>
										Next
										<ChevronRightIcon className="size-3.5" />
									</Button>
								)}
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}
