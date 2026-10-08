// Brand visuals drawn in SVG: logo mark, welcome flight paths, crew name tags, pilot stripes.
import { useEffect, useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Path, Pattern, Rect, Text as SvgText } from 'react-native-svg';

import { colors, fonts } from '@/theme';

/** Two flight paths meeting at one point: the CrewJio mark on a navy tile. */
export function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="CrewJio">
      <Rect width={100} height={100} rx={24} fill={colors.card} />
      <Path d="M24 80 C27 55 36 38 50 31" stroke={colors.amber} strokeWidth={9} strokeLinecap="round" fill="none" />
      <Path d="M76 80 C73 55 64 38 50 31" stroke={colors.teal} strokeWidth={9} strokeLinecap="round" fill="none" />
      <Circle cx={50} cy={30} r={9} fill={colors.cloud} />
    </Svg>
  );
}

export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <Text style={{ fontFamily: fonts.bold, fontSize: size, color: colors.cloud }} accessibilityRole="header">
      Crew<Text style={{ color: colors.amber }}>Jio</Text>
    </Text>
  );
}

// Welcome hero geometry (viewBox 390 x 330). One quadratic arc split at its apex.
const APEX = { x: 195, y: 120 };
const LEFT = `M0 320 Q97.5 120 ${APEX.x} ${APEX.y}`;
const RIGHT = `M${APEX.x} ${APEX.y} Q292.5 120 390 320`;
const INNER = 'M-30 330 Q195 0 420 330';
/** Length of each half of the arc, for the draw-on animation (measured from the curve). */
const HALF_LENGTH = quadLength([0, 320], [97.5, 120], [195, 120]);

function quadLength(p0: number[], c: number[], p1: number[]): number {
  let len = 0;
  let prev = p0;
  for (let i = 1; i <= 64; i++) {
    const t = i / 64;
    const pt = [0, 1].map((k) => (1 - t) ** 2 * p0[k]! + 2 * t * (1 - t) * c[k]! + t ** 2 * p1[k]!);
    len += Math.hypot(pt[0]! - prev[0]!, pt[1]! - prev[1]!);
    prev = pt;
  }
  return Math.ceil(len);
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

/** Your path (amber, from LHR) and theirs (teal, from NRT) meeting over SIN. */
export function FlightPathHero({ height = 330 }: { height?: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <View style={{ height }} accessible accessibilityLabel="Two flight paths, from London and Tokyo, meeting over Singapore">
      <Svg width="100%" height="100%" viewBox="0 0 390 330" preserveAspectRatio="xMidYMax slice">
        <Path d={INNER} stroke={colors.border} strokeWidth={2} strokeDasharray="2 8" strokeLinecap="round" fill="none" />
        {reduceMotion ? (
          // Reduced motion: no animation code path at all, just the finished drawing.
          <>
            <Path d={LEFT} stroke={colors.amber} strokeWidth={4} strokeLinecap="round" fill="none" />
            <Path d={RIGHT} stroke={colors.teal} strokeWidth={4} strokeLinecap="round" fill="none" />
            <MeetingPoint />
          </>
        ) : (
          <AnimatedPaths />
        )}
        <SvgText x={APEX.x} y={APEX.y - 40} fill={colors.cloud} fontFamily={fonts.monoBold} fontSize={13} textAnchor="middle">
          SIN
        </SvgText>
        <SvgText x={48} y={300} fill={colors.muted} fontFamily={fonts.mono} fontSize={13} textAnchor="middle">
          LHR
        </SvgText>
        <SvgText x={342} y={300} fill={colors.muted} fontFamily={fonts.mono} fontSize={13} textAnchor="middle">
          NRT
        </SvgText>
      </Svg>
    </View>
  );
}

function MeetingPoint() {
  return (
    <>
      <Circle cx={APEX.x} cy={APEX.y} r={26} fill={colors.cloud} opacity={0.08} />
      <Circle cx={APEX.x} cy={APEX.y} r={14} fill={colors.cloud} />
    </>
  );
}

/** Both paths draw on once, flying in towards SIN, then the meeting point appears. */
function AnimatedPaths() {
  const progress = useSharedValue(0);
  const dot = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) });
    dot.value = withDelay(900, withTiming(1, { duration: 350 }));
  }, [progress, dot]);

  // The left half is drawn from LHR to the apex; the right half from the apex to NRT, so its
  // dash runs the other way to look like it is flying in.
  const leftProps = useAnimatedProps(() => ({ strokeDashoffset: HALF_LENGTH * (1 - progress.value) }));
  const rightProps = useAnimatedProps(() => ({ strokeDashoffset: -HALF_LENGTH * (1 - progress.value) }));
  const dotProps = useAnimatedProps(() => ({ opacity: dot.value }));
  const dash = `${HALF_LENGTH} ${HALF_LENGTH}`;

  return (
    <>
      <AnimatedPath d={LEFT} stroke={colors.amber} strokeWidth={4} strokeLinecap="round" fill="none" strokeDasharray={dash} animatedProps={leftProps} />
      <AnimatedPath d={RIGHT} stroke={colors.teal} strokeWidth={4} strokeLinecap="round" fill="none" strokeDasharray={dash} animatedProps={rightProps} />
      <AnimatedG animatedProps={dotProps}>
        <MeetingPoint />
      </AnimatedG>
    </>
  );
}

/**
 * Cabin crew name tag in CrewJio's own batik-style pattern, in the rank colour.
 * Not an airline design: a simple repeating flower-and-dot motif.
 */
export function NameTag({ color, width = 56, height = 40 }: { color: string; width?: number; height?: number }) {
  const id = `batik-${useId().replace(/:/g, '')}`;
  return (
    <Svg width={width} height={height} viewBox="0 0 56 40">
      <Defs>
        <Pattern id={id} width={14} height={14} patternUnits="userSpaceOnUse">
          <Rect width={14} height={14} fill={color} />
          {/* four-petal flower */}
          <Circle cx={7} cy={4.5} r={2} fill="#FFFFFF" opacity={0.22} />
          <Circle cx={7} cy={9.5} r={2} fill="#FFFFFF" opacity={0.22} />
          <Circle cx={4.5} cy={7} r={2} fill="#FFFFFF" opacity={0.22} />
          <Circle cx={9.5} cy={7} r={2} fill="#FFFFFF" opacity={0.22} />
          <Circle cx={7} cy={7} r={1.2} fill="#FFFFFF" opacity={0.5} />
          {/* corner dots */}
          <Circle cx={0} cy={0} r={1} fill="#FFFFFF" opacity={0.35} />
          <Circle cx={14} cy={0} r={1} fill="#FFFFFF" opacity={0.35} />
          <Circle cx={0} cy={14} r={1} fill="#FFFFFF" opacity={0.35} />
          <Circle cx={14} cy={14} r={1} fill="#FFFFFF" opacity={0.35} />
        </Pattern>
      </Defs>
      <Rect x={0.5} y={0.5} width={55} height={39} rx={8} fill={`url(#${id})`} stroke="#FFFFFF" strokeOpacity={0.15} />
      <Rect x={8} y={15} width={40} height={10} rx={3} fill={colors.cloud} opacity={0.92} />
    </Svg>
  );
}

/** Pilot epaulette with 2 to 4 gold stripes. */
export function PilotStripes({ stripes, width = 56, height = 40 }: { stripes: number; width?: number; height?: number }) {
  const gap = 4;
  const stripeH = 4;
  const total = stripes * stripeH + (stripes - 1) * gap;
  const top = (40 - total) / 2;
  return (
    <Svg width={width} height={height} viewBox="0 0 56 40">
      <Rect x={0.5} y={0.5} width={55} height={39} rx={8} fill={colors.cardRaised} stroke={colors.border} />
      {Array.from({ length: stripes }, (_, i) => (
        <Rect key={i} x={10} y={top + i * (stripeH + gap)} width={36} height={stripeH} rx={1} fill={colors.amber} />
      ))}
    </Svg>
  );
}

export const brandStyles = StyleSheet.create({
  lockup: { flexDirection: 'row', alignItems: 'center', gap: 14 },
});
