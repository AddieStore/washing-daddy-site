// Cashfree's native checkout (web checkout inside the app, with UPI apps). The order and its amount come from
// n8n workflow 8 (wd-pay-order); this only opens the payment for that session. onVerify means Cashfree
// finished the flow, not that money cleared: the app still waits for wd-pay-lookup, as on the web.
import { CFPaymentGatewayService, CFErrorResponse } from 'react-native-cashfree-pg-sdk';
import { CFEnvironment, CFSession } from 'cashfree-pg-api-contract';

export const CASHFREE_AVAILABLE = true;
const ENV = process.env.EXPO_PUBLIC_CF_SANDBOX === '1' ? CFEnvironment.SANDBOX : CFEnvironment.PRODUCTION;

export function cashfreeCheckout(paymentSessionId: string, orderId: string): Promise<{ orderId: string }> {
  return new Promise((resolve, reject) => {
    const done = () => { try { CFPaymentGatewayService.removeCallback() } catch (e) {} };
    CFPaymentGatewayService.setCallback({
      onVerify(id: string) { done(); resolve({ orderId: id || orderId }) },
      onError(err: CFErrorResponse, id: string) {
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
