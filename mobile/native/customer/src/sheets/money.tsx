// Money sheets: gift card claim, wallet info tooltip, WD Pass promo popup (Home), pass price breakup. OWNER: MONEY worker (pronto-video-2026-11-15/CONTRACT.md). Stub from CORE: replace the sheet bodies, keep the exported open* names and signatures.
import React from 'react';
import { SheetTitle, SheetSub } from '../ui/hosts';
import { openSheet } from '../state';

/** 'Claim a gift card': code field -> act.claimGift(code). */
export function openGiftCard() { openSheet(<><SheetTitle>Claim a gift card</SheetTitle><SheetSub>Enter gift card details to claim.</SheetSub></>) }
/** info (i) next to the balance: WALLET.rules, cash vs promo split, expiringSoon. */
export function openWalletInfo() { openSheet(<><SheetTitle>Using your balance</SheetTitle></>) }
/** WD Pass launch popup shown over Home (homeConfig().passPromo): 'Book pass now' -> openPage({ k: 'pass' }). */
export function openPassPromo() { openSheet(<><SheetTitle>WD Pass</SheetTitle></>) }
/** 'Total amount' dropdown on the Pass checkout bar: passQuote(id) price + GST = total. */
export function openPassBreakup(_id?: string) { openSheet(<><SheetTitle>Price breakup</SheetTitle></>) }
