// Illustrations for the 3-step tour (mockups 03, 04, 05), built from views so text stays sharp.
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ArrowDownIcon, PlusIcon } from '@/components/icons';
import { colors, fonts, radius, space, type } from '@/theme';

function Badge({ label, bg, fg = colors.onCloud, outline }: { label: string; bg?: string; fg?: string; outline?: boolean }) {
  return (
    <View style={[styles.badge, bg ? { backgroundColor: bg } : null, outline && styles.badgeOutline]}>
      <Text style={[styles.badgeText, { color: outline ? colors.cloud : fg }]}>{label}</Text>
    </View>
  );
}

/** Step 1: a roster screenshot becomes readable duties. */
export function RosterArt() {
  const cells = [
    [0, 1, 2],
    [1, 2, 4],
    [0, 1],
    [0, 1, 3],
  ];
  return (
    <View style={styles.center}>
      <View style={styles.paper}>
        <Text style={styles.paperTitle}>Roster · NOV</Text>
        {cells.map((row, r) => (
          <View key={r} style={styles.paperRow}>
            {Array.from({ length: 5 }, (_, c) => (
              <View
                key={c}
                style={[
                  styles.paperCell,
                  // Pink is a training day, as highlighted in the airline's calendar view.
                  row.includes(c) ? { backgroundColor: r === 1 && c === 4 ? colors.pink : '#BFD4F2' } : null,
                ]}
              />
            ))}
          </View>
        ))}
      </View>
      <ArrowDownIcon size={30} color={colors.amber} weight="bold" style={{ marginVertical: space.md }} />
      <View style={styles.list}>
        <View style={styles.dutyRow}>
          <Text style={type.mono}>SIN ⇄ BKK</Text>
          <Badge label="Free eve" bg={colors.teal} />
        </View>
        <View style={styles.dutyRow}>
          <Text style={type.mono}>SIN → FRA</Text>
          <Badge label="Trip" bg={colors.amber} />
        </View>
        <View style={styles.dutyRow}>
          <Text style={styles.dutyLabel}>Training</Text>
          <Badge label="9–5" bg={colors.lavender} />
        </View>
      </View>
    </View>
  );
}

function Blobs({ tints }: { tints: string[] }) {
  return (
    <View style={styles.blobs}>
      {tints.map((t, i) => (
        <View key={i} style={[styles.blob, { backgroundColor: t, marginLeft: i === 0 ? 0 : -12 }]} />
      ))}
    </View>
  );
}

/** Step 2: separate groups, plus the partner. */
export function GroupsArt() {
  return (
    <View style={styles.list}>
      <Text style={[type.overline, styles.artOverline]}>MY GROUPS</Text>
      <View style={styles.groupRow}>
        <Blobs tints={[colors.teal, '#7FA6F5', colors.amber]} />
        <View>
          <Text style={type.bodyStrong}>Batch girls</Text>
          <Text style={type.small}>6 · sees destinations</Text>
        </View>
      </View>
      <View style={styles.groupRow}>
        <Blobs tints={[colors.lavender, colors.cloud]} />
        <View>
          <Text style={type.bodyStrong}>Ex-Scoot gang</Text>
          <Text style={type.small}>4 · off days only</Text>
        </View>
      </View>
      <View style={[styles.groupRow, styles.partnerRow]}>
        <Blobs tints={[colors.pink]} />
        <View>
          <Text style={type.bodyStrong}>Partner</Text>
          <Text style={type.small}>Full roster + live flights</Text>
        </View>
      </View>
      <View style={styles.newGroup}>
        <PlusIcon size={18} color={colors.amber} weight="bold" />
        <Text style={[type.bodyStrong, { color: colors.amber }]}>New group</Text>
      </View>
    </View>
  );
}

/** Step 3: ranked days for a group. */
export function JioArt() {
  const days = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
  return (
    <View style={styles.list}>
      <View style={styles.calHeader}>
        <Text style={type.overline}>BATCH GIRLS</Text>
        <Text style={type.small}>November</Text>
      </View>
      {[days.slice(0, 7), days.slice(7)].map((week, w) => (
        <View key={w} style={styles.calWeek}>
          {week.map((d) => (
            <View
              key={d}
              style={[
                styles.calCell,
                d === 10 && styles.calOutlined,
                d === 18 && { backgroundColor: '#5B6782' },
                d === 21 && { backgroundColor: colors.teal },
              ]}>
              <Text
                style={[
                  styles.calText,
                  (d === 10 || d === 18) && { color: colors.cloud, fontFamily: fonts.bold },
                  d === 21 && { color: colors.onCloud, fontFamily: fonts.bold },
                ]}>
                {d}
              </Text>
            </View>
          ))}
        </View>
      ))}
      <DayRow dow="SAT" day={21} text="All 5 off · rested" badge={<Badge label="Great" bg={colors.teal} />} highlight />
      <DayRow dow="WED" day={18} text="Free from 7pm" badge={<Badge label="Evening" bg="#5B6782" fg={colors.cloud} />} />
      <DayRow dow="TUE" day={10} text="2 just back from Europe" badge={<Badge label="Tired" outline />} />
    </View>
  );
}

function DayRow({ dow, day, text, badge, highlight }: { dow: string; day: number; text: string; badge: ReactNode; highlight?: boolean }) {
  return (
    <View style={[styles.dayRow, highlight && styles.dayRowHighlight]}>
      <View style={styles.dayDate}>
        <Text style={styles.dow}>{dow}</Text>
        <Text style={styles.dayNum}>{day}</Text>
      </View>
      <Text style={[type.bodyStrong, styles.dayText]} numberOfLines={2}>
        {text}
      </Text>
      {badge}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  paper: {
    backgroundColor: '#F6F3EC',
    borderRadius: radius.md,
    padding: space.md,
    paddingHorizontal: space.lg,
    gap: 6,
    transform: [{ rotate: '-4deg' }],
    width: 220,
  },
  paperTitle: { fontFamily: fonts.bold, fontSize: 12, color: colors.onCloud, textAlign: 'center', marginBottom: 2 },
  paperRow: { flexDirection: 'row', gap: 6 },
  paperCell: { flex: 1, height: 16, borderRadius: 4 },
  list: { gap: space.md, alignSelf: 'stretch' },
  dutyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  dutyLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.cloud },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeOutline: { borderWidth: 1, borderColor: colors.muted },
  badgeText: { fontFamily: fonts.bold, fontSize: 13 },
  artOverline: { marginBottom: -2 },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.md + 2,
  },
  partnerRow: { borderWidth: 1.5, borderColor: colors.pink },
  blobs: { flexDirection: 'row' },
  blob: { width: 34, height: 34, borderRadius: 12, borderWidth: 2, borderColor: colors.card },
  newGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.amber,
    paddingVertical: space.md + 2,
  },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  calWeek: { flexDirection: 'row', gap: 5, marginBottom: -4 },
  calCell: {
    flex: 1,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calOutlined: { borderWidth: 1.5, borderColor: colors.muted, backgroundColor: 'transparent' },
  calText: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
  },
  dayText: { flex: 1, fontSize: 15, lineHeight: 20 },
  dayRowHighlight: { borderWidth: 1.5, borderColor: colors.teal },
  dayDate: { alignItems: 'center', width: 34 },
  dow: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  dayNum: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 22, color: colors.cloud },
});
