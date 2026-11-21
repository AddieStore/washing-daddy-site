// Reference data, copied from the web app (customer/index.html). Prices here are only for display:
// the payment server (n8n workflow 8) prices every order itself.
// LIVE: the tables below (catalogue, packs, store, plans, pass, coupons, fees, slots, referral amounts) are the BUILT-IN
// content. data/config.ts replaces their contents in place with the admin dashboard's Firestore docs (appcfg, catalog, ...)
// as they arrive, so every reader sees the live values; the built-in copy is kept in data/builtin.ts for the offline
// fallback and the seed script. Treat them as read-only outside config.ts.
export type LiveStatus = 'live' | 'paused' | 'hidden';
export type ArtSpec = { key?: string; icon?: string; tint?: string; accent?: string };

export type PlanId = 'legacy' | 'std' | 'pro' | 'exc' | 'res';
export type Plan = { id: PlanId; name: string; price: number; old?: boolean; status?: LiveStatus; f: { int: number; tyre: number; foam: number; det: number; fm?: number }; rows: [string, string][] };

export const PLANS: Plan[] = [
  { id: 'legacy', name: 'Legacy', price: 500, old: true, f: { int: 1, tyre: 0, foam: 0, det: 0 }, rows: [['Pressure wash', 'Daily'], ['Interior', '1× / week'], ['Tyre & trim', '—'], ['Foam wash', '—'], ['Detailing', '—']] },
  { id: 'std', name: 'WD Standard', price: 999, f: { int: 1, tyre: 2, foam: 0, det: 0, fm: 1 }, rows: [['Pressure wash', 'Daily'], ['Interior', '1× / week'], ['Tyre & trim', '2× / week'], ['Foam wash', '1× / month'], ['Detailing', '—']] },
  { id: 'pro', name: 'WD Pro', price: 1800, f: { int: 2, tyre: 7, foam: 2, det: 1 }, rows: [['Pressure wash', 'Daily'], ['Interior', '2× / week'], ['Tyre & trim', 'Daily'], ['Foam wash', '2× / week'], ['Detailing', '1× / month']] },
  { id: 'exc', name: 'WD Exclusive', price: 2500, f: { int: 3, tyre: 7, foam: 4, det: 2 }, rows: [['Pressure wash', 'Daily'], ['Interior', '3× / week'], ['Tyre & trim', 'Daily'], ['Foam wash', '4× / week'], ['Detailing', '2× / month'], ['Car perfume', 'Free, worth ₹499'], ['On-demand wash', '1 a month']] },
  { id: 'res', name: 'WD Reserve', price: 5555, f: { int: 7, tyre: 7, foam: 7, det: 4 }, rows: [['Pressure wash', 'Daily'], ['Interior', 'Daily'], ['Tyre & trim', 'Daily'], ['Foam wash', 'Daily'], ['Detailing', '4× / month'], ['Car perfume', 'Free, worth ₹499'], ['On-demand wash', '5 a month']] },
];

// Plans that new customers and new cars can no longer pick. Existing cars on them keep their plan. Flip here to sell them again.
export const HIDDEN_FROM_NEW: PlanId[] = ['legacy'];   // new customers always see the four plans: Standard, Pro, Exclusive, Reserve
export const sellablePlans = (): Plan[] => PLANS.filter(p => !HIDDEN_FROM_NEW.includes(p.id));
export const DEFAULT_PLAN: PlanId = 'pro';
export const fromPrice = (): number => Math.min(...sellablePlans().map(p => p.price));

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
  status?: LiveStatus; pausedNote?: string;
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
export const CATS: string[] = ['All', 'Care', 'Fragrance', 'Gadgets', 'Protection', 'Services'];

// On-demand washes (Book a wash), priced again server-side
export const SERVICES: { id: string; name: string; price: number; d: string }[] = [
  { id: 'wash', name: 'WD Wash', price: 199, d: 'Pressure wash, tyre & trim polish, interior cleaning' },
  { id: 'deep', name: 'WD Deep Cleaning', price: 800, d: 'Pressure wash, interior vacuum, tyre polish, foam, glass and wheels' },
  { id: 'exclusive', name: 'WD Exclusive', price: 2100, d: 'Foam, glass, interior vacuum, fender lining, engine bay, ceramic spray, glass coating' },
];

export const SUPPORT_PHONE = '7701808924';
export const SUPPORT_PHONE_SHOW = '77018 08924';
/** live support numbers (appcfg/customer.support), written by config.ts */
export const SUPPORT = { whatsapp: SUPPORT_PHONE, phone: SUPPORT_PHONE, email: 'hello@washingdaddy.com' };
export const showPhone = (p: string) => p.replace(/^(\d{5})(\d{5})$/, '$1 $2');

export const SLIDES = [
  { img: 'slide0', t: 'Foam first', s: 'Loosens the dust before anything touches the paint' },
  { img: 'slide1', t: 'Right at your gate', s: 'Washed where it sleeps' },
  { img: 'slide2', t: 'Two on one Thar', s: 'Big cars get both hands' },
  { img: 'slide3', t: 'Even the i8', s: 'Covered parking is no problem' },
  { img: 'slide4', t: 'GH-9 every morning', s: 'Our busiest round' },
  { img: 'slide5', t: 'Wheels too', s: 'Pressure inside the rims' },
  { img: 'slide6', t: 'Same car, one wash', s: 'It never left its spot' },
] as const;

// A la carte car services for the Home grid ("All car wash services") and the service page.
// PLACEHOLDER prices/ratings until Ravi confirms them. Only the three SERVICES above (wash/deep/exclusive) are priced
// by n8n, so only those are paid online; these book with pay-on-arrival (see act.bookServices).
export type CarService = {
  id: string; name: string; short: string; price: number; mrp: number; mins: number; rating: number; count: string;
  img: string; tint: string; cat: string; blurb: string;
  steps: [string, string][]; included: string[]; excluded: string[];
  // live-config extras (catalog/{id}); absent on the built-in rows
  status?: LiveStatus; pausedNote?: string; art?: ArtSpec; photo?: string; variants?: Partial<Record<VariantId, number>>; faqs?: [string, string][]; badge?: string;
};
export const CAR_SERVICES: CarService[] = [
  { id: 'ext', name: 'Exterior Pressure Wash', short: 'Exterior Wash', price: 149, mrp: 249, mins: 25, rating: 4.9, count: '12.4k', img: 'r3d-ext', tint: '#EEF0FF', cat: 'Exterior',
    blurb: 'Roof to rims with a pressure gun. No cloth on dry dust, no pocha.',
    steps: [['Rinse', 'High pressure loosens the dust first'], ['Wash', 'Body, glass and wheel arches'], ['Dry', 'Microfibre dry, no water spots']],
    included: ['Body and roof', 'Glass and mirrors', 'Wheel arches and rims'], excluded: ['Interior cleaning', 'Engine bay', 'Tar or paint stain removal'] },
  { id: 'foam', name: 'Foam Wash', short: 'Foam Wash', price: 249, mrp: 399, mins: 35, rating: 4.9, count: '8.1k', img: 'r3d-foam', tint: '#F3ECFF', cat: 'Exterior',
    blurb: 'Snow foam lifts grit off the paint before anything touches it.',
    steps: [['Pre-rinse', 'Pressure rinse to drop loose dirt'], ['Snow foam', 'Thick foam sits for 3 minutes'], ['Rinse and dry', 'Rinsed off, dried by hand']],
    included: ['Full body foam', 'Pressure rinse', 'Hand dry'], excluded: ['Interior', 'Polish or wax'] },
  { id: 'int', name: 'Interior Cleaning', short: 'Interior Cleaning', price: 199, mrp: 299, mins: 30, rating: 4.8, count: '6.7k', img: 'r3d-int', tint: '#FFF4DC', cat: 'Interior',
    blurb: 'Dashboard, doors, console and mats wiped and dusted.',
    steps: [['Declutter', 'Mats out, loose things kept aside'], ['Wipe down', 'Dash, doors, console, steering'], ['Finish', 'Mats back in, glass from inside']],
    included: ['Dashboard and console', 'Door pads', 'Inside glass', 'Floor mats'], excluded: ['Seat shampoo', 'Roof liner'] },
  { id: 'vac', name: 'Vacuum Service', short: 'Vacuum', price: 149, mrp: 249, mins: 20, rating: 4.8, count: '5.2k', img: 'r3d-vac', tint: '#E8F6FF', cat: 'Interior',
    blurb: 'Seats, floor, boot and every corner vacuumed.',
    steps: [['Mats out', 'Mats shaken and vacuumed'], ['Vacuum', 'Seats, floor, under seats, boot'], ['Crevices', 'Narrow nozzle for the gaps']],
    included: ['Seats and floor', 'Under the seats', 'Boot'], excluded: ['Shampoo', 'Stain removal'] },
  { id: 'engine', name: 'Engine Bay Cleaning', short: 'Engine Bay', price: 299, mrp: 499, mins: 30, rating: 4.8, count: '2.3k', img: 'r3d-engine', tint: '#EDEDF2', cat: 'Care',
    blurb: 'Degreased and dressed safely, electricals covered first.',
    steps: [['Cover', 'Battery and electricals covered'], ['Degrease', 'Safe degreaser and soft brush'], ['Dress', 'Low-pressure rinse and plastic dressing']],
    included: ['Degreasing', 'Plastic dressing'], excluded: ['Engine repairs', 'Under-chassis wash'] },
  { id: 'tyre', name: 'Tyre & Rim Polish', short: 'Tyre & Rim', price: 99, mrp: 149, mins: 15, rating: 4.9, count: '9.8k', img: 'r3d-tyre', tint: '#F1F1F5', cat: 'Exterior',
    blurb: 'Brake dust off the rims, satin black shine on the tyres.',
    steps: [['Rim clean', 'Brake dust cleaner and brush'], ['Tyre gel', 'Satin, not greasy']],
    included: ['4 rims', '4 tyres'], excluded: ['Puncture repair', 'Alignment'] },
  { id: 'glass', name: 'Glass & Windshield', short: 'Glass Care', price: 99, mrp: 149, mins: 15, rating: 4.8, count: '3.9k', img: 'r3d-glass', tint: '#EAF3FF', cat: 'Exterior',
    blurb: 'Streak-free glass inside and out, wipers cleaned.',
    steps: [['Clean', 'Glass cleaner on every window'], ['Buff', 'Streak-free microfibre buff']],
    included: ['All windows', 'Mirrors', 'Wiper blades'], excluded: ['Chip repair'] },
  { id: 'dash', name: 'Dashboard Polish', short: 'Dash Polish', price: 129, mrp: 199, mins: 15, rating: 4.7, count: '2.8k', img: 'r3d-dash', tint: '#FFF0E8', cat: 'Interior',
    blurb: 'Matte, UV-safe dressing that does not shine in your eyes.',
    steps: [['Dust', 'Vents and screen dusted'], ['Polish', 'Matte UV dressing']],
    included: ['Dashboard', 'Console', 'Door trims'], excluded: ['Leather conditioning'] },
  { id: 'seat', name: 'Seat Shampoo', short: 'Seat Shampoo', price: 699, mrp: 999, mins: 60, rating: 4.8, count: '1.6k', img: 'r3d-seat', tint: '#FFECEE', cat: 'Interior',
    blurb: 'Fabric seats shampooed and extracted. Dry in about 3 hours.',
    steps: [['Vacuum', 'Loose dirt out first'], ['Shampoo', 'Foam scrub, seat by seat'], ['Extract', 'Wet vacuum pulls the dirt out']],
    included: ['All fabric seats', 'Stain spot treatment'], excluded: ['Leather seats', 'Roof liner'] },
  { id: 'odour', name: 'Odour Removal', short: 'Odour Removal', price: 249, mrp: 349, mins: 20, rating: 4.7, count: '1.2k', img: 'r3d-odour', tint: '#EFFAF4', cat: 'Interior',
    blurb: 'AC vents and cabin treated so the smell stays gone.',
    steps: [['Find it', 'Mats and boot checked first'], ['Treat', 'Cabin and AC vent treatment']],
    included: ['Cabin treatment', 'AC vents'], excluded: ['AC servicing'] },
  { id: 'ceramic', name: 'Ceramic Spray Coat', short: 'Ceramic Coat', price: 499, mrp: 799, mins: 40, rating: 4.9, count: '2.1k', img: 'r3d-ceramic', tint: '#F3ECFF', cat: 'Care',
    blurb: 'Spray ceramic layer. Dust slides off for about 3 months.',
    steps: [['Wash', 'Clean, dry paint first'], ['Coat', 'Panel by panel spray and buff']],
    included: ['Full body', 'Glass coat'], excluded: ['Paint correction'] },
  { id: 'under', name: 'Underbody Wash', short: 'Underbody', price: 199, mrp: 299, mins: 20, rating: 4.7, count: '1.4k', img: 'r3d-under', tint: '#EEF0FF', cat: 'Care',
    blurb: 'Mud and road salt blasted out from under the car.',
    steps: [['Blast', 'Pressure lance under the car'], ['Arches', 'Wheel arches flushed']],
    included: ['Underbody', 'Wheel arches'], excluded: ['Anti-rust coating'] },
  { id: 'wax', name: 'Hand Wax Polish', short: 'Wax Polish', price: 599, mrp: 899, mins: 45, rating: 4.8, count: '1.9k', img: 'r3d-ceramic', tint: '#FFF4DC', cat: 'Exterior',
    blurb: 'Carnauba wax by hand for a deep shine and water beading.',
    steps: [['Wash', 'Clean, dry paint first'], ['Wax', 'Thin even coat, panel by panel'], ['Buff', 'Hand buffed to a gloss']],
    included: ['Full body', 'Door jambs wiped'], excluded: ['Paint correction', 'Scratch removal'] },
  { id: 'headlight', name: 'Headlight Restoration', short: 'Headlight Polish', price: 399, mrp: 599, mins: 30, rating: 4.7, count: '1.1k', img: 'r3d-glass', tint: '#EAF3FF', cat: 'Exterior',
    blurb: 'Yellow, foggy headlights sanded and polished clear again.',
    steps: [['Mask', 'Paint around the lamp taped'], ['Sand', 'Fine wet sanding removes haze'], ['Polish', 'Polished and UV sealed']],
    included: ['Both headlights'], excluded: ['Lamp replacement', 'Internal moisture fix'] },
  { id: 'trim', name: 'Bumper & Trim Restore', short: 'Trim Restore', price: 249, mrp: 399, mins: 20, rating: 4.7, count: '1.3k', img: 'r3d-tyre', tint: '#F1F1F5', cat: 'Exterior',
    blurb: 'Faded black plastics dressed back to a deep satin black.',
    steps: [['Clean', 'Degrease bumpers and trims'], ['Dress', 'Restorer applied by hand']],
    included: ['Bumpers', 'Side cladding', 'Mirror caps'], excluded: ['Paint repair'] },
  { id: 'alloy', name: 'Alloy Wheel Deep Clean', short: 'Alloy Clean', price: 299, mrp: 449, mins: 25, rating: 4.8, count: '2.0k', img: 'r3d-tyre', tint: '#F1F1F5', cat: 'Exterior',
    blurb: 'Iron-fallout and brake dust lifted from every spoke.',
    steps: [['Spray', 'Iron remover on cold wheels'], ['Agitate', 'Soft brush into the barrels'], ['Rinse', 'Rinsed and dried']],
    included: ['4 wheels'], excluded: ['Wheel refurbishing', 'Dent repair'] },
  { id: 'roof', name: 'Roof & Sunroof Clean', short: 'Roof Clean', price: 149, mrp: 249, mins: 15, rating: 4.7, count: '0.9k', img: 'r3d-ext', tint: '#EEF0FF', cat: 'Exterior',
    blurb: 'Roof, rails and sunroof channels cleaned and drained.',
    steps: [['Wipe', 'Roof and rails'], ['Channels', 'Sunroof drain channels cleared']],
    included: ['Roof', 'Roof rails', 'Sunroof seals'], excluded: ['Sunroof repair'] },
  { id: 'tar', name: 'Tar & Bird Dropping Removal', short: 'Tar Removal', price: 199, mrp: 299, mins: 20, rating: 4.6, count: '0.8k', img: 'r3d-foam', tint: '#F3ECFF', cat: 'Exterior',
    blurb: 'Tar spots and bird mess dissolved without scratching.',
    steps: [['Soften', 'Remover left to work'], ['Lift', 'Wiped off with microfibre']],
    included: ['Spot treatment on body'], excluded: ['Deep paint etching repair'] },
  { id: 'rain', name: 'Rain Repellent Glass Coat', short: 'Rain Repellent', price: 299, mrp: 449, mins: 20, rating: 4.7, count: '1.0k', img: 'r3d-glass', tint: '#EAF3FF', cat: 'Exterior',
    blurb: 'Water beads and rolls off the windshield at speed.',
    steps: [['Clean', 'Glass polished clean'], ['Coat', 'Repellent applied and cured']],
    included: ['Windshield', 'Side glass'], excluded: ['Chip repair'] },
  { id: 'leather', name: 'Leather Seat Conditioning', short: 'Leather Care', price: 499, mrp: 749, mins: 40, rating: 4.8, count: '0.9k', img: 'r3d-seat', tint: '#FFECEE', cat: 'Interior',
    blurb: 'Cleaned and conditioned so leather stays soft, not cracked.',
    steps: [['Clean', 'Leather cleaner and soft brush'], ['Condition', 'Conditioner worked in'], ['Finish', 'Buffed matte']],
    included: ['All leather seats'], excluded: ['Seat repair', 'Re-dyeing'] },
  { id: 'liner', name: 'Roof Liner Cleaning', short: 'Roof Liner', price: 399, mrp: 599, mins: 30, rating: 4.6, count: '0.7k', img: 'r3d-int', tint: '#FFF4DC', cat: 'Interior',
    blurb: 'Dry foam lifts stains off the roof without soaking it.',
    steps: [['Dust', 'Loose dust vacuumed'], ['Foam', 'Light dry foam, gently blotted']],
    included: ['Full roof liner'], excluded: ['Liner re-gluing'] },
  { id: 'boot', name: 'Boot Cleaning', short: 'Boot Clean', price: 129, mrp: 199, mins: 15, rating: 4.7, count: '1.0k', img: 'r3d-vac', tint: '#E8F6FF', cat: 'Interior',
    blurb: 'Boot emptied, vacuumed and wiped, spare wheel well too.',
    steps: [['Empty', 'Items kept aside'], ['Vacuum', 'Boot floor and corners'], ['Wipe', 'Lining and spare well wiped']],
    included: ['Boot floor', 'Spare wheel well'], excluded: ['Luggage removal beyond 10 items'] },
  { id: 'mats', name: 'Floor Mat Deep Wash', short: 'Mat Wash', price: 199, mrp: 299, mins: 25, rating: 4.7, count: '1.2k', img: 'r3d-vac', tint: '#E8F6FF', cat: 'Interior',
    blurb: 'Mats scrubbed with shampoo, rinsed and left to dry.',
    steps: [['Scrub', 'Shampoo and brush'], ['Rinse', 'Pressure rinse'], ['Dry', 'Squeezed and air dried']],
    included: ['4 floor mats'], excluded: ['Mat replacement'] },
  { id: 'ac', name: 'AC Vent Sanitise', short: 'AC Sanitise', price: 349, mrp: 499, mins: 25, rating: 4.7, count: '1.1k', img: 'r3d-odour', tint: '#EFFAF4', cat: 'Interior',
    blurb: 'Vents and cabin air path sanitised for fresher air.',
    steps: [['Vents', 'Brushed and wiped'], ['Sanitise', 'Disinfectant fog through the AC']],
    included: ['All vents', 'Cabin air'], excluded: ['AC gas refill', 'Cabin filter replacement'] },
  { id: 'touch', name: 'Steering & Touchpoint Disinfect', short: 'Disinfect', price: 149, mrp: 249, mins: 15, rating: 4.8, count: '1.4k', img: 'r3d-dash', tint: '#FFF0E8', cat: 'Interior',
    blurb: 'Steering, gear knob, handles and buttons wiped and disinfected.',
    steps: [['Wipe', 'Touchpoints wiped with a safe disinfectant']],
    included: ['Steering', 'Gear knob', 'Door handles', 'Buttons'], excluded: ['Fabric cleaning'] },
  { id: 'rust', name: 'Anti-Rust Underbody Coat', short: 'Anti-Rust', price: 999, mrp: 1499, mins: 60, rating: 4.7, count: '0.5k', img: 'r3d-under', tint: '#EEF0FF', cat: 'Care',
    blurb: 'Protective coat for the underbody against monsoon and salt.',
    steps: [['Wash', 'Underbody washed and dried'], ['Coat', 'Anti-rust coat sprayed on']],
    included: ['Underbody', 'Wheel arches'], excluded: ['Rust repair or welding'] },
  { id: 'rubber', name: 'Door Rubber Care', short: 'Rubber Care', price: 149, mrp: 249, mins: 15, rating: 4.6, count: '0.6k', img: 'r3d-dash', tint: '#FFF0E8', cat: 'Care',
    blurb: 'Door and boot rubbers cleaned and conditioned so they do not crack.',
    steps: [['Clean', 'Rubber seals cleaned'], ['Condition', 'Protectant applied']],
    included: ['All door seals', 'Boot seal'], excluded: ['Seal replacement'] },
  { id: 'battery', name: 'Battery Terminal Clean', short: 'Battery Clean', price: 149, mrp: 249, mins: 15, rating: 4.6, count: '0.5k', img: 'r3d-engine', tint: '#EDEDF2', cat: 'Care',
    blurb: 'Corrosion cleaned off the battery terminals and greased.',
    steps: [['Disconnect', 'Terminals safely isolated'], ['Clean', 'Corrosion brushed off and greased']],
    included: ['Both terminals'], excluded: ['Battery replacement', 'Battery testing'] },
  { id: 'polish', name: 'Machine Paint Polish', short: 'Paint Polish', price: 1499, mrp: 2199, mins: 90, rating: 4.8, count: '0.8k', img: 'r3d-ceramic', tint: '#F3ECFF', cat: 'Care',
    blurb: 'Machine polish removes swirls and light scratches.',
    steps: [['Wash', 'Clay-clean paint'], ['Polish', 'Dual-action machine polish'], ['Finish', 'Wiped and inspected']],
    included: ['Full body'], excluded: ['Deep scratch repair', 'Repainting'] },
  { id: 'teflon', name: 'Teflon Paint Protection', short: 'Teflon Coat', price: 1999, mrp: 2999, mins: 90, rating: 4.8, count: '0.6k', img: 'r3d-ceramic', tint: '#F3ECFF', cat: 'Care',
    blurb: 'Six months of gloss and easier washes.',
    steps: [['Prep', 'Paint cleaned and degreased'], ['Coat', 'Teflon layer applied panel by panel'], ['Cure', 'Left to cure, buffed']],
    included: ['Full body'], excluded: ['Paint correction'] },
];
// Real photos of our washer doing each job (img.ts 'svc-*'). A service or pack id listed here shows the photo instead of the drawn art;
// a live-config `photo` URL still wins. Ids without a fitting photo keep their drawing.
const _P = (k: string) => 'svc-' + k;
export const SVC_PHOTO: Record<string, string> = {
  ext: _P('pressure-wash'), foam: _P('foam-wash'), int: _P('interior-spray'), vac: _P('vacuum-rear'), engine: _P('engine-spray'), tyre: _P('tyre-rim'),
  glass: _P('glass'), dash: _P('dashboard'), seat: _P('seat-shampoo'), odour: _P('interior-spray'), ceramic: _P('polish-bonnet'), wax: _P('hand-dry'),
  alloy: _P('tyre-rim'), roof: _P('glass'), tar: _P('hand-dry'), rain: _P('glass'), liner: _P('roof-liner'), boot: _P('boot-vacuum'),
  mats: _P('floor-mat'), touch: _P('interior-spray'), battery: _P('engine-battery'),
  wash: _P('pressure-wash'), deep: _P('vacuum-rear'), exclusive: _P('polish-bonnet'),
};
// "Wash Packs" carousel: the combos n8n already prices, so these can be paid online.
export type PackDef = { id: string; tag: string; img: string; mins: number; sub: string; name?: string; price?: number; mrp?: number; status?: LiveStatus; pausedNote?: string; art?: ArtSpec; blurb?: string; steps?: [string, string][]; included?: string[]; excluded?: string[]; faqs?: [string, string][] };
export const PACKS: PackDef[] = [
  { id: 'wash', tag: 'POPULAR', img: 'r3d-pack-wash', mins: 30, sub: 'Pressure wash + tyre polish + interior' },
  { id: 'deep', tag: 'NEW', img: 'r3d-pack-deep', mins: 60, sub: 'Foam, vacuum, glass and wheels' },
  { id: 'exclusive', tag: 'BEST', img: 'r3d-pack-exclusive', mins: 120, sub: 'Everything, plus engine bay and ceramic' },
];
export const SLOTS = { Morning: ['7:00 am', '8:00 am', '9:00 am', '10:00 am', '11:00 am'], Afternoon: ['12:00 pm', '1:00 pm', '2:00 pm', '3:00 pm', '4:00 pm'], Evening: ['5:00 pm', '6:00 pm', '7:00 pm', '8:00 pm'] } as const;
// Home trust footer. PLACEHOLDER numbers until Ravi confirms.
// Empty until Ravi confirms real numbers (unslop: no unverified claims). Screens hide the stats when a value is ''.
export const TRUST = { cars: '', carsLabel: 'Cars washed', rating: '', ratingLabel: 'Average rating' };
// Ratings and counts on CAR_SERVICES are placeholders; SHOW_RATINGS=false hides them everywhere until they are real.
export const SHOW_RATINGS = false;

/* =====================================================================
   PRONTO LAYER (2026-11-15). Display data only: every price, fee, coupon, wallet, pass and referral amount below is
   re-computed by the server (n8n, see pronto-video-2026-11-15/BACKEND.md) before any money moves. PLACEHOLDERS until
   Ravi confirms. Contract: pronto-video-2026-11-15/CONTRACT.md.
   ===================================================================== */

/* ---- cart modes ---- */
export type CartMode = 'instant' | 'scheduled' | 'recurring';
export const CART_MODES: { id: CartMode; label: string; sub: string }[] = [
  { id: 'instant', label: 'Instant', sub: 'Washer in 45-60 min' },
  { id: 'scheduled', label: 'Scheduled', sub: 'Pick a day and time' },
  { id: 'recurring', label: 'Recurring', sub: 'Same slot every week, cheaper' },
];

/* ---- service variants (car size) and offer packs ---- */
// Every a la carte service comes in three car sizes; price and minutes scale from the CarService base (hatchback).
export type VariantId = 'hatch' | 'sedan' | 'suv';
export type Variant = { id: VariantId; label: string; sub: string; mul: number; minsMul: number };
export const VARIANTS: Variant[] = [
  { id: 'hatch', label: 'Hatchback', sub: 'Swift, i20, Baleno', mul: 1, minsMul: 1 },
  { id: 'sedan', label: 'Sedan', sub: 'City, Verna, Dzire', mul: 1.2, minsMul: 1.2 },
  { id: 'suv', label: 'SUV', sub: 'Creta, Scorpio, XUV700', mul: 1.4, minsMul: 1.4 },
];
export const DEFAULT_VARIANT: VariantId = 'hatch';
const r9 = (n: number) => Math.max(9, Math.round(n / 10) * 10 - 1);   // 149 * 1.2 = 178.8 -> 179
/** car sizes a service is offered in: its own `variants` map (live config) or all three */
export const variantsFor = (s?: { variants?: Partial<Record<VariantId, number>> } | null): Variant[] =>
  s && s.variants && Object.keys(s.variants).length ? VARIANTS.filter(v => s.variants![v.id] != null).map(v => ({ ...v, mul: +s.variants![v.id]! || v.mul, minsMul: +s.variants![v.id]! || v.minsMul })) : VARIANTS;
export function variantPrice(base: { price: number; mrp: number; mins: number; variants?: Partial<Record<VariantId, number>> }, v: VariantId = DEFAULT_VARIANT) {
  const x = variantsFor(base).find(q => q.id === v) || VARIANTS.find(q => q.id === v) || VARIANTS[0];
  return x.mul === 1 ? { price: base.price, mrp: base.mrp, mins: base.mins } : { price: r9(base.price * x.mul), mrp: r9(base.mrp * x.mul), mins: Math.round(base.mins * x.minsMul / 5) * 5 };
}
// The three combos n8n already prices (SERVICES above) as pack cards: NEW tag, price, MRP, minutes.
export type PackInfo = { id: string; name: string; tag: string; img: string; mins: number; sub: string; price: number; mrp: number; isNew: boolean; status: LiveStatus; pausedNote: string; def: PackDef };
export const PACK_MRP: Record<string, number> = { wash: 349, deep: 1299, exclusive: 3200 };
export const packInfo = (id: string): PackInfo | null => {
  const p = PACKS.find(x => x.id === id), s = SERVICES.find(x => x.id === id); if (!p || (!s && p.price == null)) return null;
  const price = p.price ?? s!.price;
  return { id, name: p.name || (s ? s.name : id), tag: p.tag, img: p.img, mins: p.mins, sub: p.sub, price, mrp: p.mrp ?? PACK_MRP[id] ?? price, isNew: String(p.tag).toUpperCase() === 'NEW',
    status: p.status || 'live', pausedNote: p.pausedNote || '', def: p };
};

/* ---- recurring plans (cart mode 'recurring') ---- */
export type RecurId = 'weekly' | 'twice' | 'alt';
export const RECURRING: { id: RecurId; label: string; sub: string; perMonth: number; off: number }[] = [
  { id: 'weekly', label: 'Once a week', sub: '4 visits a month', perMonth: 4, off: 10 },
  { id: 'twice', label: 'Twice a week', sub: '8 visits a month', perMonth: 8, off: 15 },
  { id: 'alt', label: 'Alternate days', sub: '15 visits a month', perMonth: 15, off: 20 },
];

/* ---- fees and tax (display; server prices) ---- */
export const FEES = { gstPct: 5, visitFee: 0, convenienceFee: 19, convenienceFreeAbove: 299, instantFee: 0 };
/** flat surcharge per day part (appcfg fees.surcharge), on top of SLOT_SURCHARGE */
export const PART_SURCHARGE: Record<string, number> = { Morning: 0, Afternoon: 0, Evening: 0 };

/* ---- schedule slots ---- */
export type DayPart = 'Morning' | 'Afternoon' | 'Evening';
export const DAY_PARTS: { id: DayPart; from: string; to: string }[] = [
  { id: 'Morning', from: '07:00', to: '11:30' }, { id: 'Afternoon', from: '12:00', to: '16:30' }, { id: 'Evening', from: '17:00', to: '20:00' },
];
export const SLOT_STEP_MIN = 30;
export const SLOT_DAYS = 7;
export const SLOT_CUTOFF_MIN = 90;       // a slot today must start at least this far from now
export const ARRIVAL_WINDOW_MIN = 30;    // "Washers arrive within 30 minutes of the selected slot"
// Peak slots cost a little more (shown as "+₹30" on the chip)
export const SLOT_SURCHARGE: Record<string, number> = { '08:00': 30, '08:30': 30, '09:00': 30, '09:30': 30, '13:00': 50, '13:30': 50, '17:30': 30, '18:00': 30, '18:30': 30 };
// Instant service hours (IST). Outside them Home shows "Back at 6AM".
export const INSTANT_HOURS = { open: '06:00', close: '20:00' };
/** live slot grid (slots_cfg/default), written by config.ts */
export const SLOT_CFG = { step: 30, days: 7, cutoff: 90, closed: [] as string[] };
export const SOLD_OUT_TEXT = 'More slots open between 7-11 AM on the same day. Instant slots become available throughout the day.';

/* ---- coupons ---- */
export type Coupon = {
  status?: LiveStatus; validFrom?: string;
  code: string; title: string; sub: string; kind: 'flat' | 'pct'; v: number; max?: number; minOrder: number;
  modes?: CartMode[]; firstOrder?: boolean; till: string; tnc: string[];
};
export const COUPONS: Coupon[] = [
  { code: 'FIRSTWASH', title: '₹100 off your first booking', sub: 'On orders above ₹299', kind: 'flat', v: 100, minOrder: 299, firstOrder: true, till: '2026-12-31', tnc: ['Valid once per number', 'Not valid on WD Pass'] },
  { code: 'SHINE20', title: '20% off up to ₹150', sub: 'On orders above ₹499', kind: 'pct', v: 20, max: 150, minOrder: 499, till: '2026-12-31', tnc: ['Valid on a la carte services and packs'] },
  { code: 'WEEKLY50', title: '₹50 off recurring plans', sub: 'On your first recurring month', kind: 'flat', v: 50, minOrder: 199, modes: ['recurring'], till: '2026-12-31', tnc: ['Applies to the first month only'] },
  { code: 'EARLYBIRD', title: '₹30 off morning slots', sub: 'Scheduled bookings only', kind: 'flat', v: 30, minOrder: 149, modes: ['scheduled'], till: '2026-12-31', tnc: ['Scheduled bookings only'] },
];

/* ---- wallet (WD Money) ---- */
export const WALLET = {
  name: 'WD Money',
  cashbackPct: 5,
  chips: [{ amt: 250, bonus: 12.5 }, { amt: 500, bonus: 25 }, { amt: 1000, bonus: 50 }],
  minTopUp: 100, maxTopUp: 10000, maxBalance: 10000,
  promoExpiryDays: 15, cashExpiryDays: 365,
  rules: [
    'Pay for any booking with the balance in your wallet.',
    'Promotional rewards expire 15 days after being credited.',
    'Cash balance expires 1 year from the date of credit.',
    'Wallet balance cannot be withdrawn to a bank account.',
  ],
  benefits: [['Earn rewards', 'on every top-up'], ['Quick checkout', 'on every booking'], ['Works everywhere', 'on all bookings']] as [string, string][],
};

/* ---- WD Pass (prepaid visits) ---- */
export type PassPlan = { id: string; name: string; title: string; visits: number; price: number; mrp: number; days: number; covers: string[]; maxMins: number; benefits: [string, string][]; faqs: [string, string][]; status?: LiveStatus };
export const PASS_PLANS: PassPlan[] = [
  { id: 'pass3', name: 'WD Pass', title: 'Exterior Wash', visits: 3, price: 199, mrp: 447, days: 30, covers: ['ext', 'foam', 'tyre', 'glass', 'wash'], maxMins: 35,
    benefits: [['Save on every booking', 'Each wash costs less than a single booking'], ['Flexible bookings', 'Use a visit for any covered service, instant or scheduled'], ['30 days to use', 'Your visits stay valid for 30 days from purchase']],
    faqs: [['Can I use my visits whenever I want?', 'Yes. Book instant or scheduled, any day within 30 days of buying the pass.'],
      ['What services can I use my pass for?', 'Exterior pressure wash, foam wash, tyre and rim polish, glass care and the WD Wash pack.'],
      ["What happens if I don't use all my visits?", 'Unused visits expire with the pass after 30 days. They are not refunded.'],
      ['What if I cancel or reschedule a booking?', 'Cancel more than 2 hours before the slot and the visit comes back to your pass.']] },
];

/* ---- referral ---- */
export const REFERRAL = {
  friendGets: 40, bannerAmt: 100,
  tiers: [{ id: 'champ', name: 'Champ', amt: 100, from: 1, to: 5 }, { id: 'star', name: 'Star', amt: 150, from: 6, to: 9 }, { id: 'legend', name: 'Legend', amt: 200, from: 10, to: Infinity }],
  steps: ['Share the link with your friend', 'Your friend downloads the app with your link', 'They get ₹40 and you get ₹100 when they finish their first booking'],
  tnc: ['Rewards are credited to WD Money after your friend’s first booking is completed.', 'Your reward grows with the number of completed referrals: Champ, Star, Legend.', 'Referral rewards are promotional and expire 15 days after credit.', 'Self-referrals and duplicate accounts are not rewarded.'],
};

/* ---- address labels ---- */
export const ADDRESS_LABELS = ['Home', 'Work', 'Parents', 'Other'] as const;
export type AddressLabel = (typeof ADDRESS_LABELS)[number];

/* ---- account deletion ("Before you delete your account") ---- */
export const DELETE_INFO: [string, string][] = [
  ['Bookings', 'Upcoming bookings will be cancelled'],
  ['Balances', 'Pass and wallet balances will be lost'],
  ['History', 'Profile, addresses and history will no longer be available'],
  ['Finance records', 'May be retained as required by law'],
];
