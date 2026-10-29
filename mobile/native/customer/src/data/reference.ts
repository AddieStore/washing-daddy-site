// Reference data, copied from the web app (customer/index.html). Prices here are only for display:
// the payment server (n8n workflow 8) prices every order itself.

export type PlanId = 'legacy' | 'std' | 'pro' | 'exc' | 'res';
export type Plan = { id: PlanId; name: string; price: number; old?: boolean; f: { int: number; tyre: number; foam: number; det: number }; rows: [string, string][] };

export const PLANS: Plan[] = [
  { id: 'legacy', name: 'Legacy', price: 500, old: true, f: { int: 1, tyre: 0, foam: 0, det: 0 }, rows: [['Pressure wash', 'Daily'], ['Interior', '1× / week'], ['Tyre & trim', '—'], ['Foam wash', '—'], ['Detailing', '—']] },
  { id: 'std', name: 'WD Standard', price: 999, f: { int: 1, tyre: 2, foam: 1, det: 0 }, rows: [['Pressure wash', 'Daily'], ['Interior', '1× / week'], ['Tyre & trim', '2× / week'], ['Foam wash', '1× / week'], ['Detailing', '—']] },
  { id: 'pro', name: 'WD Pro', price: 1800, f: { int: 2, tyre: 7, foam: 2, det: 1 }, rows: [['Pressure wash', 'Daily'], ['Interior', '2× / week'], ['Tyre & trim', 'Daily'], ['Foam wash', '2× / week'], ['Detailing', '1× / month']] },
  { id: 'exc', name: 'WD Exclusive', price: 2500, f: { int: 3, tyre: 7, foam: 4, det: 2 }, rows: [['Pressure wash', 'Daily'], ['Interior', '3× / week'], ['Tyre & trim', 'Daily'], ['Foam wash', '4× / week'], ['Detailing', '2× / month'], ['Car perfume', 'Free, worth ₹499'], ['On-demand wash', '1 a month']] },
  { id: 'res', name: 'WD Reserve', price: 5555, f: { int: 7, tyre: 7, foam: 7, det: 4 }, rows: [['Pressure wash', 'Daily'], ['Interior', 'Daily'], ['Tyre & trim', 'Daily'], ['Foam wash', 'Daily'], ['Detailing', '4× / month'], ['Car perfume', 'Free, worth ₹499'], ['On-demand wash', '5 a month']] },
];

export const AREAS = ['GH-9 Paschim Vihar', 'GH-6 Paschim Vihar', 'GH-14 Paschim Vihar', 'Meera Bagh', 'Sundar Vihar', 'Guru Hari Apartments'];
export const WASHER_FOR = (a: string) => a.startsWith('GH-9') || a.startsWith('GH-6') ? 'Chotte' : 'Shahrukh';

// [lng, lat] for the live tracking map
export const AREA_COORDS: Record<string, [number, number]> = {
  'GH-9 Paschim Vihar': [77.0989, 28.6680],
  'GH-6 Paschim Vihar': [77.0970, 28.6695],
  'GH-14 Paschim Vihar': [77.0982, 28.6705],
  'Meera Bagh': [77.1065, 28.6720],
  'Sundar Vihar': [77.1110, 28.6710],
  'Guru Hari Apartments': [77.0960, 28.6650],
};

export type ArtKind = 'perfume' | 'cloth' | 'bottle' | 'spray' | 'mount' | 'inflator' | 'cover' | 'mats' | 'cam' | 'sparkle';
export type Product = {
  id: string; name: string; cat: string; price: number; mrp: number; art: ArtKind; c: [string, string];
  bg: [string, string]; tag?: string; wide?: boolean; fit?: boolean; desc: string; pts: string[];
};
export const PRODUCTS: Product[] = [
  { id: 'perfume', name: "Daddy's Own Car Perfume", cat: 'Fragrance', price: 499, mrp: 699, art: 'perfume', c: ['#FFBA08', '#FF6A1A'], bg: ['#FFD45C', '#FF6A1A'], tag: 'Drop 01', wide: true, desc: 'Oud and vetiver in a vent clip. Lasts about 45 days in Delhi heat.', pts: ['Clips to any AC vent', 'Refill pods ₹199', 'Free on WD Exclusive and Reserve'] },
  { id: 'micro', name: 'Microfibre Set, 6 pcs', cat: 'Care', price: 349, mrp: 499, art: 'cloth', c: ['#2E8BFF', '#5409DA'], bg: ['#9cc6ff', '#2E8BFF'], desc: 'The same 400 GSM cloths your washer dries your car with.', pts: ['Lint-free, no swirl marks', 'Machine washable', 'Colour-coded: glass, paint, interior'] },
  { id: 'tyre', name: 'Tyre Shine Gel', cat: 'Care', price: 299, mrp: 399, art: 'bottle', c: ['#1A0A33', '#5409DA'], bg: ['#b9a3ff', '#5409DA'], desc: 'Satin black, not greasy. The finish you see after every WD Pro wash.', pts: ["Water-based, won't fling", 'Applicator included', 'About 30 applications'] },
  { id: 'ceramic', name: 'Ceramic Quick Coat', cat: 'Care', price: 899, mrp: 1199, art: 'spray', c: ['#2EE6A6', '#0b7d5b'], bg: ['#b8ffe6', '#2EE6A6'], tag: 'Bestseller', desc: 'Spray-on ceramic layer. Dust slides off, so your daily wash gets faster.', pts: ['3 months of beading', 'Safe on PPF and matte', 'Your washer can apply it for ₹199'] },
  { id: 'mount', name: 'MagSafe Vent Mount', cat: 'Gadgets', price: 1299, mrp: 1799, art: 'mount', c: ['#FFF6E9', '#1A0A33'], bg: ['#fff6e9', '#d9c7ad'], desc: 'Snaps onto the vent, holds the phone in one hand.', pts: ['Fits most vents', '15W wireless charging', 'Works with any phone using the ring'] },
  { id: 'inflator', name: 'Smart Tyre Inflator', cat: 'Gadgets', price: 2499, mrp: 3299, art: 'inflator', c: ['#FF6A1A', '#1A0A33'], bg: ['#ffc29e', '#FF6A1A'], desc: 'Set the PSI, it stops by itself. Charges over USB-C.', pts: ['Shows the right PSI for your car', 'Built-in torch', 'Fills a tyre in about 3 minutes'] },
  { id: 'cover', name: 'Body Cover', cat: 'Protection', price: 1899, mrp: 2499, art: 'cover', c: ['#5409DA', '#FFBA08'], bg: ['#c7a6ff', '#5409DA'], fit: true, desc: 'Custom cut for your car. Keeps neem leaves and bird mess off overnight.', pts: ['Waterproof, breathable', 'Mirror pockets', 'Your washer folds it every morning'] },
  { id: 'mats', name: '7D Floor Mats', cat: 'Protection', price: 3499, mrp: 4999, art: 'mats', c: ['#1A0A33', '#FFBA08'], bg: ['#ffe3a1', '#FFBA08'], fit: true, desc: 'Edge-to-edge mats that catch mud before it reaches the carpet.', pts: ['Cut for your exact model', 'Hose-washable', 'Fitted by your washer'] },
  { id: 'dashcam', name: '4K Dash Cam', cat: 'Gadgets', price: 5999, mrp: 7499, art: 'cam', c: ['#1A0A33', '#2E8BFF'], bg: ['#a9d0ff', '#2E8BFF'], desc: 'Front 4K with a parking guard that records bumps when parked.', pts: ['Wi-Fi to your phone', '128 GB card included', 'Hidden wiring done free'] },
  { id: 'detail', name: 'Full Detailing Session', cat: 'Services', price: 2100, mrp: 2600, art: 'sparkle', c: ['#FFBA08', '#5409DA'], bg: ['#FFBA08', '#5409DA'], tag: 'Service', desc: 'Two hours at your parking spot. Clay bar, polish, wax and a deep interior.', pts: ['Booked into your morning slot', 'Before and after photos', 'Included monthly on WD Pro'] },
];
export const CATS = ['All', 'Care', 'Fragrance', 'Gadgets', 'Protection', 'Services'];

// On-demand washes (Book a wash), priced again server-side
export const SERVICES = [
  { id: 'wash', name: 'WD Wash', price: 199, d: 'Pressure wash, tyre & trim polish, interior cleaning' },
  { id: 'deep', name: 'WD Deep Cleaning', price: 800, d: 'Pressure wash, interior vacuum, tyre polish, foam, glass and wheels' },
  { id: 'exclusive', name: 'WD Exclusive', price: 2100, d: 'Foam, glass, interior vacuum, fender lining, engine bay, ceramic spray, glass coating' },
];

export const SUPPORT_PHONE = '7701808924';
export const SUPPORT_PHONE_SHOW = '77018 08924';

export const SLIDES = [
  { img: 'slide0', t: 'Foam first', s: 'Loosens the dust before anything touches the paint' },
  { img: 'slide1', t: 'Right at your gate', s: 'Washed where it sleeps' },
  { img: 'slide2', t: 'Two on one Thar', s: 'Big cars get both hands' },
  { img: 'slide3', t: 'Even the i8', s: 'Covered parking is no problem' },
  { img: 'slide4', t: 'GH-9 every morning', s: 'Our busiest round' },
  { img: 'slide5', t: 'Wheels too', s: 'Pressure inside the rims' },
  { img: 'slide6', t: 'Same car, one wash', s: 'It never left its spot' },
] as const;
