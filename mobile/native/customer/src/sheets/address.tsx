// Address sheets: 'Select service location' picker (Home header, cart) and the edit/delete menu of one address. OWNER: PROFILE worker (pronto-video-2026-11-15/CONTRACT.md). Stub from CORE: replace the sheet bodies, keep the exported open* names and signatures.
import React from 'react';
import { SheetTitle, SheetSub } from '../ui/hosts';
import { openSheet } from '../state';

/** 'Select service location': search, use current location, New address, saved list with Selected tag + distance. Tap -> act.selectAddress(id). */
export function openAddressPicker() { openSheet(<><SheetTitle>Select service location</SheetTitle><SheetSub>Pick where your car is parked.</SheetSub></>) }
/** kebab menu on one saved address: Edit -> openPage({ k: 'addressForm', id }), Delete -> act.deleteAddress(id). */
export function openAddressMenu(_id: string) { openSheet(<><SheetTitle>Address</SheetTitle></>) }
