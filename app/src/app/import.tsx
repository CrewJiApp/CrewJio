// Screenshot roster import: choose 1 to 4 screenshots of your roster app, we read them, and you
// check what was found before anything is saved. Codes that are not in the airline code list are
// flagged "needs a look" and are never guessed. Screenshots are not stored anywhere.
import {
  dayBadge,
  finalDuties,
  hasUnresolved,
  importLabel,
  importedDays,
  rowsToDuties,
  shortDate,
  summariseImport,
  type NewDuty,
} from '@crewjio/shared';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CameraIcon, FilePdfIcon, LockSimpleIcon, TrashIcon, WarningCircleIcon } from '@/components/icons';
import { TONE_STYLE } from '@/components/roster-calendar';
import { SheetHeader } from '@/components/sheets';
import { Button, InfoNote } from '@/components/ui';
import { backend } from '@/lib/backend';
import {
  IMPORTS_PER_MONTH,
  MAX_SCREENSHOTS,
  demoMode,
  checkPdf,
  importErrorMessage,
  importsLeft,
  prepareFiles,
  readRoster,
  sampleRoster,
  type Picked,
} from '@/lib/roster-import';
import { useAuth } from '@/state/auth';
import { colors, fonts, radius, space, touch, type } from '@/theme';

type Phase = 'pick' | 'reading' | 'review' | 'saving';

function askReplace(count: number): Promise<boolean> {
  const message = `You already have ${count} ${count === 1 ? 'duty' : 'duties'} on these days. Replace ${count === 1 ? 'it' : 'them'} with what we found? Leave and holidays stay as they are.`;
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message));
  return new Promise((resolve) =>
    Alert.alert('Replace what you have?', message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Replace', style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

export default function ImportRoster() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>('pick');
  const [images, setImages] = useState<Picked[]>([]);
  const [found, setFound] = useState<NewDuty[]>([]);
  const [dropped, setDropped] = useState(0);
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const [confirmed, setConfirmed] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const preview = demoMode();
  const hasPdf = images.some((i) => i.kind === 'pdf');

  useEffect(() => {
    void importsLeft().then(setLeft);
  }, []);

  const decisions = useMemo(() => ({ removed, confirmed }), [removed, confirmed]);
  const summary = useMemo(() => summariseImport(found), [found]);
  const unresolved = hasUnresolved(found, decisions);
  const pending = found.filter((d, i) => d.needsReview && !removed.has(i) && !confirmed.has(i)).length;
  const toSave = useMemo(() => finalDuties(found, decisions), [found, decisions]);

  const choose = async () => {
    setError(null);
    const room = MAX_SCREENSHOTS - images.length;
    if (room <= 0 || hasPdf) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: room, quality: 1 });
    if (result.canceled) return;
    setImages((current) => [...current, ...result.assets.map((a) => ({ kind: 'image' as const, uri: a.uri, width: a.width }))].slice(0, MAX_SCREENSHOTS));
  };

  // One roster PDF, on its own: never mixed with screenshots.
  const choosePdf = async () => {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', multiple: false, copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    const file = result.assets[0];
    try {
      checkPdf(file);
    } catch (e) {
      setError(importErrorMessage(e));
      return;
    }
    setImages([{ kind: 'pdf', uri: file.uri, name: file.name, size: file.size ?? 0 }]);
  };

  const show = (duties: NewDuty[], skipped: number) => {
    setFound(duties);
    setDropped(skipped);
    setRemoved(new Set());
    setConfirmed(new Set());
    setPhase('review');
  };

  const read = async () => {
    setError(null);
    setPhase('reading');
    try {
      const prepared = await prepareFiles(images);
      const result = await readRoster(prepared);
      show(rowsToDuties(result.rows), result.dropped);
      void importsLeft().then(setLeft);
    } catch (e) {
      setError(importErrorMessage(e));
      setPhase('pick');
    }
  };

  const trySample = () => {
    setError(null);
    show(rowsToDuties(sampleRoster()), 0);
  };

  const toggle = (set: Set<number>, i: number, on: boolean) => {
    const next = new Set(set);
    if (on) next.add(i);
    else next.delete(i);
    return next;
  };

  const save = async () => {
    if (!user || toSave.length === 0) return;
    setPhase('saving');
    try {
      const days = importedDays(toSave);
      const from = days[0]!;
      const to = days[days.length - 1]!;
      const existing = (await backend.loadRoster(user.id, from, to)).duties;
      if (existing.length > 0) {
        if (!(await askReplace(existing.length))) {
          setPhase('review');
          return;
        }
        await backend.replaceDutiesInRange(user.id, from, to, toSave);
      } else {
        await backend.addDuties(user.id, toSave);
      }
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Please try again.');
      setPhase('review');
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <SheetHeader title={phase === 'review' || phase === 'saving' ? 'Check your roster' : 'Import roster'} />

      {phase === 'pick' ? (
        <>
          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.hero}>
              <View style={styles.icon}>
                <CameraIcon size={30} color={colors.amber} />
              </View>
              <Text style={type.title} accessibilityRole="header">
                Import your whole month
              </Text>
              <Text style={type.body}>Screenshot your roster in your airline’s roster app, list view or calendar view, and choose up to {MAX_SCREENSHOTS} screenshots. Or choose one PDF of your roster, up to 2.5 MB. We read the flights, standby and training days for you.</Text>
            </View>

            {images.length > 0 ? (
              <View style={styles.thumbs}>
                {images.map((img, i) =>
                  img.kind === 'pdf' ? (
                    <View key={img.uri} style={styles.pdfCard}>
                      <FilePdfIcon size={28} color={colors.amber} />
                      <View style={styles.flex}>
                        <Text style={type.bodyStrong} numberOfLines={1}>
                          {img.name}
                        </Text>
                        <Text style={type.small}>{(img.size / 1_000_000).toFixed(1)} MB</Text>
                      </View>
                      <Pressable onPress={() => setImages([])} accessibilityRole="button" accessibilityLabel="Remove the PDF" style={styles.trash}>
                        <TrashIcon size={20} color={colors.muted} />
                      </Pressable>
                    </View>
                  ) : (
                    <View key={img.uri} style={styles.thumbWrap}>
                      <Image source={{ uri: img.uri }} style={styles.thumb} accessibilityLabel={`Screenshot ${i + 1}`} />
                      <Pressable onPress={() => setImages((c) => c.filter((_, k) => k !== i))} accessibilityRole="button" accessibilityLabel={`Remove screenshot ${i + 1}`} style={styles.thumbRemove} hitSlop={6}>
                        <TrashIcon size={18} color={colors.cloud} />
                      </Pressable>
                    </View>
                  ),
                )}
              </View>
            ) : null}

            {!hasPdf && images.length < MAX_SCREENSHOTS ? <Button label={images.length === 0 ? 'Choose screenshots' : 'Add more screenshots'} variant="outline" onPress={choose} /> : null}
            {images.length === 0 ? <Button label="Choose a PDF instead" variant="text" onPress={choosePdf} /> : null}

            <InfoNote icon={<LockSimpleIcon size={20} color={colors.muted} />}>
              Screenshots and PDFs are read once and never stored. Staff numbers and aircraft details are removed, and nothing is saved until you check it.
            </InfoNote>

            {left !== null ? (
              <Text style={type.small}>
                {left} of {IMPORTS_PER_MONTH} imports left this month.
              </Text>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>
          <View style={styles.footer}>
            <Button label="Read my roster" disabled={images.length === 0} onPress={read} />
            {preview ? <Button label="Try a sample roster" variant="text" onPress={trySample} /> : null}
          </View>
        </>
      ) : null}

      {phase === 'reading' ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.amber} />
          <Text style={type.title}>Reading your roster</Text>
          <Text style={[type.body, styles.centerText]}>This can take up to a minute. Nothing you chose is stored.</Text>
        </View>
      ) : null}

      {phase === 'review' || phase === 'saving' ? (
        <>
          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.summary} accessible accessibilityLabel={`Read ${summary.duties} duties${pending ? `, ${pending} need a look` : ''}`}>
              <Text style={type.heading}>
                Read {summary.duties} {summary.duties === 1 ? 'duty' : 'duties'}
              </Text>
              <Text style={type.small}>
                {summary.from && summary.to ? `${shortDate(summary.from)} to ${shortDate(summary.to)}` : ''}
                {pending ? ` · ${pending} need${pending === 1 ? 's' : ''} a look` : ''}
              </Text>
            </View>
            {dropped > 0 ? <Text style={type.small}>{dropped} {dropped === 1 ? 'row' : 'rows'} could not be read and {dropped === 1 ? 'was' : 'were'} skipped. Add anything missing by hand.</Text> : null}

            {found.map((d, i) => {
              const label = importLabel(d);
              const [dow, ...rest] = shortDate(d.date).split(' ');
              if (removed.has(i)) {
                return (
                  <View key={i} style={[styles.row, styles.rowRemoved]}>
                    <Text style={[type.small, styles.flex]}>Removed: {label.title}</Text>
                    <Pressable onPress={() => setRemoved(toggle(removed, i, false))} accessibilityRole="button" style={styles.textBtn}>
                      <Text style={styles.textBtnLabel}>Undo</Text>
                    </Pressable>
                  </View>
                );
              }
              const flagged = d.needsReview;
              const ok = confirmed.has(i);
              const tone = TONE_STYLE[dayBadge(d.date, [d], []).tone];
              return (
                <View key={i} style={[styles.row, flagged && !ok && styles.rowFlagged]}>
                  <View style={[styles.stripe, { backgroundColor: flagged && !ok ? colors.amber : tone.border }]} />
                  <View style={styles.dateBlock}>
                    <Text style={styles.dow}>{dow?.toUpperCase()}</Text>
                    <Text style={styles.dayNum}>{rest.join(' ')}</Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={d.kind === 'flight' ? styles.mono : type.bodyStrong}>{flagged && ok ? `${d.code} · Busy` : label.title}</Text>
                    {label.detail ? <Text style={type.small}>{flagged && ok ? 'Saved as Busy. Only you see the code.' : label.detail}</Text> : null}
                    {flagged && !ok ? (
                      <View style={styles.flagActions}>
                        <Pressable onPress={() => setConfirmed(toggle(confirmed, i, true))} accessibilityRole="button" accessibilityLabel={`Save ${d.code} as Busy`} style={[styles.pill, styles.pillOn]}>
                          <Text style={styles.pillOnText}>Save as Busy</Text>
                        </Pressable>
                        <Pressable onPress={() => setRemoved(toggle(removed, i, true))} accessibilityRole="button" accessibilityLabel={`Remove ${d.code}`} style={styles.pill}>
                          <Text style={styles.pillText}>Remove</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                  {flagged && !ok ? (
                    <WarningCircleIcon size={22} color={colors.amber} weight="fill" />
                  ) : (
                    <Pressable onPress={() => setRemoved(toggle(removed, i, true))} accessibilityRole="button" accessibilityLabel={`Remove ${label.title}`} style={styles.trash}>
                      <TrashIcon size={20} color={colors.muted} />
                    </Pressable>
                  )}
                </View>
              );
            })}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>
          <View style={styles.footer}>
            {unresolved ? <Text style={styles.hint}>Save as Busy or remove the entries marked with a warning first.</Text> : null}
            <Button
              label={phase === 'saving' ? 'Saving…' : `Looks right, add ${toSave.length} to my roster`}
              disabled={unresolved || toSave.length === 0 || phase === 'saving'}
              onPress={save}
            />
            <Button label="Start again" variant="text" disabled={phase === 'saving'} onPress={() => setPhase('pick')} />
          </View>
        </>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  flex: { flex: 1, gap: 2 },
  body: { padding: space.xl, paddingTop: space.sm, gap: space.lg },
  hero: { gap: space.md },
  icon: { width: 60, height: 60, borderRadius: 18, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  pdfCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.card, borderRadius: radius.lg, paddingLeft: space.lg, minHeight: 64, width: '100%' },
  thumbWrap: { width: 78, height: 130 },
  thumb: { width: 78, height: 130, borderRadius: 12, backgroundColor: colors.card },
  thumbRemove: { position: 'absolute', top: 4, right: 4, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(14,23,38,0.85)', alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl },
  centerText: { textAlign: 'center' },
  summary: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.card, borderRadius: radius.lg, paddingVertical: space.md, paddingRight: space.md, paddingLeft: space.sm, overflow: 'hidden' },
  rowFlagged: { borderWidth: 1.5, borderColor: colors.amber, backgroundColor: '#2A2414' },
  rowRemoved: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border, paddingLeft: space.lg, minHeight: touch },
  stripe: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  dateBlock: { width: 46, alignItems: 'center' },
  dow: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  dayNum: { fontFamily: fonts.bold, fontSize: 15, color: colors.cloud, textAlign: 'center' },
  mono: { fontFamily: fonts.monoBold, fontSize: 16, color: colors.cloud },
  flagActions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm, flexWrap: 'wrap' },
  pill: { minHeight: touch, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: colors.amber, borderColor: colors.amber },
  pillText: { fontFamily: fonts.bold, fontSize: 15, color: colors.cloud },
  pillOnText: { fontFamily: fonts.bold, fontSize: 15, color: colors.onAmber },
  trash: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center' },
  textBtn: { minHeight: touch, minWidth: touch, alignItems: 'center', justifyContent: 'center' },
  textBtnLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.amber },
  error: { ...type.small, color: '#F07A7A' },
  hint: { ...type.small, textAlign: 'center' },
  footer: { paddingHorizontal: space.xl, paddingBottom: space.md, paddingTop: space.sm, gap: space.xs },
});
