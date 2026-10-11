// Copying a partner's phone calendar into CrewJio. Only when they're busy is kept: one Busy entry
// per day from the first event's start to the last event's end. Event titles, places and
// attendees are never read into CrewJio.
import { addDays, dateRange } from './dates';
import type { HHMM, IsoDate } from './duty';
import type { NewDuty } from './duty-entry';
import { KIND_CATEGORY } from './duty';

/** A phone calendar event in the phone's local time. */
export interface PhoneEvent {
  startDate: IsoDate;
  /** "HHMM". Ignored for all-day events. */
  startTime: HHMM;
  /** For an all-day event, the last day it covers (inclusive). */
  endDate: IsoDate;
  endTime: HHMM;
  allDay: boolean;
  /** Free / tentative events (e.g. "show as free") are skipped. */
  free?: boolean;
}

const MIDNIGHT = '0000';
const END_OF_DAY = '2359';

/**
 * Turns phone events into Busy duties between `from` and `to` (inclusive). An all-day event
 * makes the whole day busy. Timed events are merged per day into one block from the earliest
 * start to the latest end; an event that runs past midnight is split across the days it covers.
 */
export function eventsToBusyDuties(events: PhoneEvent[], from: IsoDate, to: IsoDate): NewDuty[] {
  const allDay = new Set<IsoDate>();
  const blocks = new Map<IsoDate, { start: HHMM; end: HHMM }>();
  const widen = (day: IsoDate, start: HHMM, end: HHMM) => {
    const b = blocks.get(day);
    blocks.set(day, b ? { start: start < b.start ? start : b.start, end: end > b.end ? end : b.end } : { start, end });
  };

  // Only the days in range, so a long event never builds a long list.
  const days = (a: IsoDate, b: IsoDate) => dateRange(a > from ? a : from, b < to ? b : to);

  for (const e of events) {
    if (e.free) continue;
    if (e.allDay) {
      for (const d of days(e.startDate, e.endDate)) allDay.add(d);
      continue;
    }
    // An event ending exactly at midnight belongs to the day before.
    const lastDay = e.endTime === MIDNIGHT && e.endDate > e.startDate ? addDays(e.endDate, -1) : e.endDate;
    for (const d of days(e.startDate, lastDay)) {
      const start = d === e.startDate ? e.startTime : MIDNIGHT;
      const end = d === e.endDate ? e.endTime : END_OF_DAY;
      if (end > start) widen(d, start, end);
    }
  }

  return dateRange(from, to)
    .filter((d) => allDay.has(d) || blocks.has(d))
    .map((date): NewDuty => {
      const b = allDay.has(date) ? null : blocks.get(date)!;
      return {
        date,
        kind: 'other',
        category: KIND_CATEGORY.other,
        code: null,
        friendsLabel: 'Busy',
        flightNumber: null,
        sector: null,
        reportTime: b?.start ?? null,
        arriveTime: b?.end ?? null,
        departTime: null,
        arriveDate: null,
        note: null,
        source: 'calendar',
        needsReview: false,
      };
    });
}
