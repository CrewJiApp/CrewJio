// One day of the roster: what's on, delete an entry, or add another duty on this date.
import { HOLIDAY_LABELS, displayTime, isIsoDate, longDate, shortDate, type Duty, type Holiday } from '@crewjio/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TrashIcon } from '@/components/icons';
import { TONE_STYLE } from '@/components/roster-calendar';
import { Button } from '@/components/ui';
import { backend } from '@/lib/backend';
import { useRoster } from '@/state/roster';
import { colors, fonts, radius, space, touch, type } from '@/theme';

const KIND_TITLE: Record<string, string> = {
  layover: 'Layover',
  training: 'Training',
  sim: 'Sim',
  ground_school: 'Ground school',
  standby: 'Standby',
  reserve: 'Reserve',
  off: 'Day off',
};

function describe(d: Duty): { title: string; detail: string | null; mono: boolean; tone: keyof typeof TONE_STYLE } {
  if (d.kind === 'flight') {
    const [from, to] = (d.sector ?? '').split('-');
    const parts = [
      d.reportTime ? `Report ${displayTime(d.reportTime)}` : null,
      d.departTime ? `Departs ${displayTime(d.departTime)}` : null,
      d.arriveTime ? `Lands ${displayTime(d.arriveTime)}${d.arriveDate && d.arriveDate !== d.date ? ' +1' : ''}` : null,
    ].filter(Boolean);
    return { title: `${d.flightNumber ?? 'Flight'} · ${from} → ${to}`, detail: parts.join(' · ') || null, mono: true, tone: 'flight' };
  }
  if (d.kind === 'layover') return { title: `Layover · ${d.sector ?? ''}`, detail: 'Away', mono: false, tone: 'flight' };
  const hours = d.reportTime && d.arriveTime ? `${displayTime(d.reportTime)} to ${displayTime(d.arriveTime)}` : d.reportTime ? `From ${displayTime(d.reportTime)}` : null;
  const tone = d.kind === 'off' ? 'off' : d.kind === 'standby' || d.kind === 'reserve' ? 'standby' : 'training';
  return { title: d.note && tone === 'training' ? d.note : (KIND_TITLE[d.kind] ?? 'Duty'), detail: [tone === 'training' && d.note ? KIND_TITLE[d.kind] : null, hours].filter(Boolean).join(' · ') || null, mono: false, tone };
}

function confirm(title: string, message: string, onYes: () => void) {
  if (Platform.OS === 'web') return onYes();
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onYes },
  ]);
}

export default function DayScreen() {
  const params = useLocalSearchParams<{ date: string }>();
  const date = params.date && isIsoDate(params.date) ? params.date : null;
  const { duties, holidays, loading, reload } = useRoster(date ?? '1970-01-01', date ?? '1970-01-01');
  const [busy, setBusy] = useState<string | null>(null);
  if (!date) return null;

  const remove = async (id: string, kind: 'duty' | 'holiday') => {
    setBusy(id);
    try {
      await (kind === 'duty' ? backend.deleteDuty(id) : backend.deleteHoliday(id));
      await reload();
    } catch (e) {
      Alert.alert('Could not delete', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const leaveRange = (h: Holiday) => (h.startDate === h.endDate ? shortDate(h.startDate) : `${shortDate(h.startDate)} to ${shortDate(h.endDate)}`);
  const empty = !loading && duties.length === 0 && holidays.length === 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          {longDate(date)}
        </Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.done} hitSlop={8}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {holidays.map((h) => (
          <Row
            key={h.id}
            tone="leave"
            title={HOLIDAY_LABELS[h.kind]}
            detail={[leaveRange(h), h.note].filter(Boolean).join(' · ')}
            busy={busy === h.id}
            onDelete={() => confirm('Delete this leave?', `This removes the whole entry, ${leaveRange(h)}.`, () => remove(h.id, 'holiday'))}
          />
        ))}
        {duties.map((d) => {
          const info = describe(d);
          return (
            <Row
              key={d.id}
              tone={info.tone}
              title={info.title}
              detail={info.detail}
              mono={info.mono}
              busy={busy === d.id}
              onDelete={() => confirm('Delete this duty?', info.title, () => remove(d.id, 'duty'))}
            />
          );
        })}
        {empty ? <Text style={[type.body, styles.empty]}>Nothing on this day yet.</Text> : null}
        <Button label="Add a duty on this day" variant={empty ? 'primary' : 'outline'} onPress={() => router.push({ pathname: '/add-duty', params: { date } })} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  tone,
  title,
  detail,
  mono,
  busy,
  onDelete,
}: {
  tone: keyof typeof TONE_STYLE;
  title: string;
  detail: string | null;
  mono?: boolean;
  busy: boolean;
  onDelete: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.stripe, { backgroundColor: TONE_STYLE[tone].border }]} />
      <View style={styles.flex}>
        <Text style={mono ? styles.mono : type.bodyStrong}>{title}</Text>
        {detail ? <Text style={type.small}>{detail}</Text> : null}
      </View>
      <Pressable onPress={onDelete} disabled={busy} accessibilityRole="button" accessibilityLabel={`Delete ${title}`} style={({ pressed }) => [styles.trash, (pressed || busy) && { opacity: 0.5 }]}>
        <TrashIcon size={22} color={colors.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  flex: { flex: 1, gap: 2 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, paddingVertical: space.sm },
  headerTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 24, color: colors.cloud },
  done: { minHeight: touch, minWidth: touch, justifyContent: 'center', alignItems: 'flex-end' },
  doneText: { fontFamily: fonts.bold, fontSize: 18, color: colors.amber },
  body: { padding: space.xl, paddingTop: space.md, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.card, borderRadius: radius.md, padding: space.md, paddingLeft: space.md },
  stripe: { width: 5, alignSelf: 'stretch', borderRadius: 3 },
  mono: { fontFamily: fonts.monoBold, fontSize: 17, color: colors.cloud },
  trash: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', marginVertical: space.lg },
});
