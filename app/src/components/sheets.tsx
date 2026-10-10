// Shared bits for slide-up sheets: the Cancel / Title / Action header and the sharing level picker.
import { SHARING_LEVELS, type SharingLevel } from '@crewjio/shared';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, space, touch } from '@/theme';

export function SheetHeader({ title, action, onAction, busy }: { title: string; action?: string; onAction?: () => void; busy?: boolean }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.headerBtn} hitSlop={8}>
        <Text style={styles.headerAction}>Cancel</Text>
      </Pressable>
      <Text style={styles.headerTitle} accessibilityRole="header">
        {title}
      </Text>
      <View style={[styles.headerBtn, styles.headerRight]}>
        {action && onAction ? (
          <Pressable onPress={onAction} disabled={busy} accessibilityRole="button" hitSlop={8}>
            <Text style={[styles.headerAction, styles.headerBold, busy && { opacity: 0.5 }]}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const LEVEL_TEXT: Record<SharingLevel, string> = {
  off_days: 'Off days only',
  destinations: '+ Where I’m flying',
  full: 'Full roster',
};

export const LEVEL_EXPLAIN: Record<SharingLevel, string> = {
  off_days: 'They see when you’re off, busy or away. No destinations, no times.',
  destinations: 'They also see where you’re flying and what kind of duty it is.',
  full: 'They also see flight numbers and times. Private days always show as Unavailable.',
};

/** "This group sees" (mockup 14). */
export function LevelPicker({ value, onChange }: { value: SharingLevel; onChange: (l: SharingLevel) => void }) {
  return (
    <View style={styles.levels} accessibilityRole="radiogroup">
      {SHARING_LEVELS.map((l) => (
        <Pressable
          key={l}
          onPress={() => onChange(l)}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === l }}
          style={({ pressed }) => [styles.level, value === l && styles.levelOn, pressed && { opacity: 0.85 }]}>
          <Text style={[styles.levelText, value === l && styles.levelTextOn]}>{LEVEL_TEXT[l]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.sm },
  headerBtn: { minWidth: 72, minHeight: touch, justifyContent: 'center' },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.bold, fontSize: 19, color: colors.cloud },
  headerAction: { fontFamily: fonts.medium, fontSize: 18, color: colors.amber },
  headerBold: { fontFamily: fonts.bold },
  levels: { flexDirection: 'row', gap: 8 },
  level: { flex: 1, minHeight: 60, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', padding: 6 },
  levelOn: { borderColor: colors.amber, backgroundColor: colors.card },
  levelText: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 19, color: colors.cloud, textAlign: 'center' },
  levelTextOn: { fontFamily: fonts.bold },
});
