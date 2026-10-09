// Month calendar for My Roster (mockups 10, 11): one tappable cell per day with a short code.
import { dayBadge, monthGrid, type DayTone, type Holiday, type IsoDate, type NewDuty } from '@crewjio/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '@/theme';

export const TONE_STYLE: Record<DayTone, { bg: string; fg: string; border: string }> = {
  flight: { bg: colors.amber, fg: colors.onAmber, border: colors.amber },
  training: { bg: colors.lavender, fg: colors.onCloud, border: colors.lavender },
  standby: { bg: '#5B6782', fg: colors.cloud, border: '#5B6782' },
  leave: { bg: '#173B3E', fg: colors.teal, border: colors.teal },
  off: { bg: 'transparent', fg: colors.cloud, border: colors.border },
  empty: { bg: 'transparent', fg: colors.cloud, border: colors.border },
};

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TONE_WORDS: Record<DayTone, string> = { flight: 'Flying', training: 'Training', standby: 'Standby', leave: 'Leave', off: 'Off', empty: 'Nothing added' };

export function RosterCalendar({
  year,
  month,
  today,
  duties,
  holidays,
  onPressDay,
}: {
  year: number;
  month: number;
  today: IsoDate;
  duties: NewDuty[];
  holidays: Pick<Holiday, 'kind' | 'startDate' | 'endDate'>[];
  onPressDay: (date: IsoDate) => void;
}) {
  const weeks = monthGrid(year, month);
  return (
    <View style={styles.wrap}>
      <View style={styles.row} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>
      {weeks.map((week, w) => (
        <View key={w} style={styles.row}>
          {week.map((date, i) => {
            if (!date) return <View key={i} style={styles.cell} />;
            const badge = dayBadge(date, duties, holidays);
            const tone = TONE_STYLE[badge.tone];
            const isToday = date === today;
            return (
              <Pressable
                key={date}
                onPress={() => onPressDay(date)}
                accessibilityRole="button"
                accessibilityLabel={`${DAY_NAMES[i]} ${Number(date.slice(8))}${isToday ? ', today' : ''}: ${TONE_WORDS[badge.tone]}${badge.code ? ` ${badge.code.split('').join(' ')}` : ''}`}
                style={({ pressed }) => [
                  styles.cell,
                  styles.day,
                  { backgroundColor: tone.bg, borderColor: tone.border },
                  isToday && styles.today,
                  pressed && { opacity: 0.75 },
                ]}>
                <Text style={[styles.num, { color: tone.fg }]}>{Number(date.slice(8))}</Text>
                {badge.code ? <Text style={[styles.code, { color: tone.fg }]}>{badge.code}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function Legend({ pilot }: { pilot: boolean }) {
  const items: [DayTone, string][] = [
    ['flight', 'Flight'],
    ['training', pilot ? 'Sim / ground' : 'Training'],
    ['standby', pilot ? 'Reserve' : 'Standby'],
    ['leave', 'Leave'],
    ['off', 'Off'],
  ];
  return (
    <View style={styles.legend}>
      {items.map(([tone, label]) => (
        <View key={tone} style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: TONE_STYLE[tone].bg, borderColor: TONE_STYLE[tone].border }]} />
          <Text style={styles.legendText}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 7 },
  row: { flexDirection: 'row', gap: 6 },
  weekday: { flex: 1, textAlign: 'center', fontFamily: fonts.medium, fontSize: 14, color: '#8A96AD' },
  cell: { flex: 1, minHeight: 50 },
  day: { borderRadius: radius.sm + 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  today: { borderColor: colors.cloud, borderWidth: 2.5 },
  num: { fontFamily: fonts.medium, fontSize: 17 },
  code: { fontFamily: fonts.monoBold, fontSize: 10.5, marginTop: 1, letterSpacing: 0.3 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 12, borderRadius: 3, borderWidth: 1.5 },
  legendText: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
});
