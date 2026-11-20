// Preview: there is no real payment in the browser preview (demo money only).
export const PAYWEB_AVAILABLE = false;
export async function razorpayCheckout(): Promise<never> { throw Object.assign(new Error('payment'), { failed: true }) }
export async function cashfreeWebCheckout(): Promise<never> { throw Object.assign(new Error('payment'), { failed: true }) }
export function PayWebHost() { return null }
