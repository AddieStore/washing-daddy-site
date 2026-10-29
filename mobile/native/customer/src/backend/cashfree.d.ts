// Types for the platform files: cashfree.native.ts on phones, cashfree.web.ts in the preview.
export type CheckoutResult = { orderId: string };
export declare function cashfreeCheckout(paymentSessionId: string, orderId: string): Promise<CheckoutResult>;
export declare const CASHFREE_AVAILABLE: boolean;
