// The payment page opens INSIDE the app, in a full-screen sheet with our own header, never in the browser.
// Razorpay: its standard checkout.js, given the order our server (n8n workflow 13) created. The app only shows it;
// the server checks Razorpay's signature and the payment itself before anything is booked (wd-rzp-confirm).
// Cashfree (backup): Cashfree's JS checkout for a session from the server; it returns to washingdaddy.com/pay/?order_id=…,
// which we catch here instead of loading. UPI apps (upi://, intent://) are handed to Android.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Pressable, ActivityIndicator, Linking, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import { Txt, useInsets } from '../ui/kit';
import { Close } from '../ui/icons';
import type { RzpOpen, RzpDone } from './payweb';

export const PAYWEB_AVAILABLE = true;
const BASE = 'https://washingdaddy.com/';
const CF_MODE = process.env.EXPO_PUBLIC_CF_SANDBOX === '1' ? 'sandbox' : 'production';

type Job = { title: string; html: string; onMsg: (m: any) => void; onReturn?: (url: string) => boolean; onClose: () => void };
let show: ((j: Job | null) => void) | null = null;
let pending: Job | null = null;
const open = (j: Job) => { pending = j; if (show) show(j) };
const shut = () => { pending = null; if (show) show(null) };

const esc = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');
const page = (body: string) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
html,body{margin:0;height:100%;background:#F6F3FF;font-family:sans-serif;color:#1a1a1a}
#m{position:absolute;top:40%;left:24px;right:24px;text-align:center;font-size:15px;color:#555}</style></head>
<body><div id="m">Opening secure payment…</div>${body}</body></html>`;
const post = `function post(o){window.ReactNativeWebView.postMessage(JSON.stringify(o))}`;

export function razorpayCheckout(o: RzpOpen): Promise<RzpDone> {
  return new Promise((resolve, reject) => {
    let settled = false, lastErr = '';
    const end = (f: () => void) => { if (settled) return; settled = true; shut(); f() };
    const opts = { key: o.keyId, order_id: o.orderId, amount: o.amount, currency: o.currency || 'INR', name: o.name || 'Washing Daddy', description: o.description || '',
      prefill: o.prefill || {}, theme: { color: '#5409DA' }, webview_intent: true, retry: { enabled: true } };
    const html = page(`<script src="https://checkout.razorpay.com/v1/checkout.js"></script><script>${post}
(function(){ if(!window.Razorpay){ post({t:'load'}); return; }
var o=${esc(opts)};
o.handler=function(r){ post({t:'ok', r:r}); };
o.modal={ ondismiss:function(){ post({t:'dismiss'}); }, confirm_close:true, escape:false, backdropclose:false };
var p=new Razorpay(o); p.on('payment.failed',function(e){ post({t:'fail', m:(e&&e.error&&(e.error.description||e.error.reason))||''}); });
p.open(); document.getElementById('m').textContent='';
})();</script>`);
    open({ title: 'Razorpay', html,
      onMsg: m => {
        if (m.t === 'ok' && m.r && m.r.razorpay_payment_id) end(() => resolve(m.r));
        else if (m.t === 'fail') lastErr = String(m.m || 'Payment failed');   // Razorpay lets the customer retry; settle on dismiss
        else if (m.t === 'dismiss') end(() => reject(lastErr ? Object.assign(new Error(lastErr), { failed: true }) : Object.assign(new Error('cancelled'), { cancelled: true })));
        else if (m.t === 'load') end(() => reject(Object.assign(new Error("Couldn't load Razorpay"), { failed: true, unavailable: true })));
      },
      onClose: () => end(() => reject(lastErr ? Object.assign(new Error(lastErr), { failed: true }) : Object.assign(new Error('cancelled'), { cancelled: true }))) });
  });
}

export function cashfreeWebCheckout(sessionId: string, orderId: string): Promise<{ orderId: string }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const end = (f: () => void) => { if (settled) return; settled = true; shut(); f() };
    const html = page(`<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script><script>${post}
(function(){ if(!window.Cashfree){ post({t:'load'}); return; }
Cashfree({mode:${esc(CF_MODE)}}).checkout({paymentSessionId:${esc(sessionId)}, redirectTarget:'_self'}).then(function(r){ if(r&&r.error) post({t:'fail', m:r.error.message||''}); });
})();</script>`);
    open({ title: 'Cashfree', html,
      onMsg: m => {
        if (m.t === 'load') end(() => reject(Object.assign(new Error("Couldn't load Cashfree"), { failed: true, unavailable: true })));
        else if (m.t === 'fail') end(() => reject(Object.assign(new Error(String(m.m || 'Payment failed')), { failed: true })));
      },
      // Cashfree finished (paid or not): it goes to our return page. The server's webhook decides what happened.
      onReturn: url => { if (/^https:\/\/(www\.)?washingdaddy\.com\/pay\/?\?/.test(url)) { end(() => resolve({ orderId })); return true } return false },
      onClose: () => end(() => reject(Object.assign(new Error('cancelled'), { cancelled: true }))) });
  });
}

export function PayWebHost() {
  const [job, setJob] = useState<Job | null>(pending), ins = useInsets(), [busy, setBusy] = useState(true), ref = useRef<React.ComponentRef<typeof WebView>>(null);
  useEffect(() => { show = j => { setBusy(true); setJob(j) }; return () => { show = null } }, []);
  // same object while this payment is open: a new source object would reload the page (and reopen the checkout)
  const source = useMemo(() => (job ? { html: job.html, baseUrl: BASE } : null), [job]);
  useEffect(() => {
    if (!job) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { job.onClose(); return true });
    return () => sub.remove();
  }, [job]);
  if (!job) return null;
  return (
    <Modal visible animationType="slide" onRequestClose={() => job.onClose()} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#F6F3FF', paddingTop: ins.top }}>
        <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E7E0FA', backgroundColor: '#fff' }}>
          <Pressable accessibilityLabel="Close payment" onPress={() => job.onClose()} hitSlop={12} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}><Close size={22} color="#1a1a1a" /></Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Txt size={16} weight={700} color="#1a1a1a">Secure payment</Txt>
            <Txt size={12} color="#6b6b6b">Washing Daddy · via {job.title}</Txt>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <WebView ref={ref} style={{ flex: 1, backgroundColor: '#F6F3FF' }}
          source={source!} originWhitelist={['*']} javaScriptEnabled domStorageEnabled thirdPartyCookiesEnabled
          setSupportMultipleWindows={false} onLoadEnd={() => setBusy(false)}
          onMessage={(e: any) => { try { job.onMsg(JSON.parse(e.nativeEvent.data)) } catch (err) {} }}
          onShouldStartLoadWithRequest={(r: any) => {
            const u = r.url || '';
            if (/^(upi|intent|tez|phonepe|paytmmp|gpay|credpay|bhim):/i.test(u)) {
              Linking.openURL(u).catch(() => {}); return false;   // hand UPI to the payment app
            }
            if (job.onReturn && job.onReturn(u)) return false;
            return true;
          }} />
        {busy ? <View pointerEvents="none" style={{ position: 'absolute', top: ins.top + 56, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#5409DA" /></View> : null}
      </View>
    </Modal>
  );
}
