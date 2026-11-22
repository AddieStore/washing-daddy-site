// Shapes for the Pronto layer (addresses, wallet, refunds, pass, referral, bookings with ratings) and the demo data the
// preview and the test login (98765 04210 / 1234) start with. Real accounts fill the same shapes from Firestore
// (read-only money docs written by n8n) - see state.ts "PRONTO LAYER" and pronto-video-2026-11-15/CONTRACT.md.
import type { AddressLabel, CartMode, VariantId } from './reference';
import { TODAY, iso, addDays } from './dates';

export type Receiver = { self: true } | { self: false; name: string; phone: string };
export type Address = {
  id: string; label: AddressLabel; other?: string;   // other: the name typed when label is 'Other'
  flat: string;      // "Complete address*": flat / house no., floor, building
  street: string;    // street / society / landmark
  area: string;      // locality line from the map, e.g. "GH-9, Paschim Vihar, New Delhi"
  lat: number; lng: number; receiver: Receiver; at?: string;
};

export type LedgerKind = 'topup' | 'cashback' | 'gift' | 'referral' | 'promo' | 'payment' | 'refund' | 'expiry';
export type LedgerRow = { id: string; at: string; kind: LedgerKind; amt: number; note: string; bucket: 'cash' | 'promo'; expires?: string | null };
export type Wallet = { cash: number; promo: number; ledger: LedgerRow[] };

export type RefundStatus = 'initiated' | 'processing' | 'credited' | 'failed';
export type Refund = { id: string; at: string; amt: number; status: RefundStatus; to: 'wallet' | 'source'; what: string; bookingId?: string; eta?: string };

export type PassHold = { id: string; plan: string; visitsTotal: number; visitsLeft: number; boughtAt: string; validTill: string; status: 'active' | 'expired' | 'used' };

export type ReferralRow = { id: string; at: string; friend: string; amt: number; status: 'pending' | 'credited' };
export type ReferralState = { completed: number; earned: number; pending: number; ledger: ReferralRow[] };

export type JobLine = { key: string; id: string; name: string; q: number; price: number; mrp: number; mins: number; variant?: VariantId };
export type JobStatus = 'upcoming' | 'assigned' | 'on_the_way' | 'in_progress' | 'done' | 'cancelled';
export type Washer = { id?: string; phone?: string | null; name: string; rating: number; jobs: number; photo?: string | null };
export type Job = {
  id: string; mode: CartMode; status: JobStatus; date: string; slot: string; lines: JobLine[];
  total: number; saved: number; mins: number; addressId?: string; recur?: string;
  pay: 'paid' | 'pay_on_arrival' | 'refunded' | 'pass' | 'pending' | 'failed' | 'cancelled'; payVia?: string; coupon?: string | null;
  payRef?: string;      // gateway payment id (Razorpay pay_..., Cashfree cf_payment_id) or our order id
  orderId?: string;     // our payorders id (WD...), shown as the booking reference until the server gives a booking id
  eta?: string;         // instant: when the washer should reach the car (ISO, IST); 15 min within 1 km
  washerAt?: { lat: number; lng: number; at: string };   // live washer position while on the way (WD Partner, every ~30 s)
  carAt?: { lat: number; lng: number };                  // where the car is parked
  washer?: Washer | null; stars?: number; review?: string; createdAt: string;
};

/** Per-account Pronto data kept on the phone (S.px). Real accounts: refreshed from Firestore; demo: edited locally. */
export type PX = {
  addresses: Address[]; addrId: string | null; wallet: Wallet; refunds: Refund[]; passes: PassHold[];
  referral: ReferralState; jobs: Job[]; usedCoupons: string[]; deletion?: { at: string; status: 'requested' } | null;
  attempts?: Job[];   // bookings whose payment was cancelled or failed: kept on the phone so Bookings shows them
};
export const emptyPX = (): PX => ({ addresses: [], addrId: null, wallet: { cash: 0, promo: 0, ledger: [] }, refunds: [], passes: [], referral: { completed: 0, earned: 0, pending: 0, ledger: [] }, jobs: [], usedCoupons: [], deletion: null });

const at = (days: number, hm = '10:15') => iso(addDays(TODAY, days)) + 'T' + hm + ':00+05:30';
export function demoPX(): PX {
  return {
    addresses: [
      { id: 'a1', label: 'Home', flat: 'House 212, ground floor', street: 'GH-9, near the neem tree', area: 'GH-9, Paschim Vihar, New Delhi', lat: 28.6680, lng: 77.0989, receiver: { self: true } },
      { id: 'a2', label: 'Parents', flat: 'B-14, second floor', street: 'Meera Bagh main road', area: 'Meera Bagh, New Delhi', lat: 28.6720, lng: 77.1065, receiver: { self: false, name: 'Sunita Malhotra', phone: '9811000000' } },
    ],
    addrId: 'a1',
    wallet: { cash: 250, promo: 52.5, ledger: [
      { id: 'l4', at: at(-2), kind: 'payment', amt: -149, note: 'Exterior Pressure Wash', bucket: 'cash' },
      { id: 'l3', at: at(-5), kind: 'referral', amt: 40, note: 'Referral reward · Rohit', bucket: 'promo', expires: iso(addDays(TODAY, 10)) },
      { id: 'l2', at: at(-9), kind: 'cashback', amt: 12.5, note: '5% cashback on top-up', bucket: 'promo', expires: iso(addDays(TODAY, 6)) },
      { id: 'l1', at: at(-9), kind: 'topup', amt: 399, note: 'Added to wallet', bucket: 'cash', expires: iso(addDays(TODAY, 356)) },
    ] },
    refunds: [{ id: 'RF1029', at: at(-12), amt: 249, status: 'credited', to: 'wallet', what: 'Foam Wash · cancelled', bookingId: 'j0' }],
    passes: [],
    referral: { completed: 2, earned: 200, pending: 1, ledger: [
      { id: 'r3', at: at(-1), friend: 'Kunal', amt: 100, status: 'pending' },
      { id: 'r2', at: at(-5), friend: 'Rohit', amt: 100, status: 'credited' },
      { id: 'r1', at: at(-20), friend: 'Neha', amt: 100, status: 'credited' },
    ] },
    jobs: [
      { id: 'j2', mode: 'scheduled', status: 'upcoming', date: iso(addDays(TODAY, 2)), slot: '09:00', addressId: 'a1', total: 293.55, saved: 150, mins: 55, pay: 'paid', payVia: 'UPI', createdAt: at(-1),
        lines: [{ key: 'foam', id: 'foam', name: 'Foam Wash', q: 1, price: 249, mrp: 399, mins: 35 }], washer: null },
      { id: 'j1', mode: 'instant', status: 'done', date: iso(addDays(TODAY, -2)), slot: '', addressId: 'a1', total: 156.45, saved: 100, mins: 25, pay: 'paid', payVia: 'WD Money', createdAt: at(-2, '08:40'),
        lines: [{ key: 'ext', id: 'ext', name: 'Exterior Pressure Wash', q: 1, price: 149, mrp: 249, mins: 25 }], washer: { name: 'Chotte', rating: 4.8, jobs: 312 }, stars: 5 },
      { id: 'j0', mode: 'scheduled', status: 'done', date: iso(addDays(TODAY, -9)), slot: '17:30', addressId: 'a1', total: 470.4, saved: 300, mins: 65, pay: 'paid', payVia: 'UPI', createdAt: at(-10),
        lines: [{ key: 'int', id: 'int', name: 'Interior Cleaning', q: 1, price: 199, mrp: 299, mins: 30 }, { key: 'vac', id: 'vac', name: 'Vacuum Service', q: 1, price: 149, mrp: 249, mins: 20 }, { key: 'tyre', id: 'tyre', name: 'Tyre & Rim Polish', q: 1, price: 99, mrp: 149, mins: 15 }],
        washer: { name: 'Shahrukh', rating: 4.6, jobs: 188 } },
    ],
    usedCoupons: [], deletion: null,
  };
}
