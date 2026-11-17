// The days of the scrollable date strip: the last HIST_DAYS days, today, and three days still to come (shown but not selectable).
import { DAY } from '../state/store';
import { HIST_DAYS } from './history';
import { addDaysStr, dayShort, dObj } from './time';
import { isHindi } from './i18n';
import type { WeekDay } from '../ui';

const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON_HI = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्तूबर', 'नवंबर', 'दिसंबर'];

export function dayStripDays(marks: Record<string, number>): WeekDay[] {
  const hi = isHindi();
  return [...Array(HIST_DAYS + 4)].map((_, i) => {
    const d = addDaysStr(DAY, i - HIST_DAYS);
    const o = dObj(d);
    return {
      key: d, label: dayShort(d, hi).split(',')[0], date: o.getDate(), dot: (marks[d] || 0) > 0,
      disabled: d > DAY, month: `${(hi ? MON_HI : MON)[o.getMonth()]} ${o.getFullYear()}`,
    };
  });
}
