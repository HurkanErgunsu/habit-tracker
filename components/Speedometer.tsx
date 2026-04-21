import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

type SpeedometerProps = {
  currentGoal: number;
  recommendedGoal: number;
  scale?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = (Math.PI / 180) * angleDeg;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

export function Speedometer({ currentGoal, recommendedGoal, scale = 1 }: SpeedometerProps) {
  const { width } = useWindowDimensions();
  const targetWidth = Math.min(340, Math.max(260, width - 56));
  const gaugeWidth = targetWidth * scale;
  const gaugeHeight = Math.round(gaugeWidth * 0.58);
  const cx = gaugeWidth / 2;
  const cy = gaugeHeight - 14 * scale;
  const radius = cx - 24 * scale;

  const maxGoal = Math.max(recommendedGoal * 2, 1);
  const clampedGoal = clamp(currentGoal, 0, maxGoal);
  const needleAngle = (clampedGoal / maxGoal) * 180 + 180;
  const needleTip = polarToCartesian(cx, cy, radius - 10, needleAngle);

  const segments = useMemo(
    () => [
      { start: 180, end: 220, color: '#EF4444' },
      { start: 220, end: 255, color: '#FACC15' },
      { start: 255, end: 285, color: '#22C55E' },
      { start: 285, end: 320, color: '#FACC15' },
      { start: 320, end: 360, color: '#EF4444' },
    ],
    []
  );

  return (
    <View style={styles.root}>
      <Svg width={gaugeWidth} height={gaugeHeight}>
        {segments.map((segment) => (
          <Path
            key={`${segment.start}-${segment.end}`}
            d={describeArc(cx, cy, radius, segment.start, segment.end)}
            stroke={segment.color}
            strokeWidth={14 * scale}
            strokeLinecap="round"
            fill="none"
          />
        ))}

        <Path
          d={`M ${cx} ${cy} L ${needleTip.x} ${needleTip.y}`}
          stroke="#0F172A"
          strokeWidth={4 * scale}
          strokeLinecap="round"
        />
        <Circle cx={cx} cy={cy} r={8 * scale} fill="#2563EB" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

