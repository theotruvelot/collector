export const COMMISSION_RATE = 0.05;

export function calculateCommission(amount: number): number {
	return Math.round(amount * COMMISSION_RATE * 100) / 100;
}

export function calculateTotal(price: number, shippingCost: number): number {
	return price + shippingCost;
}
