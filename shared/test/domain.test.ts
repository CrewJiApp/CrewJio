import { describe, expect, it } from 'vitest';
import roster from '../../samples/nov-2026-roster.json';
import {
  CODE_CATEGORIES,
  DUTY_KINDS,
  KIND_CATEGORY,
  PRIVATE_LABEL,
  effectiveLevel,
  friendsLabel,
  lookupCode,
  normaliseProfile,
  rankIndex,
  rosterCodeCount,
  suggestSwaps,
  UNTOUCHABLE_CATEGORIES,
} from '../src';

describe('roster codes', () => {
  it('loads the full code list', () => {
    expect(rosterCodeCount()).toBeGreaterThan(1000);
  });

  it('knows every code in the November sample', () => {
    const unknown = roster.rows.map((r) => r.duty).filter((d) => !lookupCode(d));
    expect(unknown).toEqual([]);
  });

  it('returns undefined for unknown codes instead of guessing', () => {
    expect(lookupCode('ZZZZ')).toBeUndefined();
    expect(lookupCode('toString')).toBeUndefined();
  });

  it('only uses known categories', () => {
    expect(CODE_CATEGORIES).toContain(lookupCode('ATDO')?.category);
    expect(lookupCode('FLY')?.category).toBe('flight');
  });

  it('treats reservist as untouchable', () => {
    const ntsv = lookupCode('NTSV');
    expect(ntsv?.category).toBe('national_service');
    expect(ntsv?.blocksMatching).toBe(true);
    expect(ntsv?.swappable).toBe(false);
    expect(UNTOUCHABLE_CATEGORIES.has('national_service')).toBe(true);
  });

  it('never reveals a private code to friends', async () => {
    const data = (await import('../roster-codes.json')).codes as Record<string, { category: string }>;
    const privateCodes = Object.keys(data).filter((k) => data[k]?.category === 'private');
    expect(privateCodes.length).toBeGreaterThan(0);
    for (const k of privateCodes) expect(friendsLabel(lookupCode(k)!)).toBe(PRIVATE_LABEL);
  });
});

describe('duty kinds', () => {
  it('maps every hand-entered kind to a category', () => {
    for (const k of DUTY_KINDS) expect(CODE_CATEGORIES).toContain(KIND_CATEGORY[k]);
  });

  it('blocks holidays, leave and busy entries', () => {
    expect(KIND_CATEGORY.holiday).toBe('leave');
    expect(KIND_CATEGORY.annual_leave).toBe('leave');
    expect(KIND_CATEGORY.busy_personal).toBe('busy');
  });
});

describe('profile', () => {
  it('drops a rank that does not match the role and JCL for pilots', () => {
    const p = normaliseProfile({ role: 'pilot', rank: 'chief_steward', jclTrained: true, fleets: ['787', 'A380'] });
    expect(p.rank).toBeNull();
    expect(p.jclTrained).toBe(false);
    expect(p.fleets).toEqual(['A380', '787']);
  });

  it('keeps a valid crew profile', () => {
    const p = normaliseProfile({ role: 'cabin_crew', rank: 'leading_steward', jclTrained: true, fleets: ['A350'] });
    expect(p).toEqual({ role: 'cabin_crew', rank: 'leading_steward', jclTrained: true, fleets: ['A350'] });
  });

  it('orders ranks by seniority', () => {
    expect(rankIndex('pilot', 'captain')).toBeGreaterThan(rankIndex('pilot', 'first_officer'));
    expect(rankIndex('cabin_crew', 'inflight_supervisor')).toBe(3);
  });
});

describe('effective sharing level', () => {
  const base = { isOwner: false, isPartner: false, sharedGroupLevels: [] as never[] };

  it('gives nothing without a shared group', () => {
    expect(effectiveLevel(base)).toBeNull();
  });

  it('uses the most generous level across shared groups', () => {
    expect(effectiveLevel({ ...base, sharedGroupLevels: ['off_days', 'full', 'destinations'] })).toBe('full');
  });

  it('lets a per-person override hide more, never less', () => {
    expect(effectiveLevel({ ...base, sharedGroupLevels: ['full'], override: 'off_days' })).toBe('off_days');
    expect(effectiveLevel({ ...base, sharedGroupLevels: ['off_days'], override: 'full' })).toBe('off_days');
    expect(effectiveLevel({ ...base, sharedGroupLevels: ['full'], override: 'hidden' })).toBeNull();
  });

  it('gives partner and owner their own levels', () => {
    expect(effectiveLevel({ ...base, isPartner: true })).toBe('partner');
    expect(effectiveLevel({ ...base, isOwner: true, isPartner: true })).toBe('owner');
  });
});

describe('stubs', () => {
  it('swap suggestions are clearly not implemented yet', () => {
    expect(() => suggestSwaps({} as never, '2026-11-01', [])).toThrow(/not implemented/);
  });
});
