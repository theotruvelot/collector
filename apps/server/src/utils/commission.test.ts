import { describe, expect, it } from "bun:test";
import {
	COMMISSION_RATE,
	calculateCommission,
	calculateTotal,
} from "./commission";

describe("Commission calculations", () => {
	it("should have a 5% commission rate", () => {
		expect(COMMISSION_RATE).toBe(0.05);
	});

	it("should calculate commission correctly for a simple amount", () => {
		expect(calculateCommission(100)).toBe(5);
	});

	it("should calculate commission correctly for a decimal amount", () => {
		expect(calculateCommission(49.99)).toBe(2.5);
	});

	it("should round commission to 2 decimal places", () => {
		expect(calculateCommission(33.33)).toBe(1.67);
	});

	it("should return 0 commission for 0 amount", () => {
		expect(calculateCommission(0)).toBe(0);
	});

	it("should calculate total from price and shipping", () => {
		expect(calculateTotal(100, 5)).toBe(105);
	});

	it("should handle free shipping", () => {
		expect(calculateTotal(50, 0)).toBe(50);
	});
});
