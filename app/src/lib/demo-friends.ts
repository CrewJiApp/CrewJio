// Preview mode only: made-up crew friends with rotating rosters, so groups, Group Plan and
// Crew Match can be tried without other people signed up.
import { addDays, daysBetween, type IsoDate, type Profile, type SharedRosterEntry } from '@crewjio/shared';

export const DEMO_FRIENDS: Profile[] = [
  { id: 'demo-jia', displayName: 'Jia Li', role: 'cabin_crew', airline: 'SIA', rank: 'leading_steward', fleets: ['A350', 'A380'], jclTrained: true, openToSwaps: true },
  { id: 'demo-arif', displayName: 'Arif Tan', role: 'cabin_crew', airline: 'SIA', rank: 'flight_steward', fleets: ['777', 'A350'], jclTrained: false, openToSwaps: true },
  { id: 'demo-mei', displayName: 'Mei Koh', role: 'pilot', airline: 'SIA', rank: 'first_officer', fleets: ['A350'], jclTrained: false, openToSwaps: false },
  { id: 'demo-pri', displayName: 'Priya Lim', role: 'cabin_crew', airline: 'Scoot', rank: 'flight_steward', fleets: ['787'], jclTrained: false, openToSwaps: true },
];
export const DEMO_PARTNER: Profile = { id: 'demo-nadia', displayName: 'Nadia', role: 'cabin_crew', airline: 'SIA', rank: 'chief_steward', fleets: ['A380'], jclTrained: true, openToSwaps: false };

// A 12-day rotation; each friend starts it on a different day. Priya hasn't added her roster.
const OFFSET: Record<string, number | undefined> = { 'demo-jia': 0, 'demo-arif': 4, 'demo-mei': 8, 'demo-nadia': 2 };
const EPOCH = '2026-01-01';

type Slot = 'off' | 'turn' | 'standby' | 'out' | 'layover' | 'back';
const CYCLE: Slot[] = ['off', 'off', 'turn', 'off', 'standby', 'off', 'out', 'layover', 'back', 'off', 'off', 'off'];

const blank = { kind: null, sector: null, flightNumber: null, reportTime: null, departTime: null, arriveTime: null, arriveDate: null };

function entriesFor(slot: Slot, day: IsoDate, pilot: boolean): SharedRosterEntry[] {
  switch (slot) {
    case 'off':
      return [{ ...blank, day, status: 'off', kind: 'off', label: 'Off' }];
    case 'turn':
      return [
        { ...blank, day, status: 'busy', kind: 'flight', label: 'Flying', sector: 'SIN-BKK', flightNumber: 'SQ 978', reportTime: '0730', departTime: '0930', arriveTime: '1100' },
        { ...blank, day, status: 'busy', kind: 'flight', label: 'Flying', sector: 'BKK-SIN', flightNumber: 'SQ 979', departTime: '1230', arriveTime: '1600' },
      ];
    case 'standby':
      return pilot
        ? [{ ...blank, day, status: 'busy', kind: 'sim', label: 'Sim', reportTime: '0800', arriveTime: '1400' }]
        : [{ ...blank, day, status: 'busy', kind: 'standby', label: 'Standby', reportTime: '0600', arriveTime: '1800' }];
    case 'out':
      return [{ ...blank, day, status: 'busy', kind: 'flight', label: 'Flying', sector: 'SIN-LHR', flightNumber: 'SQ 318', reportTime: '2120', departTime: '2320', arriveTime: '0620', arriveDate: addDays(day, 1) }];
    case 'layover':
      return [{ ...blank, day, status: 'away', kind: 'layover', label: 'Away (layover)', sector: 'LHR' }];
    case 'back':
      return [{ ...blank, day, status: 'busy', kind: 'flight', label: 'Flying', sector: 'LHR-SIN', flightNumber: 'SQ 317', departTime: '1130', arriveTime: '0730', arriveDate: addDays(day, 1) }];
  }
}

/** A demo friend's roster between from and to, as get_shared_roster would return it at full level. */
export function demoSharedRoster(userId: string, from: IsoDate, to: IsoDate): SharedRosterEntry[] {
  const offset = OFFSET[userId];
  if (offset === undefined) return [];
  const pilot = [...DEMO_FRIENDS, DEMO_PARTNER].find((p) => p.id === userId)?.role === 'pilot';
  const out: SharedRosterEntry[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const i = (((daysBetween(EPOCH, d) + 12 - offset) % 12) + 12) % 12;
    out.push(...entriesFor(CYCLE[i]!, d, pilot));
  }
  return out;
}
