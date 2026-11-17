// Help & Support topics, FAQs and the About page. Content owned by the PROFILE/HELP worker (CONTRACT.md); shape fixed.
// PLACEHOLDER copy until Ravi confirms. "Chat with us" is act.whatsapp().
export type HelpTopic = { id: string; title: string; sub: string; faqs: [string, string][]; icon?: string };
export const HELP_TOPICS: HelpTopic[] = [
  { id: 'booking', title: 'Booking', sub: 'Scheduling, changes and cancellations', faqs: [
    ['How fast does an instant washer arrive?', 'Usually within 45-60 minutes during service hours (6 AM to 8 PM).'],
    ['Can I reschedule a booking?', 'Yes, up to 2 hours before the slot. Open the booking under Bookings and tap Help.'],
    ['How do I cancel?', 'Cancel from the booking up to 2 hours before the slot for a full refund. See the cancellation policy.'],
  ] },
  { id: 'account', title: 'Account', sub: 'Profile, addresses and sign-in', faqs: [
    ['Can I change my mobile number?', 'Your number is how you sign in, so it cannot be changed in the app. Chat with us and we will move your account.'],
    ['How do I add another address?', 'Profile > Saved addresses > New address.'],
    ['How do I delete my account?', 'Profile > Legal & Privacy > Request account deletion.'],
  ] },
  { id: 'payments', title: 'Payments', sub: 'Billing, refunds and transactions', faqs: [
    ['When will I get my refund?', 'Refunds to WD Money are instant. Refunds to UPI or card take 5-7 working days.'],
    ['Why is there GST on my bill?', 'Services are taxed at 5% GST as required by law. The bill shows the exact amount.'],
    ['Can I pay the washer in cash?', 'A la carte services can be paid on arrival by UPI or cash.'],
  ] },
  { id: 'quality', title: 'Service quality', sub: 'Feedback, issues and service standards', faqs: [
    ['A spot was missed. What now?', 'Rate the booking and tell us what was missed. We send the washer back at no cost.'],
    ['Do you use a pocha?', 'Never. Dust is rinsed off with pressure before anything touches the paint.'],
  ] },
  { id: 'safety', title: 'Safety', sub: 'Verified washers and your car', faqs: [
    ['Are washers verified?', 'Every washer is ID-verified and trained before their first wash.'],
    ['What if my car is damaged?', 'Chat with us right away with photos. We take responsibility for damage caused during a wash.'],
  ] },
];
export const ABOUT = {
  title: 'About Washing Daddy',
  intro: 'Car care at your parking spot, by washers who come to you. No pocha, no dirty cloth on dry dust.',
  how: [['Book', 'Pick a service, instant or for later'], ['We come to you', 'A verified washer arrives at your car'], ['Pay your way', 'UPI, card, WD Money or a WD Pass']] as [string, string][],
  faqs: [['Where do you work?', 'Paschim Vihar and nearby societies in West Delhi, growing every month.'], ['Do I need to be home?', 'No. Leave the keys with the guard or unlock the car, and get photos when it is done.']] as [string, string][],
};
