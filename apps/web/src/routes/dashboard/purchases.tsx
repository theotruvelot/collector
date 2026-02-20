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

type Order = {
	id: string;
	articleId: string;
	amount: number;
	commission: number;
	status: string;
	createdAt: string;
};

export const Route = createFileRoute("/dashboard/purchases")({
	component: PurchasesPage,
});

const statusColors: Record<string, string> = {
	pending: "bg-yellow-500/10 text-yellow-600",
	paid: "bg-green-500/10 text-green-600",
	shipped: "bg-blue-500/10 text-blue-600",
	delivered: "bg-emerald-500/10 text-emerald-600",
	cancelled: "bg-red-500/10 text-red-600",
};

function PurchasesPage() {
	const [orders, setOrders] = useState<Order[]>([]);
	const [loading, setLoading] = useState(true);

	const loadOrders = () => {
		setLoading(true);
		api
			.get<Order[]>("/api/orders?type=purchases")
			.then(setOrders)
			.finally(() => setLoading(false));
	};

	useEffect(loadOrders, []);

	const confirmDelivery = async (id: string) => {
		try {
			await api.put(`/api/orders/${id}/status`, { status: "delivered" });
			toast.success("Delivery confirmed");
			loadOrders();
		} catch (e: any) {
			toast.error(e.message);
		}
	};

	return (
		<div>
			<h2 className="mb-4 font-semibold text-lg">My Purchases</h2>

			{loading ? (
				<p className="text-muted-foreground text-sm">Loading...</p>
			) : orders.length === 0 ? (
				<p className="text-muted-foreground text-sm">No purchases yet.</p>
			) : (
				<div className="space-y-3">
					{orders.map((order) => (
						<Card key={order.id}>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-sm">
									Order #{order.id.slice(0, 8)}
									<span
										className={`rounded px-2 py-0.5 text-xs ${statusColors[order.status] || ""}`}
									>
										{order.status}
									</span>
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-sm">Total: {order.amount.toFixed(2)} €</p>
								<p className="text-muted-foreground text-xs">
									{new Date(order.createdAt).toLocaleDateString()}
								</p>
							</CardContent>
							{order.status === "shipped" && (
								<CardFooter>
									<Button size="sm" onClick={() => confirmDelivery(order.id)}>
										Confirm Delivery
									</Button>
								</CardFooter>
							)}
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
