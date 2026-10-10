// Groups, partner and friends' rosters. Real mode talks to Supabase (RLS and the RPCs in
// supabase/migrations enforce who sees what); preview mode uses demo friends on this phone.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  rowToProfile,
  type IsoDate,
  type OverrideLevel,
  type Profile,
  type ProfileRow,
  type SharedRosterEntry,
  type SharingLevel,
} from '@crewjio/shared';

import { DEMO_FRIENDS, DEMO_PARTNER, demoSharedRoster } from '@/lib/demo-friends';
import { supabase } from '@/lib/supabase';

export interface Member {
  profile: Profile;
  groupRole: 'owner' | 'member';
  /** What this member shares with the group. */
  sharingLevel: SharingLevel;
}

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  isOwner: boolean;
  /** Everyone in the group, including you. */
  members: Member[];
  mySharingLevel: SharingLevel;
}

export interface PartnerLink {
  id: string;
  partner: Profile;
}

export interface Social {
  listGroups(me: Profile): Promise<Group[]>;
  createGroup(me: Profile, name: string, level: SharingLevel): Promise<string>;
  joinGroup(me: Profile, code: string): Promise<string>;
  setSharingLevel(me: Profile, groupId: string, level: SharingLevel): Promise<void>;
  leaveGroup(me: Profile, groupId: string): Promise<void>;
  deleteGroup(groupId: string): Promise<void>;
  getPartner(me: Profile): Promise<PartnerLink | null>;
  createPartnerInvite(): Promise<string>;
  acceptPartnerInvite(me: Profile, code: string): Promise<void>;
  removePartner(link: PartnerLink): Promise<void>;
  /** Per-person cap on what one viewer sees of you. null removes it. */
  setOverride(viewerId: string, level: OverrideLevel | null): Promise<void>;
  getOverrides(): Promise<Record<string, OverrideLevel>>;
  /** Someone else's roster, redacted to what you are allowed to see. At most 62 days. */
  sharedRoster(ownerId: string, from: IsoDate, to: IsoDate): Promise<SharedRosterEntry[]>;
}

const PROFILE_COLUMNS = 'id, display_name, role, airline, rank, fleets, jcl_trained, open_to_swaps';

/** Friendlier wording for errors raised by the database functions. */
export function socialErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/invite not found/i.test(msg)) return 'That code didn’t work. Check it, or ask for a new one (codes last 7 days).';
  if (/already has a partner/i.test(msg)) return 'One of you is already connected to a partner.';
  if (/your own invite/i.test(msg)) return 'That’s your own code. Send it to your partner instead.';
  if (/network|fetch/i.test(msg)) return 'No connection. Check your internet and try again.';
  return msg;
}

const hhmm = (t: string | null) => (t ? t.slice(0, 5).replace(':', '') : null);

function supabaseSocial(): Social {
  const db = supabase!;
  const fail = (error: { message: string } | null) => {
    if (error) throw new Error(error.message);
  };
  const setSharingLevel = async (me: Profile, groupId: string, level: SharingLevel) => {
    const { error } = await db.from('group_members').update({ sharing_level: level }).eq('group_id', groupId).eq('user_id', me.id);
    fail(error);
  };
  return {
    async listGroups(me) {
      const { data, error } = await db
        .from('groups')
        .select(`id, name, invite_code, created_by, group_members(user_id, role, sharing_level, profiles(${PROFILE_COLUMNS}))`)
        .order('created_at');
      fail(error);
      type Row = { id: string; name: string; invite_code: string; created_by: string; group_members: { user_id: string; role: 'owner' | 'member'; sharing_level: SharingLevel; profiles: ProfileRow | null }[] };
      return ((data ?? []) as unknown as Row[]).map((g) => {
        const members = g.group_members
          .filter((m) => m.profiles)
          .map((m) => ({ profile: rowToProfile(m.profiles!), groupRole: m.role, sharingLevel: m.sharing_level }));
        const mine = g.group_members.find((m) => m.user_id === me.id);
        return { id: g.id, name: g.name, inviteCode: g.invite_code, isOwner: mine?.role === 'owner', members, mySharingLevel: mine?.sharing_level ?? 'off_days' };
      });
    },
    async createGroup(me, name, level) {
      const { data, error } = await db.rpc('create_group', { p_name: name.trim() });
      fail(error);
      const id = (data as { id: string }[])[0]!.id;
      if (level !== 'off_days') await setSharingLevel(me, id, level);
      return id;
    },
    async joinGroup(_me, code) {
      const { data, error } = await db.rpc('join_group', { p_invite_code: code.trim().toLowerCase() });
      fail(error);
      return data as string;
    },
    setSharingLevel,
    async leaveGroup(me, groupId) {
      const { error } = await db.from('group_members').delete().eq('group_id', groupId).eq('user_id', me.id);
      fail(error);
    },
    async deleteGroup(groupId) {
      const { error } = await db.from('groups').delete().eq('id', groupId);
      fail(error);
    },
    async getPartner(me) {
      const { data, error } = await db.from('partners').select('id, requester_id, addressee_id').eq('status', 'active').maybeSingle();
      fail(error);
      if (!data) return null;
      const otherId = data.requester_id === me.id ? data.addressee_id : data.requester_id;
      const { data: p, error: pe } = await db.from('profiles').select(PROFILE_COLUMNS).eq('id', otherId).maybeSingle();
      fail(pe);
      return p ? { id: data.id as string, partner: rowToProfile(p as ProfileRow) } : null;
    },
    async createPartnerInvite() {
      const { data, error } = await db.rpc('create_partner_invite');
      fail(error);
      return data as string;
    },
    async acceptPartnerInvite(_me, code) {
      const { error } = await db.rpc('accept_partner_invite', { p_code: code.trim() });
      fail(error);
    },
    async removePartner(link) {
      const { error } = await db.from('partners').delete().eq('id', link.id);
      fail(error);
    },
    async setOverride(viewerId, level) {
      const { error } = level
        ? await db.from('sharing_overrides').upsert({ viewer_id: viewerId, max_level: level }, { onConflict: 'owner_id,viewer_id' })
        : await db.from('sharing_overrides').delete().eq('viewer_id', viewerId);
      fail(error);
    },
    async getOverrides() {
      const { data, error } = await db.from('sharing_overrides').select('viewer_id, max_level');
      fail(error);
      return Object.fromEntries(((data ?? []) as { viewer_id: string; max_level: OverrideLevel }[]).map((r) => [r.viewer_id, r.max_level]));
    },
    async sharedRoster(ownerId, from, to) {
      const { data, error } = await db.rpc('get_shared_roster', { p_owner: ownerId, p_from: from, p_to: to });
      fail(error);
      type Row = { day: string; status: SharedRosterEntry['status']; kind: SharedRosterEntry['kind']; label: string; sector: string | null; flight_number: string | null; report_time: string | null; depart_time: string | null; arrive_time: string | null; arrive_date: string | null };
      return ((data ?? []) as Row[]).map((r) => ({
        day: r.day,
        status: r.status,
        kind: r.kind,
        label: r.label,
        sector: r.sector,
        flightNumber: r.flight_number,
        reportTime: hhmm(r.report_time),
        departTime: hhmm(r.depart_time),
        arriveTime: hhmm(r.arrive_time),
        arriveDate: r.arrive_date,
      }));
    },
  };
}

// Preview mode: groups and partner kept in AsyncStorage, friends from demo-friends.ts.
const DEMO_KEY = 'crewjio.demo.social.v1';
interface DemoGroup {
  id: string;
  name: string;
  code: string;
  memberIds: string[];
  myLevel: SharingLevel;
}
interface DemoSocial {
  groups: DemoGroup[];
  partner: boolean;
  overrides: Record<string, OverrideLevel>;
}

async function readDemo(): Promise<DemoSocial> {
  try {
    const raw = await AsyncStorage.getItem(DEMO_KEY);
    if (raw) return JSON.parse(raw) as DemoSocial;
  } catch {
    // Start fresh.
  }
  return { groups: [], partner: false, overrides: {} };
}
const writeDemo = (d: DemoSocial) => AsyncStorage.setItem(DEMO_KEY, JSON.stringify(d));

export async function clearDemoSocial(): Promise<void> {
  await AsyncStorage.removeItem(DEMO_KEY);
}

function demoSocial(): Social {
  const toGroup = (me: Profile, g: DemoGroup): Group => ({
    id: g.id,
    name: g.name,
    inviteCode: g.code,
    isOwner: true,
    mySharingLevel: g.myLevel,
    members: [
      { profile: me, groupRole: 'owner', sharingLevel: g.myLevel },
      ...g.memberIds.map((id) => ({ profile: DEMO_FRIENDS.find((f) => f.id === id)!, groupRole: 'member' as const, sharingLevel: 'full' as SharingLevel })),
    ],
  });
  const code = () => Math.random().toString(16).slice(2, 14).padEnd(12, '0');
  return {
    async listGroups(me) {
      return (await readDemo()).groups.map((g) => toGroup(me, g));
    },
    async createGroup(_me, name, level) {
      const d = await readDemo();
      // Demo friends "join" straight away so the plan has something to show.
      const g: DemoGroup = { id: `demo-group-${Date.now()}`, name: name.trim(), code: code(), memberIds: ['demo-jia', 'demo-arif'], myLevel: level };
      await writeDemo({ ...d, groups: [...d.groups, g] });
      return g.id;
    },
    async joinGroup() {
      const d = await readDemo();
      const g: DemoGroup = { id: `demo-group-${Date.now()}`, name: 'Batch girls', code: code(), memberIds: ['demo-jia', 'demo-arif', 'demo-mei', 'demo-pri'], myLevel: 'off_days' };
      await writeDemo({ ...d, groups: [...d.groups, g] });
      return g.id;
    },
    async setSharingLevel(_me, groupId, level) {
      const d = await readDemo();
      await writeDemo({ ...d, groups: d.groups.map((g) => (g.id === groupId ? { ...g, myLevel: level } : g)) });
    },
    async leaveGroup(_me, groupId) {
      const d = await readDemo();
      await writeDemo({ ...d, groups: d.groups.filter((g) => g.id !== groupId) });
    },
    async deleteGroup(groupId) {
      const d = await readDemo();
      await writeDemo({ ...d, groups: d.groups.filter((g) => g.id !== groupId) });
    },
    async getPartner() {
      return (await readDemo()).partner ? { id: 'demo-partner-link', partner: DEMO_PARTNER } : null;
    },
    async createPartnerInvite() {
      return 'DEMO4CREW1';
    },
    async acceptPartnerInvite() {
      const d = await readDemo();
      await writeDemo({ ...d, partner: true });
    },
    async removePartner() {
      const d = await readDemo();
      await writeDemo({ ...d, partner: false });
    },
    async setOverride(viewerId, level) {
      const d = await readDemo();
      const overrides = { ...d.overrides };
      if (level) overrides[viewerId] = level;
      else delete overrides[viewerId];
      await writeDemo({ ...d, overrides });
    },
    async getOverrides() {
      return (await readDemo()).overrides;
    },
    async sharedRoster(ownerId, from, to) {
      return demoSharedRoster(ownerId, from, to);
    },
  };
}

export const social: Social = supabase ? supabaseSocial() : demoSocial();
