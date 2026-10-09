// 3-step tour (mockups 03, 04, 05). Swipe or tap Next; Skip goes straight in.
import { router } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { GroupsArt, JioArt, RosterArt } from '@/components/tour-art';
import { Button, PageDots, Screen } from '@/components/ui';
import { colors, radius, space, touch, type } from '@/theme';

interface Slide {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  art: ReactNode;
}

const SLIDES: Slide[] = [
  {
    key: 'roster',
    eyebrow: 'STEP 1 · YOUR ROSTER',
    title: "Snap it, don't type it",
    body: 'Screenshot your month in the airline app and upload. We read the flights, standby and training days for you.',
    art: <RosterArt />,
  },
  {
    key: 'groups',
    eyebrow: 'STEP 2 · YOUR PEOPLE',
    title: 'A group for each circle',
    body: 'Not everyone knows everyone. Each group only sees its own members, and you choose what each group sees.',
    art: <GroupsArt />,
  },
  {
    key: 'jio',
    eyebrow: 'STEP 3 · JIO',
    title: 'See the best day, then jio',
    body: 'We rank days by rest, so nobody gets jio-ed to dinner straight after a London flight. Tap one to send a poll.',
    art: <JioArt />,
  },
];

export default function Tour() {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));

  const finish = () => router.replace('/roster');
  const next = () => {
    if (last) {
      // "Upload my roster": land on the roster with Add duty open.
      finish();
      router.push('/add-duty');
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: !reduceMotion });
    setIndex(index + 1);
  };

  // Same card size on every slide; it only grows if a small screen needs more room.
  const artHeight = Math.min(440, height * 0.46);

  return (
    <Screen>
      <View style={styles.topBar}>
        {!last ? (
          <Pressable onPress={finish} accessibilityRole="button" hitSlop={8} style={styles.skip}>
            <Text style={[type.body, { color: colors.muted }]}>Skip</Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <ScrollView style={{ width }} contentContainerStyle={styles.slide} showsVerticalScrollIndicator={false}>
            <View style={[styles.artCard, { minHeight: artHeight }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {item.art}
            </View>
            <View style={styles.copy}>
              <Text style={type.eyebrow}>{item.eyebrow}</Text>
              <Text style={type.title} accessibilityRole="header">
                {item.title}
              </Text>
              <Text style={[type.body, styles.body]}>{item.body}</Text>
            </View>
          </ScrollView>
        )}
      />

      <View style={styles.footer}>
        <PageDots count={SLIDES.length} index={index} />
        <Button label={last ? 'Upload my roster' : 'Next'} onPress={next} style={styles.next} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { height: touch, alignItems: 'flex-end', paddingHorizontal: space.lg },
  skip: { minWidth: touch, minHeight: touch, justifyContent: 'center', alignItems: 'center' },
  slide: { paddingHorizontal: space.xl + 4, paddingBottom: space.lg, gap: space.xxl },
  artCard: {
    marginHorizontal: space.sm,
    borderRadius: radius.lg + 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#121D30',
    padding: space.xl - 4,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  copy: { gap: space.md },
  body: { fontSize: 17, lineHeight: 25 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl + 4,
    paddingBottom: space.md,
    paddingTop: space.sm,
  },
  next: { paddingHorizontal: space.xxl },
});
