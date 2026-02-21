import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRightIcon, PackageSearchIcon, TagIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
	const { data: session } = authClient.useSession();
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
		<div className="flex flex-col">
			{/* ── Hero ─────────────────────────────────────────────── */}
			<section className="relative overflow-hidden border-b px-4 py-16 md:py-24">
				{/* subtle gradient blob */}
				<div
					aria-hidden
					className="bg-primary/10 pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl"
				/>
				<div
					aria-hidden
					className="pointer-events-none absolute right-0 bottom-0 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl"
				/>

				<div className="relative mx-auto max-w-6xl">
					<p className="text-primary mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest">
						<TagIcon className="size-3.5" />
						The collector's marketplace
					</p>
					<h1 className="mb-4 max-w-2xl font-bold text-4xl leading-tight tracking-tight md:text-5xl">
						Buy & sell rare objects,{" "}
						<span className="text-primary">curated with passion</span>
					</h1>
					<p className="text-muted-foreground mb-8 max-w-xl text-base leading-relaxed">
						A peer-to-peer marketplace for collectors. Discover unique pieces,
						connect with passionate sellers, and grow your collection.
					</p>
					<div className="flex flex-wrap gap-3">
						<Link to="/catalog">
							<Button size="lg" className="gap-2">
								Browse catalog
								<ArrowRightIcon className="size-4" />
							</Button>
						</Link>
						{!session && (
							<Link to="/login">
								<Button variant="outline" size="lg">
									Start selling
								</Button>
							</Link>
						)}
						{session && (
							<Link to="/dashboard/articles_.new">
								<Button variant="outline" size="lg">
									List an item
								</Button>
							</Link>
						)}
					</div>
				</div>
			</section>

			{/* ── Main content ─────────────────────────────────────── */}
			<div className="mx-auto w-full max-w-6xl px-4 py-10 space-y-12">

				{/* Categories */}
				<section>
					<div className="mb-5 flex items-center justify-between">
						<h2 className="font-semibold text-sm uppercase tracking-widest text-muted-foreground">
							Browse by category
						</h2>
					</div>

					{loading ? (
						<div className="flex flex-wrap gap-2">
							{Array.from({ length: 6 }).map((_, i) => (
								<Skeleton key={i} className="h-8 w-20" />
							))}
						</div>
					) : categories.length === 0 ? (
						<p className="text-muted-foreground text-sm">No categories yet.</p>
					) : (
						<div className="flex flex-wrap gap-2">
							{categories.map((cat) => (
								<Link key={cat.id} to="/catalog" search={{ category: cat.slug }}>
									<button
										type="button"
										className="border-border hover:border-primary/50 hover:bg-primary/5 hover:text-primary rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors"
									>
										{cat.name}
									</button>
								</Link>
							))}
						</div>
					)}
				</section>

				{/* Recent articles */}
				<section>
					<div className="mb-5 flex items-center justify-between">
						<h2 className="font-semibold text-sm uppercase tracking-widest text-muted-foreground">
							Recent listings
						</h2>
						<Link to="/catalog">
							<Button variant="ghost" size="sm" className="gap-1 text-xs">
								View all
								<ArrowRightIcon className="size-3" />
							</Button>
						</Link>
					</div>

					{loading ? (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
							{Array.from({ length: 8 }).map((_, i) => (
								<div key={i} className="flex flex-col gap-2">
									<Skeleton className="aspect-[4/3] w-full" />
									<Skeleton className="h-4 w-3/4" />
									<Skeleton className="h-4 w-1/3" />
								</div>
							))}
						</div>
					) : articles.length === 0 ? (
						<div className="border-border flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed py-16 text-center">
							<PackageSearchIcon className="text-muted-foreground size-8" />
							<p className="text-muted-foreground text-sm">
								No articles yet. Be the first to sell!
							</p>
							<Link to={session ? "/dashboard/articles_.new" : "/login"}>
								<Button size="sm">List an item</Button>
							</Link>
						</div>
					) : (
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
											{article.shippingCost > 0 && (
												<p className="text-muted-foreground mt-0.5 text-xs">
													+{article.shippingCost.toFixed(2)} € shipping
												</p>
											)}
											{article.shippingCost === 0 && (
												<p className="text-primary mt-0.5 text-xs font-medium">
													Free shipping
												</p>
											)}
										</div>
									</article>
								</Link>
							))}
						</div>
					)}
				</section>
			</div>
		</div>
	);
}
