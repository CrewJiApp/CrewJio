// "Type a code" on the Add duty sheet: the user types the code from their roster, we check it
// against the airline's code list (shared/roster-codes.json) as they type, explain it, and ask
// only for what that code needs. Unknown codes are never guessed (CLAUDE.md "Roster import").
import {
  DutyInputError,
  buildCodedDuties,
  codeShape,
  defaultCodeHours,
  displayTime,
  explainCode,
  lookupCode,
  normaliseCode,
  rosterCodeCount,
  searchCodes,
  type CodeMatch,
  type IsoDate,
} from '@crewjio/shared';
import { useEffect, useMemo, useState, type MutableRefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DateField, TextField } from '@/components/fields';
import { CheckCircleIcon, WarningCircleIcon } from '@/components/icons';
import { Button, Chip, ToggleRow } from '@/components/ui';
import { backend } from '@/lib/backend';
import { colors, fonts, radius, space, type } from '@/theme';

/** Saves the form. Resolves true when saved; false when the form is showing an error. */
export type Saver = () => Promise<boolean>;

/** "STANDBY AT BASE 0600-2359" -> "Standby at base 0600-2359". */
const sentence = (s: string) => (s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s);

/** Standby or reserve at base, or while away on a layover. */
export function WherePicker({ away, onAway, airport, onAirport, error }: { away: boolean; onAway: (v: boolean) => void; airport: string; onAirport: (v: string) => void; error?: string }) {
  return (
    <View style={styles.where}>
      <Text style={type.small}>Where</Text>
      <View style={styles.chips} accessibilityRole="radiogroup">
        <Chip label="In Singapore" selected={!away} onPress={() => onAway(false)} />
        <Chip label="On a layover" selected={away} onPress={() => onAway(true)} />
      </View>
      {away ? <TextField label="Layover airport" value={airport} onChangeText={onAirport} placeholder="SFO" autoCapitalize="characters" mono maxLength={3} error={error} /> : null}
    </View>
  );
}

export function CodeEntryForm({
  userId,
  startDate,
  saverRef,
  onUseFlight,
}: {
  userId: string;
  startDate: IsoDate;
  saverRef: MutableRefObject<Saver | null>;
  onUseFlight: () => void;
}) {
  const [query, setQuery] = useState('');
  const [date, setDate] = useState<IsoDate>(startDate);
  const [endDate, setEndDate] = useState<IsoDate>(startDate);
  const [manyDays, setManyDays] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [away, setAway] = useState(false);
  const [airport, setAirport] = useState('');
  const [allowUnknown, setAllowUnknown] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const code = normaliseCode(query);
  const info = code ? lookupCode(code) : undefined;
  const match: CodeMatch | null = useMemo(() => (info ? { code, ...info } : null), [code, info]);
  const suggestions = useMemo(() => (match ? [] : searchCodes(query, 5)), [query, match]);
  // Not in the list. While suggestions are still showing the user is probably mid-search, so the
  // warning waits until nothing matches or they try to save.
  const unknown = !match && code.length >= 2 && (suggestions.length === 0 || !!errors.code);
  const shape = match ? codeShape(match.category) : 'days';
  const onCall = match?.category === 'standby' || match?.category === 'reserve';

  // Typing or picking a code. A newly recognised code fills in its usual hours.
  const changeQuery = (v: string) => {
    setQuery(v);
    setAllowUnknown(false);
    const next = normaliseCode(v);
    const known = next ? lookupCode(next) : undefined;
    if (!known || next === code) return;
    const hours = defaultCodeHours({ code: next, ...known });
    setStart(hours ? displayTime(hours.start) : '');
    setEnd(hours ? displayTime(hours.end) : '');
    setErrors({});
  };

  const save: Saver = async () => {
    setErrors({});
    try {
      const duties = buildCodedDuties({
        code,
        date,
        endDate: shape === 'days' && manyDays ? endDate : undefined,
        start,
        end,
        where: (onCall || match?.category === 'layover') && away ? airport : undefined,
        allowUnknown,
      });
      await backend.addDuties(userId, duties);
      return true;
    } catch (e) {
      if (e instanceof DutyInputError) {
        setErrors({ [e.field]: !match && code.length >= 2 && e.field === 'code' && !allowUnknown ? 'Check the code, pick one from the list, or switch on “Save it anyway”.' : e.message });
        return false;
      }
      throw e;
    }
  };
  // The sheet's Save button calls the latest version of this form's save.
  useEffect(() => {
    saverRef.current = save;
  });

  return (
    <View style={styles.wrap}>
      <TextField
        label="Roster code"
        value={query}
        onChangeText={changeQuery}
        placeholder="STBY, OFFD, AALV, NTSV…"
        autoCapitalize="characters"
        mono
        maxLength={24}
        error={errors.code}
      />

      {suggestions.length > 0 ? (
        <View style={styles.list} accessibilityLabel="Matching codes">
          {suggestions.map((s) => (
            <Pressable
              key={s.code}
              onPress={() => changeQuery(s.code)}
              accessibilityRole="button"
              accessibilityLabel={`${s.code}, ${sentence(s.description)}`}
              style={({ pressed }) => [styles.suggestion, pressed && { opacity: 0.8 }]}>
              <Text style={styles.suggestionCode}>{s.code}</Text>
              <View style={styles.flex}>
                <Text style={type.bodyStrong} numberOfLines={1}>
                  {sentence(s.description)}
                </Text>
                <Text style={type.small} numberOfLines={1}>
                  Friends see {s.category === 'private' ? 'Unavailable' : s.friendsSee}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {match ? (
        <View style={[styles.result, styles.resultOk]} accessibilityLiveRegion="polite">
          <CheckCircleIcon size={24} color={colors.teal} weight="fill" />
          <View style={styles.flex}>
            <Text style={type.bodyStrong}>
              {match.code} · {sentence(match.description)}
            </Text>
            <Text style={type.small}>{explainCode(match)}</Text>
          </View>
        </View>
      ) : null}

      {unknown ? (
        <View style={[styles.result, styles.resultWarn]} accessibilityLiveRegion="polite">
          <WarningCircleIcon size={24} color={colors.amber} weight="fill" />
          <View style={styles.flex}>
            <Text style={type.bodyStrong}>{code} isn’t in our code list</Text>
            <Text style={type.small}>
              We check against {rosterCodeCount().toLocaleString('en-SG')} airline codes. Check it against your roster{suggestions.length ? ', or pick one above' : ''}.
            </Text>
          </View>
        </View>
      ) : null}
      {unknown ? <ToggleRow title="Save it anyway" subtitle="We’ll save it as Busy, so friends see Busy. Only you see the code." value={allowUnknown} onChange={setAllowUnknown} /> : null}

      {match && shape === 'flight' ? (
        <View style={styles.card}>
          <Text style={type.body}>{match.code} is a flight. Add the flight number and times in the Flight tab.</Text>
          <Button label="Add a flight" variant="outline" onPress={onUseFlight} />
        </View>
      ) : null}

      {match && shape === 'timed' ? (
        <>
          <DateField label="Date" value={date} onChange={setDate} error={errors.date} />
          <View style={styles.pair}>
            <TextField label="Starts" value={start} onChangeText={setStart} placeholder="hh:mm" keyboardType="numbers-and-punctuation" mono maxLength={5} error={errors.start} style={styles.flex} />
            <TextField label="Ends" value={end} onChangeText={setEnd} placeholder="hh:mm" keyboardType="numbers-and-punctuation" mono maxLength={5} error={errors.end} style={styles.flex} />
          </View>
          {onCall ? <WherePicker away={away} onAway={setAway} airport={airport} onAirport={setAirport} error={errors.where} /> : null}
        </>
      ) : null}

      {(match && shape === 'days') || (unknown && allowUnknown) ? (
        <>
          <DateField
            label={manyDays ? 'From' : 'Date'}
            value={date}
            onChange={(d) => {
              setDate(d);
              if (endDate < d) setEndDate(d);
            }}
            error={errors.date}
          />
          <ToggleRow title="More than one day" subtitle="Same code on every day, like a week of leave" value={manyDays} onChange={setManyDays} />
          {manyDays ? <DateField label="Until" value={endDate} onChange={setEndDate} minimumDate={date} error={errors.endDate} /> : null}
          {match?.category === 'layover' ? (
            <TextField label="Layover airport" value={airport} onChangeText={(v) => { setAirport(v); setAway(true); }} placeholder="LHR" autoCapitalize="characters" mono maxLength={3} error={errors.where} />
          ) : null}
        </>
      ) : null}

      {!query ? (
        <Text style={type.small}>Type the code exactly as it shows on your roster. We tell you what it means and what your friends will see.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  flex: { flex: 1, gap: 2 },
  pair: { flexDirection: 'row', gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  where: { gap: space.sm },
  list: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', marginTop: -space.sm },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingHorizontal: space.lg, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  suggestionCode: { fontFamily: fonts.monoBold, fontSize: 16, color: colors.amber, minWidth: 62 },
  result: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, borderRadius: radius.lg, padding: space.lg, borderWidth: 1.5 },
  resultOk: { borderColor: colors.teal, backgroundColor: '#123033' },
  resultWarn: { borderColor: colors.amber, backgroundColor: '#2A2414' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: space.md },
});
