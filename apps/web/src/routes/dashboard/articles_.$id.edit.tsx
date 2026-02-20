import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

type Category = {
	id: string;
	name: string;
};

type ArticleFull = {
	id: string;
	title: string;
	description: string;
	price: number;
	shippingCost: number;
	categoryId: string;
	status: string;
	images: { url: string }[];
};

export const Route = createFileRoute("/dashboard/articles_/$id/edit")({
	component: EditArticle,
});

function EditArticle() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const [categories, setCategories] = useState<Category[]>([]);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);

	const [form, setForm] = useState({
		title: "",
		description: "",
		price: "",
		shippingCost: "0",
		categoryId: "",
		images: [""],
	})

	useEffect(() => {
		Promise.all([
			api.get<Category[]>("/api/categories"),
			api.get<ArticleFull[]>("/api/articles/seller/my-articles"),
		]).then(([cats, articles]) => {
			setCategories(cats);
			const article = articles.find((a) => a.id === id);
			if (article) {
				setForm({
					title: article.title,
					description: article.description,
					price: String(article.price),
					shippingCost: String(article.shippingCost),
					categoryId: article.categoryId,
					images: article.images.length
						? article.images.map((img) => img.url)
						: [""],
				})
			}
			setLoading(false);
		})
	}, [id]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		try {
			await api.put(`/api/articles/${id}`, {
				title: form.title,
				description: form.description,
				price: Number.parseFloat(form.price),
				shippingCost: Number.parseFloat(form.shippingCost),
				categoryId: form.categoryId,
				images: form.images.filter((url) => url.trim()),
			})
			toast.success("Article updated!");
			navigate({ to: "/dashboard/articles" });
		} catch (e: any) {
			toast.error(e.message);
		} finally {
			setSubmitting(false);
		}
	}

	if (loading) {
		return <p className="text-muted-foreground text-sm">Loading...</p>;
	}

	return (
		<div className="max-w-2xl">
			<h2 className="mb-4 text-lg font-semibold">Edit Article</h2>

			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<Label htmlFor="title">Title</Label>
					<Input
						id="title"
						required
						value={form.title}
						onChange={(e) =>
							setForm((f) => ({
								...f,
								title: (e.target as HTMLInputElement).value,
							}))
						}
					/>
				</div>

				<div>
					<Label htmlFor="description">Description</Label>
					<textarea
						id="description"
						required
						rows={5}
						className="w-full rounded-none border border-input bg-transparent px-2.5 py-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
						value={form.description}
						onChange={(e) =>
							setForm((f) => ({
								...f,
								description: e.target.value,
							}))
						}
					/>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div>
						<Label htmlFor="price">Price (€)</Label>
						<Input
							id="price"
							type="number"
							step="0.01"
							min="0.01"
							required
							value={form.price}
							onChange={(e) =>
								setForm((f) => ({
									...f,
									price: (e.target as HTMLInputElement).value,
								}))
							}
						/>
					</div>
					<div>
						<Label htmlFor="shipping">Shipping Cost (€)</Label>
						<Input
							id="shipping"
							type="number"
							step="0.01"
							min="0"
							value={form.shippingCost}
							onChange={(e) =>
								setForm((f) => ({
									...f,
									shippingCost: (e.target as HTMLInputElement)
										.value,
								}))
							}
						/>
					</div>
				</div>

				<div>
					<Label htmlFor="category">Category</Label>
					<select
						id="category"
						required
						className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
						value={form.categoryId}
						onChange={(e) =>
							setForm((f) => ({
								...f,
								categoryId: e.target.value,
							}))
						}
					>
						<option value="">Select a category</option>
						{categories.map((cat) => (
							<option key={cat.id} value={cat.id}>
								{cat.name}
							</option>
						))}
					</select>
				</div>

				<div>
					<Label>Images (URLs)</Label>
					{form.images.map((url, i) => (
						<Input
							key={i}
							className="mb-2"
							placeholder="https://..."
							value={url}
							onChange={(e) =>
								setForm((f) => ({
									...f,
									images: f.images.map((img, j) =>
										j === i
											? (e.target as HTMLInputElement)
													.value
											: img,
									),
								}))
							}
						/>
					))}
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() =>
							setForm((f) => ({
								...f,
								images: [...f.images, ""],
							}))
						}
					>
						+ Add image
					</Button>
				</div>

				<Button type="submit" disabled={submitting} className="w-full">
					{submitting ? "Saving..." : "Save Changes"}
				</Button>
			</form>
		</div>
	)
}
