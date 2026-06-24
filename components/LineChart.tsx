import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { COLORS, FONTS } from "../constants/theme";

type Props = {
  data: number[];          // y-values, chronological
  width: number;
  height?: number;
  color?: string;
  unit?: string;
};

// Minimal line chart: baseline + max gridline, the series polyline, and dots.
// Pure react-native-svg, no extra dependency.
export const LineChart = ({ data, width, height = 160, color = COLORS.primary, unit = "" }: Props) => {
  if (data.length === 0) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={styles.emptyText}>No data yet — log this exercise to see progress.</Text>
      </View>
    );
  }

  const padL = 44;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1; // avoid divide-by-zero when all equal

  const x = (i: number) => padL + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => padT + plotH - ((v - min) / span) * plotH;

  const points = data.map((v, i) => `${x(i)},${y(v)}`).join(" ");

  const fmt = (v: number) => (Number.isInteger(v) ? `${v}` : v.toFixed(1));

  return (
    <View style={{ width }}>
      <Svg width={width} height={height}>
        {/* max + min gridlines */}
        <Line x1={padL} y1={padT} x2={width - padR} y2={padT} stroke={COLORS.border} strokeWidth={1} />
        <Line x1={padL} y1={padT + plotH} x2={width - padR} y2={padT + plotH} stroke={COLORS.border} strokeWidth={1} />

        {/* series */}
        {data.length > 1 && (
          <Polyline points={points} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        )}
        {data.map((v, i) => (
          <Circle key={i} cx={x(i)} cy={y(v)} r={3.5} fill={color} />
        ))}
      </Svg>

      {/* y-axis labels overlaid */}
      <Text style={[styles.yLabel, { top: padT - 7 }]}>{fmt(max)}{unit ? ` ${unit}` : ""}</Text>
      {span > 1 && <Text style={[styles.yLabel, { top: padT + plotH - 7 }]}>{fmt(min)}{unit ? ` ${unit}` : ""}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  empty: { alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  emptyText: { fontFamily: FONTS.body, color: COLORS.textDim, fontSize: 13, textAlign: "center", lineHeight: 19 },
  yLabel: { position: "absolute", left: 0, width: 40, textAlign: "right", fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 10 },
});
