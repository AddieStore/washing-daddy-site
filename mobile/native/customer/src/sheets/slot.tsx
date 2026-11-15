// Bottom sheets for the cart and schedule: 'Select time slot' (date chips, Morning/Afternoon/Evening, 30-min grid, surcharge, sold out, Confirm time) and the recurring plan picker. OWNER: CART worker (pronto-video-2026-11-15/CONTRACT.md). Stub from CORE: replace the sheet bodies, keep the exported open* names and signatures.
import React from 'react';
import { SheetTitle, SheetSub } from '../ui/hosts';
import { openSheet } from '../state';

/** Cart 'Select time slot': on confirm call act.setWhen({ date, slot }) and close. */
export function openSlotSheet() { openSheet(<><SheetTitle>Schedule for later</SheetTitle><SheetSub>Pick a day and time.</SheetSub></>) }
/** Cart 'Recurring' tab: how often, which days, slot -> act.setRecur(...). */
export function openRecurSheet() { openSheet(<><SheetTitle>Repeat this booking</SheetTitle><SheetSub>Pick how often.</SheetSub></>) }
/** Bill details expanded (rows from bill().rows). */
export function openBillSheet() { openSheet(<><SheetTitle>Bill details</SheetTitle></>) }
