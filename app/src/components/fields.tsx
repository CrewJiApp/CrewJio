// Form fields: labelled text input and a date field using the platform's native date picker.
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { longDate, type IsoDate } from '@crewjio/shared';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, radius, space, type } from '@/theme';

export function Field({ label, error, children, style }: { label: string; error?: string | null; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={type.small}>{label}</Text>
      {children}
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  mono,
  keyboardType,
  autoCapitalize = 'none',
  maxLength,
  style,
  autoFocus,
  onFocus,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  error?: string | null;
  mono?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'characters' | 'words' | 'sentences';
  maxLength?: number;
  style?: StyleProp<ViewStyle>;
  autoFocus?: boolean;
  onFocus?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label} error={error} style={style}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.subtle}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        maxLength={maxLength}
        autoFocus={autoFocus}
        accessibilityLabel={label}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => setFocused(false)}
        keyboardAppearance="dark"
        style={[styles.input, mono && styles.mono, focused && styles.inputFocused, !!error && styles.inputError]}
      />
    </Field>
  );
}

const toDate = (iso: IsoDate) => new Date(`${iso}T12:00:00`);
const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Date field. iOS shows the calendar inline under the field; Android opens the system dialog. */
export function DateField({
  label,
  value,
  onChange,
  error,
  minimumDate,
  style,
}: {
  label: string;
  value: IsoDate;
  onChange: (iso: IsoDate) => void;
  error?: string | null;
  minimumDate?: IsoDate;
  style?: StyleProp<ViewStyle>;
}) {
  const [open, setOpen] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <TextField label={label} value={value} onChangeText={onChange} placeholder="2026-10-03" error={error} mono style={style} />
    );
  }

  const onPicked = (e: DateTimePickerEvent, d?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (e.type === 'set' && d) onChange(toIso(d));
  };

  const press = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: toDate(value),
        mode: 'date',
        onChange: onPicked,
        minimumDate: minimumDate ? toDate(minimumDate) : undefined,
      });
    } else {
      setOpen((o) => !o);
    }
  };

  return (
    <Field label={label} error={error} style={style}>
      <Pressable
        onPress={press}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${longDate(value)}`}
        accessibilityHint="Opens a calendar"
        style={({ pressed }) => [styles.input, styles.dateInput, open && styles.inputFocused, !!error && styles.inputError, pressed && { opacity: 0.85 }]}>
        <Text style={styles.dateText}>{longDate(value)}</Text>
      </Pressable>
      {open && Platform.OS === 'ios' ? (
        <View style={styles.pickerWrap}>
          <DateTimePicker
            value={toDate(value)}
            mode="date"
            display="inline"
            themeVariant="dark"
            accentColor={colors.amber}
            minimumDate={minimumDate ? toDate(minimumDate) : undefined}
            onChange={(e, d) => {
              onPicked(e, d);
              setOpen(false);
            }}
          />
        </View>
      ) : null}
    </Field>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  input: {
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: space.lg,
    color: colors.cloud,
    fontFamily: fonts.medium,
    fontSize: 18,
  },
  mono: { fontFamily: fonts.mono, fontSize: 19, letterSpacing: 0.5 },
  inputFocused: { borderColor: colors.amber },
  inputError: { borderColor: '#F07A7A' },
  dateInput: { justifyContent: 'center' },
  dateText: { fontFamily: fonts.medium, fontSize: 18, color: colors.cloud },
  pickerWrap: { backgroundColor: colors.card, borderRadius: radius.md, overflow: 'hidden' },
  error: { fontFamily: fonts.medium, fontSize: 14, color: '#F07A7A' },
});
