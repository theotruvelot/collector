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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

type Category = {
	id: string;
	name: string;
	slug: string;
	description: string | null;
};

export const Route = createFileRoute("/admin/categories")({
	component: AdminCategories,
});

function AdminCategories() {
	const [categories, setCategories] = useState<Category[]>([]);
	const [loading, setLoading] = useState(true);
	const [showForm, setShowForm] = useState(false);
	const [form, setForm] = useState({ name: "", slug: "", description: "" });
	const [submitting, setSubmitting] = useState(false);

	const loadCategories = () => {
		setLoading(true);
		api
			.get<Category[]>("/api/categories")
			.then(setCategories)
			.finally(() => setLoading(false));
	};

	useEffect(loadCategories, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		try {
			await api.post("/api/categories", {
				name: form.name,
				slug: form.slug,
				description: form.description || undefined,
			});
			toast.success("Category created");
			setForm({ name: "", slug: "", description: "" });
			setShowForm(false);
			loadCategories();
		} catch (e: any) {
			toast.error(e.message);
		} finally {
			setSubmitting(false);
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this category?")) return;
		try {
			await api.delete(`/api/categories/${id}`);
			toast.success("Category deleted");
			loadCategories();
		} catch (e: any) {
			toast.error(e.message);
		}
	};

	const slugify = (text: string) =>
		text
			.toLowerCase()
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/(^-|-$)/g, "");

	return (
		<div>
			<div className="mb-4 flex items-center justify-between">
				<h2 className="font-semibold text-lg">Categories</h2>
				<Button size="sm" onClick={() => setShowForm(!showForm)}>
					{showForm ? "Cancel" : "New Category"}
				</Button>
			</div>

			{showForm && (
				<Card className="mb-4">
					<form onSubmit={handleSubmit}>
						<CardContent className="space-y-3 pt-4">
							<div>
								<Label htmlFor="name">Name</Label>
								<Input
									id="name"
									required
									value={form.name}
									onChange={(e) => {
										const name = (e.target as HTMLInputElement).value;
										setForm((f) => ({
											...f,
											name,
											slug: slugify(name),
										}));
									}}
								/>
							</div>
							<div>
								<Label htmlFor="slug">Slug</Label>
								<Input
									id="slug"
									required
									value={form.slug}
									onChange={(e) =>
										setForm((f) => ({
											...f,
											slug: (e.target as HTMLInputElement).value,
										}))
									}
								/>
							</div>
							<div>
								<Label htmlFor="desc">Description</Label>
								<Input
									id="desc"
									value={form.description}
									onChange={(e) =>
										setForm((f) => ({
											...f,
											description: (e.target as HTMLInputElement).value,
										}))
									}
								/>
							</div>
						</CardContent>
						<CardFooter>
							<Button type="submit" disabled={submitting}>
								{submitting ? "Creating..." : "Create"}
							</Button>
						</CardFooter>
					</form>
				</Card>
			)}

			{loading ? (
				<p className="text-muted-foreground text-sm">Loading...</p>
			) : categories.length === 0 ? (
				<p className="text-muted-foreground text-sm">No categories yet.</p>
			) : (
				<div className="space-y-2">
					{categories.map((cat) => (
						<Card key={cat.id}>
							<CardHeader>
								<CardTitle className="text-sm">
									{cat.name}
									<span className="ml-2 font-normal text-muted-foreground">
										/{cat.slug}
									</span>
								</CardTitle>
							</CardHeader>
							{cat.description && (
								<CardContent>
									<p className="text-muted-foreground text-xs">
										{cat.description}
									</p>
								</CardContent>
							)}
							<CardFooter>
								<Button
									variant="destructive"
									size="sm"
									onClick={() => handleDelete(cat.id)}
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
