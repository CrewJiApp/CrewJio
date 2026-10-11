// Copy the phone's calendar (for people who are not crew). Only when they're busy is copied:
// one Busy block per day. Event titles, places and people are never read into CrewJio.
// Running it again replaces what was copied before, so it doubles as "update".
import { addDays, eventsToBusyDuties, todayInSingapore, type PhoneEvent } from '@crewjio/shared';
import * as Calendar from 'expo-calendar/legacy';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarCheckIcon, CheckCircleIcon, LockSimpleIcon } from '@/components/icons';
import { SheetHeader } from '@/components/sheets';
import { Button, Chip, InfoNote } from '@/components/ui';
import { backend } from '@/lib/backend';
import { useAuth } from '@/state/auth';
import { colors, radius, space, type } from '@/theme';

/** How far ahead we copy. Run it again any time to refresh. */
const DAYS_AHEAD = 60;

type Phase = 'intro' | 'denied' | 'pick' | 'copying' | 'done' | 'unsupported';

const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d: Date) => `${pad(d.getHours())}${pad(d.getMinutes())}`;

/** A phone event in this phone's local time, without its title or anything else. */
function toPhoneEvent(e: Calendar.Event): PhoneEvent {
  const start = new Date(e.startDate);
  const end = new Date(e.endDate);
  let endDate = localDate(end);
  // All-day events usually end at midnight after their last day.
  if (e.allDay && localTime(end) === '0000' && end > start) endDate = localDate(new Date(end.getTime() - 60_000));
  return {
    startDate: localDate(start),
    startTime: localTime(start),
    endDate,
    endTime: localTime(end),
    allDay: e.allDay,
    free: e.availability === Calendar.Availability.FREE,
  };
}

export default function CalendarSync() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>(Platform.OS === 'web' ? 'unsupported' : 'intro');
  const [calendars, setCalendars] = useState<Calendar.Calendar[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [copied, setCopied] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const from = todayInSingapore();
  const to = addDays(from, DAYS_AHEAD - 1);

  const ask = async () => {
    setError(null);
    try {
      const { granted } = await Calendar.requestCalendarPermissionsAsync();
      if (!granted) return setPhase('denied');
      const list = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      setCalendars(list);
      setPicked(list.map((c) => c.id));
      setPhase('pick');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open your calendar.');
    }
  };

  // Already allowed before: skip straight to picking calendars.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    Calendar.getCalendarPermissionsAsync()
      .then(({ granted }) => (granted ? ask() : undefined))
      .catch(() => undefined);
  }, []);

  const copy = async () => {
    if (!user || picked.length === 0) return;
    setPhase('copying');
    setError(null);
    try {
      // A day either side, so events that cross midnight in another time zone are caught.
      const events = await Calendar.getEventsAsync(picked, new Date(`${addDays(from, -1)}T00:00:00`), new Date(`${addDays(to, 1)}T23:59:59`));
      const duties = eventsToBusyDuties(events.map(toPhoneEvent), from, to);
      await backend.replaceCalendarDuties(user.id, from, to, duties);
      setCopied(duties.length);
      setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not copy your calendar.');
      setPhase('pick');
    }
  };

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <SheetHeader title="Phone calendar" />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.hero}>
          <View style={styles.icon}>
            {phase === 'done' ? <CheckCircleIcon size={30} color={colors.teal} weight="fill" /> : <CalendarCheckIcon size={30} color={colors.amber} />}
          </View>
          <Text style={type.title}>{phase === 'done' ? 'Calendar copied' : 'Copy when you’re busy'}</Text>
          <Text style={type.body}>
            {phase === 'done'
              ? `${copied === 0 ? 'No busy days' : copied === 1 ? '1 busy day' : `${copied} busy days`} in the next ${DAYS_AHEAD} days. Days with nothing on count as free. Copy again any time to update.`
              : `We look at the next ${DAYS_AHEAD} days and copy only the times you’re busy, so your partner can see when you’re both free.`}
          </Text>
        </View>

        <InfoNote icon={<LockSimpleIcon size={20} color={colors.muted} />}>
          Event names, places and who’s invited are never copied. Your partner sees Busy and the times. Events marked as free are skipped.
        </InfoNote>

        {phase === 'unsupported' ? <Text style={type.body}>Copying a calendar works in the CrewJio app on iPhone and Android.</Text> : null}

        {phase === 'denied' ? (
          <View style={styles.card}>
            <Text style={type.body}>CrewJio needs calendar access to see when you’re busy. You can turn it on in Settings.</Text>
            <Button label="Open Settings" variant="outline" onPress={() => Linking.openSettings()} />
          </View>
        ) : null}

        {phase === 'pick' || phase === 'copying' ? (
          <View style={styles.card}>
            <Text style={type.bodyStrong}>Which calendars?</Text>
            <View style={styles.chips}>
              {calendars.map((c) => (
                <Chip key={c.id} label={c.title} multi selected={picked.includes(c.id)} onPress={() => toggle(c.id)} />
              ))}
            </View>
            {calendars.length === 0 ? <Text style={type.small}>No calendars found on this phone.</Text> : null}
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        {phase === 'intro' ? <Button label="Allow calendar access" onPress={ask} /> : null}
        {phase === 'denied' ? <Button label="Try again" variant="outline" onPress={ask} /> : null}
        {phase === 'pick' || phase === 'copying' ? (
          <Button label={phase === 'copying' ? 'Copying…' : 'Copy my calendar'} disabled={picked.length === 0 || phase === 'copying'} onPress={copy} />
        ) : null}
        {phase === 'done' || phase === 'unsupported' ? <Button label="Done" onPress={() => router.back()} /> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  body: { padding: space.xl, gap: space.lg },
  hero: { gap: space.md },
  icon: { width: 60, height: 60, borderRadius: 18, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  error: { ...type.small, color: '#F07A7A' },
  footer: { paddingHorizontal: space.xl, paddingBottom: space.md, paddingTop: space.sm },
});
