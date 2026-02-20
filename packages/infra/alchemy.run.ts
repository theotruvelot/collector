import alchemy from "alchemy";
import { D1Database, Vite, Worker } from "alchemy/cloudflare";
import { CloudflareStateStore } from "alchemy/state";
import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });
config({ path: "../../apps/server/.env" });

const app = await alchemy("collector", {
	stateStore: process.env.CI
		? (scope) => new CloudflareStateStore(scope)
		: undefined,
});

const db = await D1Database("database", {
	migrationsDir: "../../packages/db/src/migrations",
	adopt: true,
});

export const web = await Vite("web", {
	cwd: "../../apps/web",
	assets: "dist",
	adopt: true,
	bindings: {
		VITE_SERVER_URL: alchemy.env.VITE_SERVER_URL!,
	},
});

export const server = await Worker("server", {
	cwd: "../../apps/server",
	entrypoint: "src/index.ts",
	compatibility: "node",
	adopt: true,
	bindings: {
		DB: db,
		CORS_ORIGIN: alchemy.env.CORS_ORIGIN!,
		BETTER_AUTH_SECRET: alchemy.secret.env.BETTER_AUTH_SECRET!,
		BETTER_AUTH_URL: alchemy.env.BETTER_AUTH_URL!,
		POLAR_ACCESS_TOKEN: alchemy.secret.env.POLAR_ACCESS_TOKEN!,
		POLAR_SUCCESS_URL: alchemy.env.POLAR_SUCCESS_URL!,
	},
	dev: {
		port: 3000,
	},
});

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);

await app.finalize();
