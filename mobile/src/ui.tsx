import React, { useEffect, useRef } from 'react';
import { Animated, DimensionValue, Pressable, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { qrEncode, QrCode } from './qr';

export const C = {
  bg: '#070b12',
  bg2: '#0b111c',
  card: '#101827',
  card2: '#141e30',
  line: '#1e2b42',
  line2: '#2a3b5c',
  text: '#eaf1fb',
  dim: '#8fa1bd',
  faint: '#5c6f8e',
  green: '#3ddc84',
  greenDark: '#16522e',
  cyan: '#38d6f5',
  blue: '#4f8ef7',
  purple: '#a78bfa',
  pink: '#f472b6',
  amber: '#fbbf24',
  red: '#f85149',
};

export function Card(props: { children: React.ReactNode; style?: object; glow?: string }): React.JSX.Element {
  return (
    <View
      style={[
        styles.card,
        props.glow ? { borderColor: props.glow, shadowColor: props.glow, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 6 } : null,
        props.style || {},
      ]}
    >
      {props.children}
    </View>
  );
}

export function SectionLabel(props: { text: string; tint?: string }): React.JSX.Element {
  return (
    <View style={styles.sectionWrap}>
      <View style={[styles.sectionBar, { backgroundColor: props.tint || C.green }]} />
      <Text style={[styles.sectionText, props.tint ? { color: props.tint } : null]}>{props.text.toUpperCase()}</Text>
    </View>
  );
}

export function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secret?: boolean;
  mono?: boolean;
  multiline?: boolean;
  tint?: string;
}): React.JSX.Element {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{props.label.toUpperCase()}</Text>
      <TextInput
        style={[styles.fieldInput, props.mono ? styles.mono : null, props.multiline ? { minHeight: 84, textAlignVertical: 'top' } : null, props.tint ? { borderColor: props.tint } : null]}
        value={props.value}
        onChangeText={props.onChange}
        placeholder={props.placeholder || ''}
        placeholderTextColor={C.faint}
        secureTextEntry={props.secret}
        autoCapitalize="none"
        autoCorrect={false}
        multiline={props.multiline}
      />
    </View>
  );
}

export function Chips(props: { label: string; choices: string[]; value: string; onPick: (v: string) => void; tint?: string }): React.JSX.Element {
  const tint = props.tint || C.green;
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{props.label.toUpperCase()}</Text>
      <View style={styles.chipRow}>
        {props.choices.map((c) => {
          const on = c === props.value;
          return (
            <Pressable key={c} onPress={() => props.onPick(c)} style={[styles.chip, on ? { backgroundColor: tint + '22', borderColor: tint } : null]}>
              <Text style={[styles.chipText, on ? { color: tint, fontWeight: '700' } : null]}>{c}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function BigButton(props: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: 'primary' | 'ghost' | 'danger' | 'cyan';
}): React.JSX.Element {
  const v = props.variant || 'primary';
  const bg = v === 'primary' ? C.green : v === 'cyan' ? C.cyan : v === 'danger' ? C.red : 'transparent';
  const fg = v === 'ghost' ? C.text : '#04110a';
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled || props.busy}
      style={[
        styles.button,
        v === 'ghost' ? { borderWidth: 1.5, borderColor: C.line2 } : null,
        v === 'danger' ? {} : null,
        props.disabled || props.busy ? { opacity: 0.45 } : null,
        v !== 'ghost' ? { shadowColor: bg, shadowOpacity: 0.55, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 5 } : null,
      ]}
    >
      {props.busy ? <ActivityIndicator size="small" /> : null}
      <Text style={[styles.buttonText, { color: fg }]}>{props.busy ? props.label + '...' : props.label}</Text>
    </Pressable>
  );
}

export function Badge(props: { text: string; tint?: string }): React.JSX.Element {
  const tint = props.tint || C.dim;
  return (
    <View style={[styles.badge, { borderColor: tint + '88', backgroundColor: tint + '1c' }]}>
      <Text style={[styles.badgeText, { color: tint }]}>{props.text}</Text>
    </View>
  );
}

export function statusTint(status: string, conclusion: string | null): string {
  if (status === 'in_progress' || status === 'queued' || status === 'waiting') return C.amber;
  if (status === 'completed') return conclusion === 'success' ? C.green : conclusion === 'cancelled' ? C.dim : C.red;
  return C.dim;
}

export function LiveDot(props: { tint?: string; size?: number }): React.JSX.Element {
  const tint = props.tint || C.green;
  const size = props.size || 10;
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 2.1, duration: 650, useNativeDriver: true }), Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true })]));
    a.start();
    return () => a.stop();
  }, [pulse]);
  return (
    <View style={{ width: size * 2, height: size * 2, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: tint, opacity: 0.5, transform: [{ scale: pulse }] }} />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint }} />
    </View>
  );
}

export function QrView(props: { value: string; size: DimensionValue; tint?: string; bg?: string }): React.JSX.Element {
  const qr: QrCode | null = qrEncode(props.value);
  if (!qr) {
    return (
      <Card style={{ padding: 18 }}>
        <Text style={{ color: C.dim }}>text too long for a QR code</Text>
      </Card>
    );
  }
  const tint = props.tint || '#ffffff';
  const bg = props.bg || '#ffffff';
  const quiet = 2;
  const dim = qr.size + quiet * 2;
  const rows: React.JSX.Element[] = [];
  for (let r = 0; r < dim; r++) {
    const cells: React.JSX.Element[] = [];
    for (let c = 0; c < dim; c++) {
      const inQr = r >= quiet && r < quiet + qr.size && c >= quiet && c < quiet + qr.size;
      const dark = inQr ? qr.modules[(r - quiet) * qr.size + (c - quiet)] === 1 : false;
      cells.push(<View key={c} style={{ flex: 1, aspectRatio: 1, backgroundColor: dark ? tint : bg }} />);
    }
    rows.push(
      <View key={r} style={{ flex: 1, flexDirection: 'row' }}>
        {cells}
      </View>,
    );
  }
  return (
    <View style={{ borderRadius: 14, overflow: 'hidden', padding: 6, backgroundColor: bg }}>
      <View style={{ width: props.size, height: props.size }}>{rows}</View>
    </View>
  );
}

export function Mono(props: { children: string; color?: string; size?: number; center?: boolean }): React.JSX.Element {
  return <Text style={[styles.mono, { color: props.color || C.cyan, fontSize: props.size || 13 }, props.center ? { textAlign: 'center' } : null]}>{props.children}</Text>;
}

export function Empty(props: { text: string }): React.JSX.Element {
  return (
    <Card style={{ padding: 22, alignItems: 'center' }}>
      <Text style={{ color: C.faint, textAlign: 'center' }}>{props.text}</Text>
    </Card>
  );
}

export function Divider(): React.JSX.Element {
  return <View style={styles.divider} />;
}

export function KeyValue(props: { k: string; v: string; tint?: string }): React.JSX.Element {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvKey}>{props.k}</Text>
      <Text style={[styles.kvVal, props.tint ? { color: props.tint } : null]} numberOfLines={1}>
        {props.v || '-'}
      </Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  mono: {
    fontFamily: 'monospace',
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    padding: 16,
    marginBottom: 12,
  },
  sectionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  sectionBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
    marginRight: 8,
  },
  sectionText: {
    color: C.dim,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  fieldWrap: {
    marginBottom: 14,
  },
  fieldLabel: {
    color: C.faint,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: C.bg2,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 12,
    color: C.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: C.bg2,
  },
  chipText: {
    color: C.dim,
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.green,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 18,
    marginTop: 4,
    marginBottom: 10,
  },
  buttonText: {
    color: '#04110a',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  divider: {
    height: 1,
    backgroundColor: C.line,
    marginVertical: 12,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  kvKey: {
    color: C.dim,
    fontSize: 13,
    fontWeight: '600',
  },
  kvVal: {
    color: C.text,
    fontSize: 13,
    maxWidth: 220,
    fontWeight: '600',
  },
});
