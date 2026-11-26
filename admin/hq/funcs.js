/* WD HQ: the functionality register. Every function of the customer app, the WD Partner app and the website in one list, each with its
   switch. Switches write appcfg/customer (the same document the control panel edits); the apps and the website read it live.
   "Core" rows have no switch: they are what the apps need to work at all (or what the stores require); their content is edited elsewhere. */
(() => {
  'use strict';
  const DEMO = /[?&]demo=1/.test(location.search);
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const sw = (app, group, path, name, desc, o = {}) => ({ app, group, path, name, desc, def: o.def !== false, warn: !!o.warn });
  const core = (app, group, name, desc, go, goLabel) => ({ app, group, core: true, name, desc, go, goLabel });
  const L = [
    // ---- customer app
    sw('c', 'Whole app', 'maintenance.on', 'Maintenance mode', 'Closes the app for customers with a notice. Turn ON only when you need it.', { def: false, warn: true }),
    sw('c', 'Booking', 'instant.on', 'Instant washes', 'Book a washer to come now, within opening hours.'),
    sw('c', 'Booking', 'instant.busy', 'Busy mode', 'Shows "we are busy" and blocks instant booking. Scheduled booking still works.', { def: false, warn: true }),
    sw('c', 'Booking', 'features.scheduled', 'Scheduled washes', 'Pick a day and a time slot.'), sw('c', 'Booking', 'features.recurring', 'Recurring washes', 'The Recurring option in the cart.'),
    sw('c', 'Booking', 'features.reschedule', 'Reschedule', 'Customers moving a booking.'), sw('c', 'Booking', 'features.cancel', 'Cancel booking', 'Customers cancelling a booking.'),
    sw('c', 'Booking', 'features.plans', 'Monthly plans', 'Daily wash plans and sign-up.'),
    sw('c', 'Money', 'features.wallet', 'WD Money wallet', 'Balance, wallet payments and the wallet icon.'), sw('c', 'Money', 'features.topup', 'Add money (top-up)', 'The Add money button and bonus chips.'),
    sw('c', 'Money', 'features.giftcard', 'Gift cards', 'Buy and redeem gift cards.'), sw('c', 'Money', 'features.pass', 'WD Pass', 'Prepaid visit passes and the pass promo.'),
    sw('c', 'Money', 'features.coupons', 'Coupons', 'Apply a code at checkout.'), sw('c', 'Money', 'features.refer', 'Refer a friend', 'Referral banner, page and rewards.'),
    sw('c', 'Account', 'features.whatsappLogin', 'WhatsApp sign-in code', 'Off sends the sign-in code by SMS only.'), sw('c', 'Account', 'features.guest', 'Skip login (guest browsing)', 'The Skip button on the sign-in screen.'),
    sw('c', 'Account', 'features.notify', 'Notify me / Count me in', 'The card that tells customers outside your areas how many neighbours are waiting.'),
    sw('c', 'Account', 'features.ratings', 'Ratings', 'Ratings on cards and the rating after a wash.'), sw('c', 'Account', 'features.store', 'Car store', 'The Store and its entry on Home.'),
    sw('c', 'Tabs', 'tabs.washes', 'Washes tab', 'Bookings and wash history.'), sw('c', 'Tabs', 'tabs.money', 'Money tab', 'Also needs the wallet switch.'), sw('c', 'Tabs', 'tabs.profile', 'Profile tab', 'Account, addresses, help.'),
    ...[['hero', 'Hero banner', 'The big header on Home'], ['instantCards', 'Instant and Monthly cards', 'The two entry cards'], ['packs', 'Wash packs', 'The packs carousel'], ['referBanner', 'Refer banner', 'The refer a friend strip'], ['services', 'All services grid', 'The a la carte grid'], ['trust', 'Trust footer', 'Your car is in professional hands'], ['passPromo', 'WD Pass promo', 'The pass sheet on Home'], ['more', 'Plans and Store row', 'Shortcuts under the services']]
      .map(([k, n, d]) => sw('c', 'Home sections', 'sections.' + k, n, d)),
    core('c', 'Always on', 'Phone sign-in', 'Code by SMS or WhatsApp, with the owner numbers handled on the server.', 'content', 'Texts'),
    core('c', 'Always on', 'Addresses and map pin', 'Apple Maps or Google map, the pin at the customer\'s door.', 'settings', 'Service areas'),
    core('c', 'Always on', 'Service-area check', 'Nobody can book or pay outside your circles.', 'settings', 'Service areas'),
    core('c', 'Always on', 'Cart and payment', 'Cashfree and Razorpay through the payment server.', 'payments', 'Payments'),
    core('c', 'Always on', 'Live washer tracking', 'The washer\'s position and the status steps of every wash.', 'map', 'Washer map'),
    core('c', 'Always on', 'Photo proof of every wash', 'Photos on the Daily and Bookings cards.', 'rounds', 'Rounds and photos'),
    core('c', 'Always on', 'Notifications', 'Washer on the way, wash done, receipts.', null, ''),
    core('c', 'Always on', 'Profile, help and legal pages', 'Edit profile, delete account (the stores require it), help topics, terms.', 'content', 'Pages and help'),
    // ---- WD Partner app
    sw('p', 'Tabs', 'features.washer.tab_extra', 'Extra tab', 'Extra jobs: accept or deny offers, work assigned jobs.'), sw('p', 'Tabs', 'features.washer.tab_hazri', 'Hazri tab', 'Attendance with the selfie and the T-shirt check.'),
    sw('p', 'Tabs', 'features.washer.tab_money', 'Money tab', 'Earnings, week, target and lists.'),
    sw('p', 'Round', 'features.washer.round_picker', 'Round picker', 'The place chip under the name that lets a washer take a round.'), sw('p', 'Round', 'features.washer.add_car', 'Add a new car', 'The washer signs up a customer\'s car from the app.'),
    sw('p', 'Money', 'features.washer.rewards', 'Bonus and rewards', 'The bonus card on Money and the Round tab.'),
    sw('p', 'Profile', 'features.washer.refer', 'Refer and earn', 'The referral row in Profile.'), sw('p', 'Profile', 'features.washer.help_sos', 'Help and SOS', 'The help button on Round and the SOS row in Profile.'),
    core('p', 'Always on', 'Guided route', 'The first car on top with its slot, the one big button, the route track and car boxes.', 'rounds', 'Rounds'),
    core('p', 'Always on', 'Nikla, wash, 2 photos, finish', 'Each car\'s steps, with the 2 closing photos.', 'live', 'Live desk'),
    core('p', 'Always on', 'Location sharing', 'Washers share their position; you see it on the map.', 'map', 'Washer map'),
    core('p', 'Always on', 'Washer pay share', 'The share of each wash the washer earns (set in Fees).', 'settings', 'Fees'),
    core('p', 'Always on', 'Job alerts', 'New extra jobs ring on the washer\'s phone.', 'live', 'Live desk'),
    core('p', 'Always on', 'Documents and kit', 'ID documents, kit list, language and theme.', 'washers', 'Washers'),
    // ---- website
    sw('w', 'Sections', 'features.web.plans', 'Monthly plans section', 'The plan cards. Prices follow Services and prices.'), sw('w', 'Sections', 'features.web.street', 'Street / how it works', 'The street story section.'),
    sw('w', 'Sections', 'features.web.beforeAfter', 'Before and after', 'The photo comparison.'), sw('w', 'Sections', 'features.web.map', 'Where we work (map)', 'The service-area map.'),
    sw('w', 'Sections', 'features.web.join', 'Join as a washer', 'The sign-up section for washers.'), sw('w', 'Sections', 'features.web.enquire', 'Enquiry form', 'The contact form.'),
    sw('w', 'Sections', 'features.web.buyOnline', 'Choose a plan online', 'The Choose buttons. Off turns them into "Message us".'),
    core('w', 'Always on', 'Plan prices and availability', 'Follow the catalog automatically: change them in Services and prices.', 'catalog', 'Services and prices'),
    core('w', 'Always on', 'WhatsApp contact', 'The WhatsApp links on the page.', null, ''),
    core('w', 'Always on', 'Privacy, terms and cancellation pages', 'The legal pages the stores link to.', 'content', 'Pages'),
  ];
  const APPS = { c: ['Customer app', '#5409DA'], p: ['WD Partner app', '#3A8F8A'], w: ['Website', '#E8873A'] };
  let cfg = {}, app = 'c', q = '', unsub = null, started = false;
  const get = path => path.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), cfg);
  const isOn = r => { const v = get(r.path); return r.def ? v !== false : v === true };

  async function setPath(path, v) {
    const set = (o, p, val) => { const k = p.split('.'); let c = o; k.slice(0, -1).forEach(x => { c[x] = c[x] && typeof c[x] === 'object' ? c[x] : {}; c = c[x] }); c[k[k.length - 1]] = val };
    set(cfg, path, v); render();
    if (DEMO) return;
    const ref = OPS.db().doc('appcfg/customer'), stamp = new Date().toISOString();
    try { await ref.update({ [path]: v, updated_at: stamp }) }
    catch (e) { const nested = {}; set(nested, path, v); try { await ref.set({ ...nested, updated_at: stamp }, { merge: true }) } catch (x) { console.warn(x); toast("Couldn't save. Are you signed in as an owner?") } }
  }
  function toast(m) { let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t) } t.textContent = m; t.className = 'show'; clearTimeout(toast.h); toast.h = setTimeout(() => { t.className = '' }, 2400) }

  function render() {
    const body = $('#fBody'); if (!body) return;
    const rows = L.filter(r => r.app === app && (!q || (r.name + ' ' + r.desc + ' ' + r.group).toLowerCase().includes(q)));
    const sws = L.filter(r => r.app === app && !r.core), on = sws.filter(isOn).length;
    $('#fTabs').innerHTML = Object.entries(APPS).map(([k, [n, c]]) => { const t = L.filter(r => r.app === k && !r.core); return `<button class="ftab ${k === app ? 'on' : ''}" data-fapp="${k}" type="button"><i style="background:${c}"></i>${n}<small>${t.filter(isOn).length}/${t.length} on</small></button>` }).join('');
    $('#fSum').textContent = `${on} of ${sws.length} switchable functions are on for the ${APPS[app][0]}.`;
    const groups = [...new Set(rows.map(r => r.group))];
    body.innerHTML = groups.map(g => `<h4>${esc(g)}</h4><div class="frows">${rows.filter(r => r.group === g).map(r => r.core
      ? `<div class="fr core"><span class="fi">${'\u{1F512}'}</span><span class="ft"><b>${esc(r.name)}</b><small>${esc(r.desc)}</small></span>${r.go ? `<button class="lnk" data-go="${r.go}" type="button">${esc(r.goLabel)}</button>` : '<span class="cb">Core</span>'}</div>`
      : `<div class="fr ${isOn(r) ? 'on' : 'off'} ${r.warn ? 'warn' : ''}"><span class="fi">${isOn(r) ? '●' : '○'}</span><span class="ft"><b>${esc(r.name)}</b><small>${esc(r.desc)}</small></span><button class="tg2 ${isOn(r) ? 'on' : ''}" role="switch" aria-checked="${isOn(r)}" aria-label="${esc(r.name)}" data-fpath="${esc(r.path)}" type="button"><i></i></button></div>`).join('')}</div>`).join('') || `<div class="empty">Nothing matches "${esc(q)}".</div>`;
  }
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('[data-fapp]'); if (t) { app = t.dataset.fapp; return render() }
    const s = e.target.closest && e.target.closest('[data-fpath]'); if (s) { const r = L.find(x => x.path === s.dataset.fpath); setPath(r.path, !isOn(r)) }
    const g = e.target.closest && e.target.closest('#funcs [data-go]'); if (g && window.HQ) window.HQ.go(g.dataset.go);
  });
  document.addEventListener('input', e => { if (e.target.id === 'fQ') { q = e.target.value.trim().toLowerCase(); render() } });

  function start() {
    if (started) return; started = true;
    if (DEMO) { cfg = JSON.parse(JSON.stringify((window.WD_SEED && window.WD_SEED.appcfg && window.WD_SEED.appcfg.customer) || {})); return render() }
    try { unsub = OPS.db().doc('appcfg/customer').onSnapshot(d => { cfg = (d && d.exists !== false && d.data && d.data()) || {}; render() }, e => console.warn('appcfg', e)) } catch (e) { console.warn(e) }
  }
  window.HQFuncs = { start, render, list: L };
})();
