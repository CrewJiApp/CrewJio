// Small building blocks shared by the onboarding screens.
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CaretLeftIcon, CheckIcon } from '@/components/icons';
import { colors, fonts, radius, space, touch, type } from '@/theme';

/** Full-screen navy page with safe-area padding. */
export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <SafeAreaView style={[styles.screen, style]} edges={['top', 'bottom', 'left', 'right']}>
      {children}
    </SafeAreaView>
  );
}

/** 44px back button for screens without a navigation header. */
export function BackButton() {
  if (!router.canGoBack()) return <View style={styles.back} />;
  return (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel="Back"
      style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
      <CaretLeftIcon size={24} color={colors.cloud} />
    </Pressable>
  );
}

type ButtonVariant = 'primary' | 'light' | 'outline' | 'text';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  icon,
  style,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityHint={accessibilityHint}
      hitSlop={variant === 'text' ? 8 : 0}
      style={({ pressed }) => [
        styles.button,
        buttonStyles[variant],
        disabled && (variant === 'primary' ? styles.primaryDisabled : styles.buttonDisabled),
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      {icon}
      <Text style={[styles.buttonLabel, { color: disabled && variant === 'primary' ? colors.subtle : labelColors[variant] }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const labelColors: Record<ButtonVariant, string> = {
  primary: colors.onAmber,
  light: colors.onCloud,
  outline: colors.cloud,
  text: colors.amber,
};

const buttonStyles = StyleSheet.create({
  primary: { backgroundColor: colors.amber },
  light: { backgroundColor: colors.cloud },
  outline: { borderWidth: 1, borderColor: colors.border },
  text: { minHeight: touch },
});

/** "STEP 1 OF 3" + title + subtitle, as in the role picker mockup. */
export function StepHeader({ step, total, title, subtitle }: { step: number; total: number; title: string; subtitle?: string }) {
  return (
    <View style={styles.stepHeader}>
      <Text style={type.overline} accessibilityLabel={`Step ${step} of ${total}`}>
        STEP {step} OF {total}
      </Text>
      <Text style={type.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={type.body}>{subtitle}</Text> : null}
    </View>
  );
}

/** Large selectable card with a leading visual, used for role and rank. */
export function OptionCard({
  title,
  subtitle,
  leading,
  selected,
  onPress,
  multi,
}: {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  selected: boolean;
  onPress: () => void;
  multi?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={multi ? { checked: selected } : { selected }}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={({ pressed }) => [styles.optionCard, selected && styles.optionCardSelected, pressed && styles.pressed]}>
      {leading}
      <View style={styles.optionText}>
        <Text style={type.heading}>{title}</Text>
        {subtitle ? <Text style={type.small}>{subtitle}</Text> : null}
      </View>
      {selected ? <CheckIcon size={22} color={colors.amber} weight="bold" /> : null}
    </Pressable>
  );
}

/** Pill chip for short choices such as airline or fleet. */
export function Chip({
  label,
  selected,
  onPress,
  multi,
  mono,
  style,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  multi?: boolean;
  mono?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={multi ? { checked: selected } : { selected }}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed, style]}>
      {multi && selected ? <CheckIcon size={16} color={colors.onCloud} weight="bold" /> : null}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        style={[
          styles.chipLabel,
          mono && { fontFamily: fonts.mono },
          { color: selected ? colors.onCloud : colors.cloud },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Bordered note with an icon, like the privacy note on the role picker. */
export function InfoNote({ icon, children }: { icon: ReactNode; children: string }) {
  return (
    <View style={styles.note}>
      {icon}
      <Text style={[type.small, styles.noteText]}>{children}</Text>
    </View>
  );
}

/** Card row with a title, explanation and a switch. */
export function ToggleRow({
  title,
  subtitle,
  value,
  onChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={`${title}. ${subtitle}`}
      style={({ pressed }) => [styles.toggleRow, pressed && styles.pressed]}>
      <View style={styles.optionText}>
        <Text style={type.bodyStrong}>{title}</Text>
        <Text style={type.small}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.amber }}
        thumbColor={colors.cloud}
        ios_backgroundColor={colors.border}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return <Text style={[type.small, styles.sectionLabel]}>{children}</Text>;
}

/** Pager dots: the active one is a wider amber pill. */
export function PageDots({ count, index }: { count: number; index: number }) {
  return (
    <View style={styles.dots} accessibilityLabel={`Page ${index + 1} of ${count}`} accessible>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  pressed: { opacity: 0.8 },
  back: { width: touch, height: touch, marginLeft: -10, alignItems: 'center', justifyContent: 'center' },
  button: {
    minHeight: 56,
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  buttonDisabled: { opacity: 0.4 },
  primaryDisabled: { backgroundColor: colors.cardRaised },
  buttonLabel: { fontFamily: fonts.bold, fontSize: 18 },
  stepHeader: { gap: space.sm },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    minHeight: 88,
    padding: space.lg + 4,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  optionCardSelected: { borderColor: colors.amber, backgroundColor: colors.card },
  optionText: { flex: 1, gap: 2 },
  chip: {
    minHeight: 52,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  chipSelected: { backgroundColor: colors.cloud, borderColor: colors.cloud },
  chipLabel: { fontFamily: fonts.semibold, fontSize: 16 },
  note: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteText: { flex: 1 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    minHeight: 72,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  sectionLabel: { marginBottom: -space.xs },
  dots: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
  dotActive: { width: 32, backgroundColor: colors.amber },
});
