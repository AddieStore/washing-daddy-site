// Bookings sheets: rate a booking, cancel confirm, booking help. OWNER: BOOKINGS worker (pronto-video-2026-11-15/CONTRACT.md). Stub from CORE: replace the sheet bodies, keep the exported open* names and signatures.
import React from 'react';
import { SheetTitle, SheetSub } from '../ui/hosts';
import { openSheet } from '../state';

/** stars + note -> act.rateJob(id, stars, note). */
export function openRateSheet(_id: string) { openSheet(<><SheetTitle>Rate your wash</SheetTitle></>) }
/** 'Cancel booking?' with the cancellation policy line -> act.cancelJob(id). */
export function openCancelSheet(_id: string) { openSheet(<><SheetTitle>Cancel booking?</SheetTitle></>) }
/** Help on one booking: chat (act.whatsapp with the booking id), call, reschedule note. */
export function openBookingHelp(_id: string) { openSheet(<><SheetTitle>Need help?</SheetTitle></>) }
