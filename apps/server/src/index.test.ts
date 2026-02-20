import { describe, expect, it } from "bun:test";

describe("Server checks", () => {
	it("should pass a basic assertion", () => {
		expect(true).toBe(true);
	});
});

describe("Commission business logic", () => {
	const { calculateCommission, calculateTotal } = require("./utils/commission");

	it("commission should be exactly 5% of total", () => {
		const price = 150;
		const shipping = 10;
		const total = calculateTotal(price, shipping);
		const commission = calculateCommission(total);

		expect(total).toBe(160);
		expect(commission).toBe(8);
	});

	it("commission should be properly rounded for edge cases", () => {
		expect(calculateCommission(19.99)).toBe(1);
		expect(calculateCommission(0.01)).toBe(0);
	});
});
