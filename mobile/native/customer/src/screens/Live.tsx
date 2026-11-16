// Washes tab: the same Upcoming / Previous list as the Bookings page, without a back bar. OWNER: BOOKINGS worker.
import React from 'react';
import { BookingsBody } from '../pages/Bookings';

export default function Live() { return <BookingsBody tab />; }
