// In-app legal pages (native back bar, no WebView). Content owned by the PROFILE/LEGAL worker (CONTRACT.md); registry shape fixed.
// privacy: from the repo's privacy.html (16 Oct 2026). terms + cancellation: DRAFTS, flagged for Ravi / lawyer review.
export type LegalId = 'terms' | 'privacy' | 'cancellation';
export type LegalDoc = { id: LegalId; title: string; updated: string; draft: boolean; url: string; sections: { h: string; p: string[] }[] };
export const LEGAL_DOCS: Record<LegalId, LegalDoc> = {
  terms: { id: 'terms', title: 'Terms of service', updated: '15 November 2026', draft: true, url: 'https://washingdaddy.com/terms.html', sections: [
    { h: '1. The service', p: ['Washing Daddy connects you with trained washers who clean your car at your parking spot. Prices are shown before you book and include GST where applicable.'] },
    { h: '2. Bookings', p: ['Instant bookings are served by the nearest free washer. Scheduled bookings start within 30 minutes of the chosen slot.'] },
    { h: '3. Payments, wallet and passes', p: ['WD Money balance cannot be withdrawn. Promotional credits expire 15 days after credit; cash balance expires 1 year after credit. WD Pass visits expire with the pass.'] },
    { h: '4. Contact', p: ['hello@washingdaddy.com'] },
  ] },
  privacy: { id: 'privacy', title: 'Privacy policy', updated: '16 October 2026', draft: false, url: 'https://washingdaddy.com/privacy.html', sections: [
    { h: '1. Data we collect', p: ['Phone number, to sign you in via SMS one-time password (OTP).', 'Name and area you enter, so your washer can identify you.', 'Car details: make, model, registration number and parking spot.', 'Photos the washer takes to confirm a completed wash.', 'Wash records: date, status, time and water used.', 'We do not collect device IDs, advertising IDs or analytics data.'] },
    { h: '2. How we use your data', p: ['To authenticate you via Firebase Authentication (SMS OTP).', 'To match you with your washer and show live wash status.', 'To let you rate washes and send service requests.'] },
    { h: '3. Data storage and security', p: ['All data is stored in Google Cloud Firestore. Access is controlled by security rules: each user can read and write only their own data.'] },
    { h: '4. Third-party services', p: ['Firebase Authentication and Cloud Firestore. Payments are processed by Cashfree. We do not use advertising networks or analytics SDKs.'] },
    { h: '5. Data sharing', p: ['We do not sell, rent or share your personal data. It is visible only to you, your assigned washer and the business admin.'] },
    { h: '6. Data retention and deletion', p: ['Your data is kept while your account is active. Request deletion in the app (Legal & Privacy) and we remove it within 30 days; finance records may be retained as required by law.'] },
    { h: '7. Children', p: ['The apps are not directed at children under 13.'] },
    { h: '8. Your rights', p: ['You can request access to, correction of, or deletion of your data at any time.'] },
    { h: '9. Contact', p: ['Washing Daddy, hello@washingdaddy.com, washingdaddy.com'] },
  ] },
  cancellation: { id: 'cancellation', title: 'Cancellation policy', updated: '15 November 2026', draft: true, url: 'https://washingdaddy.com/cancellation.html', sections: [
    { h: 'Free cancellation', p: ['Cancel up to 2 hours before a scheduled slot, or before a washer is assigned for an instant booking, for a full refund.'] },
    { h: 'Late cancellation', p: ['Cancelling after the washer has set off may carry a fee of up to ₹50.'] },
    { h: 'Refunds', p: ['Refunds go to WD Money instantly, or to the original payment method in 5-7 working days. WD Pass visits used for a cancelled booking are returned to the pass.'] },
  ] },
};
export const LEGAL_ORDER: LegalId[] = ['terms', 'privacy', 'cancellation'];
