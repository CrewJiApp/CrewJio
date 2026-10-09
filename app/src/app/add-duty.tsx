// Add duty (mockup 12): flight (with optional return), training / sim / ground, standby / reserve,
// or a day off / leave. Validation comes from shared/duty-entry.ts.
import {
  DEFAULT_HOURS,
  DutyInputError,
  HOLIDAY_LABELS,
  buildFlightDuties,
  buildLeave,
  buildOffDuty,
  buildTimedDuty,
  displayTime,
  isIsoDate,
  todayInSingapore,
  type HolidayKind,
  type IsoDate,
  type TimedKind,
} from '@crewjio/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateField, TextField } from '@/components/fields';
import { CameraIcon, LockSimpleIcon } from '@/components/icons';
import { Chip, InfoNote, ToggleRow } from '@/components/ui';
import { backend } from '@/lib/backend';
import { useAuth } from '@/state/auth';
import { colors, fonts, radius, space, touch, type } from '@/theme';

type Tab = 'flight' | 'timed' | 'standby' | 'leave';
type LeaveChoice = 'off' | HolidayKind;

export default function AddDuty() {
  const { user, profile } = useAuth();
  const pilot = profile?.role === 'pilot';
  const params = useLocalSearchParams<{ date?: string }>();
  const startDate: IsoDate = params.date && isIsoDate(params.date) ? params.date : todayInSingapore();

  const [tab, setTab] = useState<Tab>('flight');
  const [date, setDate] = useState<IsoDate>(startDate);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Flight
  const [flightNumber, setFlightNumber] = useState('');
  const [from, setFrom] = useState('SIN');
  const [to, setTo] = useState('');
  const [report, setReport] = useState('');
  const [depart, setDepart] = useState('');
  const [arrive, setArrive] = useState('');
  const [nextDay, setNextDay] = useState(false);
  const [hasReturn, setHasReturn] = useState(false);
  const [retNumber, setRetNumber] = useState('');
  const [retDate, setRetDate] = useState<IsoDate>(startDate);
  const [retDepart, setRetDepart] = useState('');
  const [retArrive, setRetArrive] = useState('');
  const [retNextDay, setRetNextDay] = useState(false);

  // Training, sim, ground school, standby, reserve
  const [timedKind, setTimedKind] = useState<TimedKind>(pilot ? 'sim' : 'training');
  const [standbyKind, setStandbyKind] = useState<TimedKind>(pilot ? 'reserve' : 'standby');
  const [start, setStart] = useState(pilot ? '' : displayTime(DEFAULT_HOURS.training!.start));
  const [end, setEnd] = useState(pilot ? '' : displayTime(DEFAULT_HOURS.training!.end));
  const [note, setNote] = useState('');

  // Off and leave
  const [leave, setLeave] = useState<LeaveChoice>('off');
  const [endDate, setEndDate] = useState<IsoDate>(startDate);

  const pickTimed = (k: TimedKind) => {
    setTimedKind(k);
    const hours = DEFAULT_HOURS[k];
    setStart(hours ? displayTime(hours.start) : '');
    setEnd(hours ? displayTime(hours.end) : '');
  };
  const switchTab = (t: Tab) => {
    setTab(t);
    setErrors({});
    if (t === 'timed') pickTimed(timedKind);
    if (t === 'standby') {
      setStart('');
      setEnd('');
    }
  };

  const save = async () => {
    if (!user) return;
    setErrors({});
    setSaving(true);
    try {
      if (tab === 'flight') {
        const duties = buildFlightDuties({
          date,
          flightNumber,
          from,
          to,
          reportTime: report,
          departTime: depart,
          arriveTime: arrive,
          arrivesNextDay: nextDay,
          returnFlight: hasReturn ? { date: retDate, flightNumber: retNumber, departTime: retDepart, arriveTime: retArrive, arrivesNextDay: retNextDay } : undefined,
        });
        await backend.addDuties(user.id, duties);
      } else if (tab === 'timed' || tab === 'standby') {
        await backend.addDuties(user.id, [buildTimedDuty({ kind: tab === 'timed' ? timedKind : standbyKind, date, start, end, note })]);
      } else if (leave === 'off') {
        await backend.addDuties(user.id, [buildOffDuty(date)]);
      } else {
        await backend.addHoliday(user.id, buildLeave({ kind: leave, startDate: date, endDate, note }));
      }
      router.back();
    } catch (e) {
      if (e instanceof DutyInputError) setErrors({ [e.field]: e.message });
      else Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const tabs: [Tab, string][] = [
    ['flight', 'Flight'],
    ['timed', pilot ? 'Sim / ground' : 'Training'],
    ['standby', pilot ? 'Reserve' : 'Standby'],
    ['leave', 'Off / Leave'],
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.headerBtn} hitSlop={8}>
          <Text style={styles.headerAction}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle} accessibilityRole="header">
          Add duty
        </Text>
        <Pressable onPress={save} disabled={saving} accessibilityRole="button" style={[styles.headerBtn, styles.headerRight]} hitSlop={8}>
          <Text style={[styles.headerAction, styles.headerSave, saving && { opacity: 0.5 }]}>{saving ? 'Saving' : 'Save'}</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={() => Alert.alert('Coming soon', 'Soon you can screenshot your whole month and CrewJio fills it in. For now, add duties one by one.')}
            accessibilityRole="button"
            accessibilityHint="Coming soon"
            style={({ pressed }) => [styles.import, pressed && { opacity: 0.85 }]}>
            <View style={styles.importIcon}>
              <CameraIcon size={26} color={colors.amber} />
            </View>
            <View style={styles.flex}>
              <Text style={type.heading}>Import whole month</Text>
              <Text style={type.small}>Screenshot your roster and we read it for you. Coming soon.</Text>
            </View>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.rule} />
            <Text style={type.small}>or add one duty</Text>
            <View style={styles.rule} />
          </View>

          <View style={styles.tabs} accessibilityRole="tablist">
            {tabs.map(([t, label]) => (
              <Pressable
                key={t}
                onPress={() => switchTab(t)}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === t }}
                style={[styles.tab, tab === t && styles.tabOn]}>
                <Text style={[styles.tabText, tab === t && styles.tabTextOn]} numberOfLines={2}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          {tab === 'flight' ? (
            <>
              <TextField label="Flight number" value={flightNumber} onChangeText={setFlightNumber} placeholder="SQ 322" autoCapitalize="characters" mono error={errors.flightNumber} maxLength={8} />
              <DateField label="Departure date" value={date} onChange={(d) => { setDate(d); if (retDate < d) setRetDate(d); }} error={errors.date} />
              <View style={styles.pair}>
                <TextField label="From" value={from} onChangeText={setFrom} autoCapitalize="characters" mono maxLength={3} error={errors.from} style={styles.flex} />
                <TextField label="To" value={to} onChangeText={setTo} placeholder="LHR" autoCapitalize="characters" mono maxLength={3} error={errors.to} style={styles.flex} />
              </View>
              <View style={styles.pair}>
                <TextField label="Report" value={report} onChangeText={setReport} placeholder="hh:mm" keyboardType="numbers-and-punctuation" mono maxLength={5} error={errors.reportTime} style={styles.flex} />
                <TextField label="Departs" value={depart} onChangeText={setDepart} placeholder="hh:mm" keyboardType="numbers-and-punctuation" mono maxLength={5} error={errors.departTime} style={styles.flex} />
                <TextField label="Lands" value={arrive} onChangeText={setArrive} placeholder="hh:mm" keyboardType="numbers-and-punctuation" mono maxLength={5} error={errors.arriveTime} style={styles.flex} />
              </View>
              <ToggleRow title="Lands the next day" subtitle="Shown as +1, like an overnight flight to London" value={nextDay} onChange={setNextDay} />
              <ToggleRow title="Add the return flight" subtitle="Days in between are marked as a layover" value={hasReturn} onChange={setHasReturn} />
              {hasReturn ? (
                <View style={styles.returnCard}>
                  <TextField label="Return flight number" value={retNumber} onChangeText={setRetNumber} placeholder="SQ 317" autoCapitalize="characters" mono error={errors['return.flightNumber']} maxLength={8} />
                  <DateField label="Return date" value={retDate} onChange={setRetDate} minimumDate={date} error={errors['return.date']} />
                  <View style={styles.pair}>
                    <TextField label="Departs" value={retDepart} onChangeText={setRetDepart} placeholder="hh:mm" keyboardType="numbers-and-punctuation" mono maxLength={5} error={errors['return.departTime']} style={styles.flex} />
                    <TextField label="Lands" value={retArrive} onChangeText={setRetArrive} placeholder="hh:mm" keyboardType="numbers-and-punctuation" mono maxLength={5} error={errors['return.arriveTime']} style={styles.flex} />
                  </View>
                  <ToggleRow title="Lands the next day" subtitle="Back in Singapore the day after" value={retNextDay} onChange={setRetNextDay} />
                </View>
              ) : null}
            </>
          ) : null}

          {tab === 'timed' ? (
            <>
              {pilot ? (
                <View style={styles.chips}>
                  {(['sim', 'ground_school', 'training'] as const).map((k) => (
                    <Chip key={k} label={k === 'sim' ? 'Sim' : k === 'ground_school' ? 'Ground school' : 'Training'} selected={timedKind === k} onPress={() => pickTimed(k)} />
                  ))}
                </View>
              ) : null}
              <DateField label="Date" value={date} onChange={setDate} error={errors.date} />
              <View style={styles.pair}>
                <TextField label="Starts" value={start} onChangeText={setStart} placeholder="hh:mm" keyboardType="numbers-and-punctuation" mono maxLength={5} error={errors.start} style={styles.flex} />
                <TextField label="Ends" value={end} onChangeText={setEnd} placeholder="hh:mm" keyboardType="numbers-and-punctuation" mono maxLength={5} error={errors.end} style={styles.flex} />
              </View>
              <TextField label="What is it? (optional, only you see this)" value={note} onChangeText={setNote} placeholder={pilot ? 'Recurrent sim check' : 'Recurrent SEP'} autoCapitalize="sentences" maxLength={80} />
            </>
          ) : null}

          {tab === 'standby' ? (
            <>
              <View style={styles.chips}>
                {(['standby', 'reserve'] as const).map((k) => (
                  <Chip key={k} label={k === 'standby' ? 'Standby' : 'Reserve'} selected={standbyKind === k} onPress={() => setStandbyKind(k)} />
                ))}
              </View>
              <DateField label="Date" value={date} onChange={setDate} error={errors.date} />
              <View style={styles.pair}>
                <TextField label="From" value={start} onChangeText={setStart} placeholder="hh:mm" keyboardType="numbers-and-punctuation" mono maxLength={5} error={errors.start} style={styles.flex} />
                <TextField label="Until" value={end} onChangeText={setEnd} placeholder="hh:mm" keyboardType="numbers-and-punctuation" mono maxLength={5} error={errors.end} style={styles.flex} />
              </View>
            </>
          ) : null}

          {tab === 'leave' ? (
            <>
              <View style={styles.chips}>
                {(['off', 'holiday', 'annual_leave', 'busy_personal', 'reservist'] as const).map((k) => (
                  <Chip key={k} label={k === 'off' ? 'Day off' : HOLIDAY_LABELS[k]} selected={leave === k} onPress={() => setLeave(k)} />
                ))}
              </View>
              {leave === 'off' ? (
                <DateField label="Date" value={date} onChange={setDate} error={errors.date} />
              ) : (
                <>
                  <View style={styles.pair}>
                    <DateField label="From" value={date} onChange={(d) => { setDate(d); if (endDate < d) setEndDate(d); }} error={errors.startDate} style={styles.flex} />
                    <DateField label="Until" value={endDate} onChange={setEndDate} minimumDate={date} error={errors.endDate} style={styles.flex} />
                  </View>
                  <TextField label="Note (optional, only you see this)" value={note} onChangeText={setNote} placeholder={leave === 'holiday' ? 'Bali' : ''} autoCapitalize="sentences" maxLength={80} />
                  <InfoNote icon={<LockSimpleIcon size={20} color={colors.muted} />}>
                    {leave === 'reservist'
                      ? 'Reservist days are never offered for swaps. Groups see Away; your partner sees Reservist.'
                      : 'Leave always counts as busy, even on a roster off day. Groups see Away; your partner sees the details.'}
                  </InfoNote>
                </>
              )}
            </>
          ) : null}

          <View style={styles.visible}>
            <Text style={type.bodyStrong}>Visible to</Text>
            <Text style={type.small}>Your groups, at the level you choose for each one. Notes are only ever visible to you.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.sm },
  headerBtn: { minWidth: 72, minHeight: touch, justifyContent: 'center' },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.bold, fontSize: 19, color: colors.cloud },
  headerAction: { fontFamily: fonts.medium, fontSize: 18, color: colors.amber },
  headerSave: { fontFamily: fonts.bold },
  body: { padding: space.xl, paddingTop: space.sm, gap: space.lg, paddingBottom: space.xxxl },
  import: { flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.lg + 2, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.amber },
  importIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#2A2414', alignItems: 'center', justifyContent: 'center' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  tabs: { flexDirection: 'row', gap: 6 },
  tab: { flex: 1, minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  tabOn: { backgroundColor: colors.amber, borderColor: colors.amber },
  tabText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 17, color: colors.cloud, textAlign: 'center' },
  tabTextOn: { fontFamily: fonts.bold, color: colors.onAmber },
  pair: { flexDirection: 'row', gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  returnCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: space.lg },
  visible: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.lg + 2, gap: 4 },
});
