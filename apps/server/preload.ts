import { mock } from "bun:test";
mock.module("cloudflare:workers", () => {
	return { default: {}, env: {} };
});
