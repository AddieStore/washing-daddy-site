// Wallet: balance, top-up chips with cashback, gift card, rules, transactions, refunds link. Also the 'money' tab (tab=true: no back bar). OWNER: MONEY worker (pronto-video-2026-11-15/CONTRACT.md). Stub from CORE: replace the body, keep the default export and props.
import React from 'react';
import Stub from './Stub';

export default function Money({ tab }: { tab?: boolean }) {
  return <Stub title="WD Money" back={!tab} />;
}
