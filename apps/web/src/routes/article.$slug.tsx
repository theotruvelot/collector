import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { authClient } from "@/lib/auth-client";

type ArticleDetail = {
	id: string;
	title: string;
	slug: string;
	description: string;
	price: number;
	shippingCost: number;
	status: string;
	categoryId: string;
	sellerId: string;
	createdAt: string;
	images: { id: string; url: string; order: number }[];
	seller: { id: string; name: string } | null;
	category: { id: string; name: string; slug: string } | null;
};

export const Route = createFileRoute("/article/$slug")({
	component: ArticleDetailComponent,
});

function ArticleDetailComponent() {
	const { slug } = Route.useParams();
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();
	const [article, setArticle] = useState<ArticleDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [buying, setBuying] = useState(false);
	const [selectedImage, setSelectedImage] = useState(0);

	useEffect(() => {
		api
			.get<ArticleDetail>(`/api/articles/${slug}`)
			.then(setArticle)
			.catch(() => setArticle(null))
			.finally(() => setLoading(false));
	}, [slug]);

	const handleBuy = async () => {
		if (!session) {
			navigate({ to: "/login" });
			return;
		}
		setBuying(true);
		try {
			await api.post("/api/orders", { articleId: article!.id });
			toast.success("Order placed successfully!");
			navigate({ to: "/dashboard/purchases" });
		} catch (e: any) {
			toast.error(e.message);
		} finally {
			setBuying(false);
		}
	};

	if (loading) {
		return (
			<div className="container mx-auto max-w-4xl px-4 py-6">
				<p className="text-muted-foreground text-sm">Loading...</p>
			</div>
		);
	}

	if (!article) {
		return (
			<div className="container mx-auto max-w-4xl px-4 py-6">
				<p>Article not found.</p>
				<Link to="/catalog">
					<Button variant="outline" className="mt-4">
						Back to catalog
					</Button>
				</Link>
			</div>
		);
	}

	const total = article.price + article.shippingCost;

	return (
		<div className="container mx-auto max-w-4xl px-4 py-6">
			<Link to="/catalog">
				<Button variant="ghost" size="sm" className="mb-4">
					← Back to catalog
				</Button>
			</Link>

			<div className="grid gap-6 md:grid-cols-2">
				<div>
					{article.images.length > 0 ? (
						<>
							<img
								src={article.images[selectedImage]?.url}
								alt={article.title}
								className="mb-2 aspect-square w-full object-cover"
							/>
							{article.images.length > 1 && (
								<div className="flex gap-2">
									{article.images.map((img, i) => (
										<button
											key={img.id}
											type="button"
											onClick={() => setSelectedImage(i)}
											className={`h-16 w-16 overflow-hidden border-2 ${
												i === selectedImage
													? "border-primary"
													: "border-transparent"
											}`}
										>
											<img
												src={img.url}
												alt=""
												className="h-full w-full object-cover"
											/>
										</button>
									))}
								</div>
							)}
						</>
					) : (
						<div className="flex aspect-square items-center justify-center bg-muted">
							<span className="text-muted-foreground">No image</span>
						</div>
					)}
				</div>

				<div>
					<Card>
						<CardHeader>
							<CardTitle className="text-xl">{article.title}</CardTitle>
							{article.category && (
								<Link
									to="/catalog"
									search={{
										category: article.category.slug,
									}}
								>
									<span className="text-muted-foreground text-xs hover:underline">
										{article.category.name}
									</span>
								</Link>
							)}
						</CardHeader>
						<CardContent>
							<p className="whitespace-pre-wrap text-sm">
								{article.description}
							</p>

							<div className="mt-4 space-y-1">
								<div className="flex justify-between">
									<span className="text-muted-foreground">Price</span>
									<span className="font-bold">
										{article.price.toFixed(2)} €
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Shipping</span>
									<span>
										{article.shippingCost > 0
											? `${article.shippingCost.toFixed(2)} €`
											: "Free"}
									</span>
								</div>
								<hr />
								<div className="flex justify-between font-bold">
									<span>Total</span>
									<span>{total.toFixed(2)} €</span>
								</div>
							</div>

							{article.seller && (
								<p className="mt-4 text-muted-foreground text-xs">
									Sold by{" "}
									<span className="font-medium text-foreground">
										{article.seller.name}
									</span>
								</p>
							)}
						</CardContent>
						<CardFooter>
							{session?.user.id === article.sellerId ? (
								<Button variant="outline" className="w-full" disabled>
									This is your article
								</Button>
							) : (
								<Button
									className="w-full"
									onClick={handleBuy}
									disabled={buying}
								>
									{buying ? "Processing..." : `Buy for ${total.toFixed(2)} €`}
								</Button>
							)}
						</CardFooter>
					</Card>
				</div>
			</div>
		</div>
	);
}
