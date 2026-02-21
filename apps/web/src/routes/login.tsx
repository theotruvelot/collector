import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { LoginForm } from "@/components/login-form";
import { RegisterForm } from "@/components/register-form";

export const Route = createFileRoute("/login")({
	component: RouteComponent,
});

function RouteComponent() {
	const [showLogin, setShowLogin] = useState(true);

	return (
		<div className="grid h-full lg:grid-cols-2">
			{/* Left decorative panel */}
			<div className="bg-muted relative hidden lg:flex lg:flex-col lg:items-start lg:justify-end lg:p-10">
				<blockquote className="space-y-2">
					<p className="text-muted-foreground text-sm leading-relaxed">
						"Collector helps me keep track of everything I own and love — it's
						an indispensable part of my daily routine."
					</p>
					<footer className="text-xs font-medium">— A happy collector</footer>
				</blockquote>
			</div>

			{/* Right form panel */}
			<div className="flex items-center justify-center p-8">
				<div className="w-full max-w-sm">
					{showLogin ? (
						<LoginForm onSwitchToRegister={() => setShowLogin(false)} />
					) : (
						<RegisterForm onSwitchToLogin={() => setShowLogin(true)} />
					)}
				</div>
			</div>
		</div>
	);
}
