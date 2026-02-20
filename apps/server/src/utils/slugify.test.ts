import { describe, expect, it } from "bun:test";
import { slugify } from "./slugify";

describe("Slugify", () => {
	it("should lowercase the text", () => {
		expect(slugify("Hello World")).toBe("hello-world");
	});

	it("should replace spaces with hyphens", () => {
		expect(slugify("my article title")).toBe("my-article-title");
	});

	it("should remove accents", () => {
		expect(slugify("Figurine dédicacée")).toBe("figurine-dedicacee");
	});

	it("should remove special characters", () => {
		expect(slugify("Baskets Nike (édition limitée)")).toBe(
			"baskets-nike-edition-limitee",
		);
	});

	it("should trim leading and trailing hyphens", () => {
		expect(slugify("  hello  ")).toBe("hello");
	});

	it("should collapse multiple hyphens", () => {
		expect(slugify("a - - b")).toBe("a-b");
	});
});
