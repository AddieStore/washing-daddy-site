// In-app payment pages: payweb.native.tsx on phones (a WebView inside the app), payweb.web.tsx in the preview.
/** One order (orderId, workflow 13) or a monthly autopay mandate (subscriptionId + recurring, workflow 14 wd-sub-create). */
export type RzpOpen = { keyId: string; orderId?: string; subscriptionId?: string; recurring?: boolean; amount?: number; currency?: string; name: string; description: string; prefill: { contact?: string; name?: string } };
/** order: razorpay_order_id; subscription: razorpay_subscription_id. The signature is checked on the server only. */
export type RzpDone = { razorpay_order_id?: string; razorpay_subscription_id?: string; razorpay_payment_id: string; razorpay_signature: string };
/** Razorpay Checkout inside the app. Resolves with what Razorpay hands back; rejects with { cancelled } or { failed, message }. */
export declare function razorpayCheckout(o: RzpOpen): Promise<RzpDone>;
/** Cashfree's checkout inside the app (backup when the native SDK refuses). Resolves when Cashfree returns to our page. */
export declare function cashfreeWebCheckout(sessionId: string, orderId: string): Promise<{ orderId: string }>;
export declare function PayWebHost(): JSX.Element | null;
export declare const PAYWEB_AVAILABLE: boolean;
