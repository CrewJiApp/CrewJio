// Where the signed-in user's data lives. With Supabase keys: the real database, protected by
// row-level security. Without keys: demo mode, stored only on this phone.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  dutyToRow,
  holidayToRow,
  profileToRow,
  rowToDuty,
  rowToHoliday,
  rowToProfile,
  type Duty,
  type DutyRow,
  type Holiday,
  type HolidayRow,
  type IsoDate,
  type NewDuty,
  type NewHoliday,
  type Profile,
  type ProfileRow,
} from '@crewjio/shared';

import { supabase } from '@/lib/supabase';

export interface Roster {
  duties: Duty[];
  holidays: Holiday[];
}

export interface Backend {
  mode: 'supabase' | 'demo';
  loadProfile(userId: string): Promise<Profile | null>;
  saveProfile(profile: Profile): Promise<void>;
  /** Duties and leave overlapping from..to (inclusive). */
  loadRoster(userId: string, from: IsoDate, to: IsoDate): Promise<Roster>;
  addDuties(userId: string, duties: NewDuty[]): Promise<void>;
  addHoliday(userId: string, holiday: NewHoliday): Promise<void>;
  deleteDuty(id: string): Promise<void>;
  deleteHoliday(id: string): Promise<void>;
}

const DUTY_COLUMNS =
  'id, user_id, duty_date, kind, category, code, friends_label, flight_number, sector, report_time, depart_time, arrive_time, arrive_date, note, source, needs_review';

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

function supabaseBackend(): Backend {
  const db = supabase!;
  return {
    mode: 'supabase',
    async loadProfile(userId) {
      const { data, error } = await db.from('profiles').select('id, display_name, role, airline, rank, fleets, jcl_trained, open_to_swaps').eq('id', userId).maybeSingle();
      fail(error);
      return data ? rowToProfile(data as ProfileRow) : null;
    },
    async saveProfile(profile) {
      const { id, ...fields } = profileToRow(profile);
      // Update first: the id column is not updatable, so an upsert would be refused.
      const { data, error } = await db.from('profiles').update(fields).eq('id', id).select('id');
      fail(error);
      if (data && data.length > 0) return;
      const { error: insertError } = await db.from('profiles').insert({ id, ...fields });
      fail(insertError);
    },
    async loadRoster(userId, from, to) {
      const [duties, holidays] = await Promise.all([
        db.from('duties').select(DUTY_COLUMNS).eq('user_id', userId).gte('duty_date', from).lte('duty_date', to).order('duty_date').order('created_at'),
        db.from('holidays').select('id, user_id, start_date, end_date, kind, note').eq('user_id', userId).lte('start_date', to).gte('end_date', from).order('start_date'),
      ]);
      fail(duties.error);
      fail(holidays.error);
      return {
        duties: (duties.data as (DutyRow & { id: string; user_id: string })[]).map(rowToDuty),
        holidays: (holidays.data as (HolidayRow & { id: string; user_id: string })[]).map(rowToHoliday),
      };
    },
    async addDuties(_userId, duties) {
      const { error } = await db.from('duties').insert(duties.map(dutyToRow));
      fail(error);
    },
    async addHoliday(_userId, holiday) {
      const { error } = await db.from('holidays').insert(holidayToRow(holiday));
      fail(error);
    },
    async deleteDuty(id) {
      const { error } = await db.from('duties').delete().eq('id', id);
      fail(error);
    },
    async deleteHoliday(id) {
      const { error } = await db.from('holidays').delete().eq('id', id);
      fail(error);
    },
  };
}

// Demo mode: one JSON document in AsyncStorage.
const DEMO_KEY = 'crewjio.demo.v1';
interface DemoData {
  profile: Profile | null;
  duties: Duty[];
  holidays: Holiday[];
}

async function readDemo(): Promise<DemoData> {
  try {
    const raw = await AsyncStorage.getItem(DEMO_KEY);
    if (raw) return JSON.parse(raw) as DemoData;
  } catch {
    // Unreadable storage starts fresh.
  }
  return { profile: null, duties: [], holidays: [] };
}

async function writeDemo(data: DemoData): Promise<void> {
  await AsyncStorage.setItem(DEMO_KEY, JSON.stringify(data));
}

let demoSeq = 0;
const demoId = () => `demo-${Date.now().toString(36)}-${(demoSeq++).toString(36)}`;

function demoBackend(): Backend {
  return {
    mode: 'demo',
    async loadProfile() {
      return (await readDemo()).profile;
    },
    async saveProfile(profile) {
      const data = await readDemo();
      await writeDemo({ ...data, profile });
    },
    async loadRoster(_userId, from, to) {
      const data = await readDemo();
      return {
        duties: data.duties.filter((d) => d.date >= from && d.date <= to).sort((a, b) => a.date.localeCompare(b.date)),
        holidays: data.holidays.filter((h) => h.startDate <= to && h.endDate >= from),
      };
    },
    async addDuties(userId, duties) {
      const data = await readDemo();
      await writeDemo({ ...data, duties: [...data.duties, ...duties.map((d) => ({ ...d, id: demoId(), userId }))] });
    },
    async addHoliday(userId, holiday) {
      const data = await readDemo();
      await writeDemo({ ...data, holidays: [...data.holidays, { ...holiday, id: demoId(), userId }] });
    },
    async deleteDuty(id) {
      const data = await readDemo();
      await writeDemo({ ...data, duties: data.duties.filter((d) => d.id !== id) });
    },
    async deleteHoliday(id) {
      const data = await readDemo();
      await writeDemo({ ...data, holidays: data.holidays.filter((h) => h.id !== id) });
    },
  };
}

export async function clearDemoData(): Promise<void> {
  await AsyncStorage.removeItem(DEMO_KEY);
}

export const backend: Backend = supabase ? supabaseBackend() : demoBackend();
