// Round tab header band: the washer rides his scooter along a Delhi street. `progress` (0..1) moves him along the road as
// cars get done; `done` parks him at the end, flag flying, waving. Light lavender sky, looping skyline/lamps/road, fade-in + drift.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { C, Cloud, Loop, ND, RIG_H, RIG_W, RoadDashes, ScooterRig, Skyline, Street, useEnter, useStill } from './kit';

export type RoundHeroArtProps = {
  width: number;
  /** band height, default 220 */
  height?: number;
  /** 0..1, how far along the round (cars done / cars total) */
  progress?: number;
  /** round finished: scooter parked at the end, he waves and the flag flies */
  done?: boolean;
  /** freeze all loops (screenshots, low-power) */
  still?: boolean;
};

export const RoundHeroArt = React.memo(function RoundHeroArt({ width, height = 220, progress = 0, done = false, still }: RoundHeroArtProps) {
  const rm = useStill(still);
  const kS = height / 232, kc = kS * 0.66;
  const p = Math.max(0, Math.min(1, done ? 1 : progress));
  const prog = useRef(new Animated.Value(p)).current;
  useEffect(() => {
    if (rm) { prog.setValue(p); return; }
    const a = Animated.timing(prog, { toValue: p, duration: 1100, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: ND });
    a.start();
    return () => a.stop();
  }, [p, rm]); // eslint-disable-line react-hooks/exhaustive-deps
  const enter = useEnter(rm);
  const moving = !rm && !done;
  const roadY = 198 * kS;
  const x0 = 6 - 56 * kc, x1 = width - 300 * kc - 14;      // rig left edge when p = 0 / 1 (visible body spans ~56..298 of the rig)
  const goalX = width - 30;
  const rigStyle = { position: 'absolute' as const, left: 0, top: roadY - 202 * kc, transform: [{ translateX: prog.interpolate({ inputRange: [0, 1], outputRange: [x0, x1] }) }] };
  return (
    <View pointerEvents="none" style={{ width, height, overflow: 'hidden' }} accessible accessibilityLabel={done ? 'Round finished, the washer is waving' : `Washer riding to the next car, round ${Math.round(p * 100)} percent done`}>
      <Svg width={width} height={height} style={{ position: 'absolute' }}>
        <Defs><LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#E3D8FF" /><Stop offset="1" stopColor="#F7F3FF" /></LinearGradient></Defs>
        <Rect width={width} height={height} fill="url(#sky)" />
        <Circle cx={width * 0.8} cy={58 * kS} r={34 * kS} fill={C.SAF} opacity={0.22} />
        <Circle cx={width * 0.8} cy={58 * kS} r={20 * kS} fill={C.SAF} opacity={0.5} />
      </Svg>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width, height }, enter]}>
        <Loop k={kS} tile={360} ms={60000} h={80} span={width} rm={rm}>{x => <><Cloud x={x + 40} y={44} /><Cloud x={x + 230} y={26} s={0.8} /><Cloud x={x + 310} y={66} s={0.6} /></>}</Loop>
        <Loop k={kS} tile={420} ms={moving ? 30000 : 90000} h={200} span={width} rm={rm || done}>{x => <Skyline x0={x} />}</Loop>
        <Svg width={width} height={height} viewBox={`0 0 ${width / kS} 232`} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Rect x={0} y={198} width={width / kS} height={34} fill={C.ROAD} />
          <Rect x={0} y={198} width={width / kS} height={2} fill={C.ROAD2} />
        </Svg>
        <Loop k={kS} tile={400} ms={3200} h={200} span={width} rm={rm || done}>{x => <Street x0={x} />}</Loop>
        <Loop k={kS} tile={420} ms={3000} h={232} span={width} rm={rm || done}>{x => <RoadDashes x0={x} />}</Loop>
        {/* progress trail along the kerb */}
        <Animated.View style={{ position: 'absolute', left: 0, top: 224 * kS, width, height: 4 * kS, borderRadius: 2, backgroundColor: C.V, opacity: 0.85, transform: [{ translateX: prog.interpolate({ inputRange: [0, 1], outputRange: [-width / 2, 0] }) }, { scaleX: prog.interpolate({ inputRange: [0, 1], outputRange: [0.001, 1] }) }] }} />
        {/* destination pin, hidden once he arrives */}
        <Svg width={26} height={36} viewBox="0 0 26 36" style={{ position: 'absolute', left: goalX - 13, top: roadY - 40, opacity: done ? 0 : 1 }}>
          <Path d="M13 34 C13 34 3 21 3 13 a10 10 0 0 1 20 0 C23 21 13 34 13 34 Z" fill={C.V} />
          <Circle cx={13} cy={13} r={4.5} fill={C.SAF} />
        </Svg>
        <Animated.View style={rigStyle}>
          <Svg width={RIG_W * kc} height={RIG_H * kc} viewBox={`0 0 ${RIG_W} ${RIG_H}`} style={{ position: 'absolute' }}>
            <Path d="M70 202 a110 5 0 0 0 220 0 a110 5 0 0 0 -220 0Z" fill="rgba(30,15,70,0.10)" />
          </Svg>
          <ScooterRig k={kc} mode={done ? 'wave' : 'ride'} rm={rm} />
        </Animated.View>
      </Animated.View>
    </View>
  );
});
