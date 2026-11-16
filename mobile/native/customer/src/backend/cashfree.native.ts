// Cashfree's native checkout (web checkout inside the app, with UPI apps). The order and its amount come from
// n8n workflow 8 (wd-pay-order); this only opens the payment for that session. onVerify means Cashfree
// finished the flow, not that money cleared: the app still waits for wd-pay-lookup, as on the web.
import { CFPaymentGatewayService, CFErrorResponse } from 'react-native-cashfree-pg-sdk';
import { CFEnvironment, CFSession } from 'cashfree-pg-api-contract';

export const CASHFREE_AVAILABLE = true;
// Must match the server: n8n creates PRODUCTION orders (workflow 8 SANDBOX=false, workflow 13 without WD_CF_SANDBOX=1).
// A session opened in the wrong environment fails with "payment_session_id invalid".
const ENV = process.env.EXPO_PUBLIC_CF_SANDBOX === '1' ? CFEnvironment.SANDBOX : CFEnvironment.PRODUCTION;
export const CASHFREE_ENV: string = ENV;

export function cashfreeCheckout(paymentSessionId: string, orderId: string): Promise<{ orderId: string }> {
  return new Promise((resolve, reject) => {
    // settle once: the SDK can report twice (verify and a late error), and a stale listener must not leak
    let settled = false;
    const done = () => { settled = true; try { CFPaymentGatewayService.removeCallback() } catch (e) {} };
    CFPaymentGatewayService.setCallback({
      onVerify(id: string) { if (settled) return; done(); resolve({ orderId: id || orderId }) },
      onError(err: CFErrorResponse, id: string) {
        if (settled) return;
        done();
        const msg = (err && (err.getMessage?.() || (err as any).message)) || 'payment';
        const code = (err && (err.getCode?.() || (err as any).code)) || '';
        reject(Object.assign(new Error(msg), { cancelled: /cancel/i.test(code + ' ' + msg), orderId: id }));
      },
    });
    try { CFPaymentGatewayService.doWebPayment(new CFSession(paymentSessionId, orderId, ENV)) }
    catch (e) { done(); reject(e) }
  });
}
