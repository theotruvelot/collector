import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/success")({
	component: SuccessPage,
	validateSearch: (search) => ({
		checkout_id: search.checkout_id as string,
	}),
});

function SuccessPage() {
	const { checkout_id } = useSearch({ from: "/success" });

	return (
		<div className="flex items-center justify-center px-4 py-12">
			<div className="w-full max-w-md text-center">
				<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
					<CheckCircle2 className="h-6 w-6 text-emerald-500" />
				</div>
				<h1 className="text-2xl font-semibold tracking-tight">Payment successful</h1>
				<p className="text-muted-foreground mt-2 text-sm">
					Thank you for your purchase. A confirmation email will be sent shortly.
				</p>
				{checkout_id && (
					<p className="text-muted-foreground mt-3 text-xs">
						Checkout ID: <span className="font-mono">{checkout_id}</span>
					</p>
				)}
				<div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
					<Link to="/dashboard/purchases">
						<Button className="w-full sm:w-auto" size="sm">
							View my purchases
						</Button>
					</Link>
					<Link to="/catalog">
						<Button variant="outline" className="w-full sm:w-auto" size="sm">
							Back to catalog
						</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}
