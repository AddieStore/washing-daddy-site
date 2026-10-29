// The preview never takes money.
export const CASHFREE_AVAILABLE = false;
export async function cashfreeCheckout(_sid: string, _orderId: string): Promise<{ orderId: string }> { throw new Error('payment') }
