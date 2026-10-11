// The Add sheet for people who are not crew: copy the phone calendar, or add work / busy time,
// a free day, or a holiday. Hours matter: busy until 18:00 still leaves the evening free.
import { DutyInputError, buildBusyDays, buildLeave, buildOffDuty, type BusyLabel, type IsoDate } from '@crewjio/shared';
import { router } from 'expo-router';
import { useEffect, useState, type MutableRefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Saver } from '@/components/code-entry';
import { DateField, TextField } from '@/components/fields';
import { CalendarCheckIcon, LockSimpleIcon } from '@/components/icons';
import { Chip, InfoNote, ToggleRow } from '@/components/ui';
import { backend } from '@/lib/backend';
import { colors, fonts, radius, space, touch, type } from '@/theme';

type Tab = 'busy' | 'free' | 'away';
type AwayKind = 'holiday' | 'busy_personal';

export function PartnerEntryForm({ userId, startDate, saverRef }: { userId: string; startDate: IsoDate; saverRef: MutableRefObject<Saver | null> }) {
  const [tab, setTab] = useState<Tab>('busy');
  const [label, setLabel] = useState<BusyLabel>('Working');
  const [date, setDate] = useState<IsoDate>(startDate);
  const [endDate, setEndDate] = useState<IsoDate>(startDate);
  const [manyDays, setManyDays] = useState(false);
  const [weekdays, setWeekdays] = useState(true);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('18:00');
  const [note, setNote] = useState('');
  const [awayKind, setAwayKind] = useState<AwayKind>('holiday');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const pickLabel = (l: BusyLabel) => {
    setLabel(l);
    // Work has office hours by default; a busy block starts empty (whole day) until filled in.
    setStart(l === 'Working' ? '09:00' : '');
    setEnd(l === 'Working' ? '18:00' : '');
  };
  const changeDate = (d: IsoDate) => {
    setDate(d);
    if (endDate < d) setEndDate(d);
  };

  const save: Saver = async () => {
    setErrors({});
    try {
      if (tab === 'busy') {
        await backend.addDuties(userId, buildBusyDays({ label, date, endDate: manyDays ? endDate : undefined, weekdaysOnly: manyDays && weekdays, start, end, note }));
      } else if (tab === 'free') {
        await backend.addDuties(userId, [buildOffDuty(date)]);
      } else {
        await backend.addHoliday(userId, buildLeave({ kind: awayKind, startDate: date, endDate: manyDays ? endDate : undefined, note }));
      }
      return true;
    } catch (e) {
      if (e instanceof DutyInputError) {
        setErrors({ [e.field]: e.message });
        return false;
      }
      throw e;
    }
  };
  // The sheet's Save button calls the latest version of this form's save.
  useEffect(() => {
    saverRef.current = save;
  });

  const tabs: [Tab, string][] = [
    ['busy', 'Work / busy'],
    ['free', 'Free day'],
    ['away', 'Holiday'],
  ];

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => router.push('/calendar-sync')} accessibilityRole="button" style={({ pressed }) => [styles.sync, pressed && { opacity: 0.85 }]}>
        <View style={styles.syncIcon}>
          <CalendarCheckIcon size={26} color={colors.amber} />
        </View>
        <View style={styles.flex}>
          <Text style={type.heading}>Copy your phone calendar</Text>
          <Text style={type.small}>Only the times you’re busy. Never event names.</Text>
        </View>
      </Pressable>

      <View style={styles.dividerRow}>
        <View style={styles.rule} />
        <Text style={type.small}>or add it yourself</Text>
        <View style={styles.rule} />
      </View>

      <View style={styles.tabs} accessibilityRole="tablist">
        {tabs.map(([t, l]) => (
          <Pressable
            key={t}
            onPress={() => {
              setTab(t);
              setErrors({});
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
            style={[styles.tab, tab === t && styles.tabOn]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>{l}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'busy' ? (
        <>
          <View style={styles.chips} accessibilityRole="radiogroup">
            <Chip label="Working" selected={label === 'Working'} onPress={() => pickLabel('Working')} />
            <Chip label="Busy" selected={label === 'Busy'} onPress={() => pickLabel('Busy')} />
          </View>
          <DateField label={manyDays ? 'From' : 'Date'} value={date} onChange={changeDate} error={errors.date} />
          <ToggleRow title="More than one day" subtitle="Like a working week" value={manyDays} onChange={setManyDays} />
          {manyDays ? (
            <>
              <DateField label="Until" value={endDate} onChange={setEndDate} minimumDate={date} error={errors.endDate} />
              <ToggleRow title="Weekdays only" subtitle="Skip Saturdays and Sundays" value={weekdays} onChange={setWeekdays} />
            </>
          ) : null}
          <View style={styles.pair}>
            <TextField label="Starts" value={start} onChangeText={setStart} placeholder="hh:mm" keyboardType="numbers-and-punctuation" mono maxLength={5} error={errors.start} style={styles.flex} />
            <TextField label="Ends" value={end} onChangeText={setEnd} placeholder="hh:mm" keyboardType="numbers-and-punctuation" mono maxLength={5} error={errors.end} style={styles.flex} />
          </View>
          <Text style={type.small}>Leave both times empty if it takes the whole day. Busy until 18:00 still leaves your evening free.</Text>
          <TextField label="Note (optional, only you see this)" value={note} onChangeText={setNote} placeholder={label === 'Working' ? 'Office' : 'Dinner with family'} autoCapitalize="sentences" maxLength={80} />
        </>
      ) : null}

      {tab === 'free' ? (
        <>
          <DateField label="Date" value={date} onChange={changeDate} error={errors.date} />
          <Text style={type.small}>Days with nothing on already count as free. Add a free day to make it clear, like a day off work.</Text>
        </>
      ) : null}

      {tab === 'away' ? (
        <>
          <View style={styles.chips} accessibilityRole="radiogroup">
            <Chip label="Holiday" selected={awayKind === 'holiday'} onPress={() => setAwayKind('holiday')} />
            <Chip label="Busy all day" selected={awayKind === 'busy_personal'} onPress={() => setAwayKind('busy_personal')} />
          </View>
          <DateField label={manyDays ? 'From' : 'Date'} value={date} onChange={changeDate} error={errors.startDate} />
          <ToggleRow title="More than one day" subtitle="Like a trip away" value={manyDays} onChange={setManyDays} />
          {manyDays ? <DateField label="Until" value={endDate} onChange={setEndDate} minimumDate={date} error={errors.endDate} /> : null}
          <TextField label="Note (optional, only you see this)" value={note} onChangeText={setNote} placeholder={awayKind === 'holiday' ? 'Bali' : ''} autoCapitalize="sentences" maxLength={80} />
        </>
      ) : null}

      <InfoNote icon={<LockSimpleIcon size={20} color={colors.muted} />}>Your partner sees what you add and the times. Notes are only ever visible to you.</InfoNote>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  flex: { flex: 1, gap: 2 },
  pair: { flexDirection: 'row', gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sync: { flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.lg + 2, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.amber, minHeight: touch },
  syncIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#2A2414', alignItems: 'center', justifyContent: 'center' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  tabs: { flexDirection: 'row', gap: 6 },
  tab: { flex: 1, minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  tabOn: { backgroundColor: colors.amber, borderColor: colors.amber },
  tabText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 17, color: colors.cloud, textAlign: 'center' },
  tabTextOn: { fontFamily: fonts.bold, color: colors.onAmber },
});
