// v22 "reference look" kit: calm canvas, one white card per group, hairline rows, floating pill tab bar, sticky action bar,
// sheet headers, receipt rows, plain screen titles. See USAGE.md.
import React, { useRef } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from './Icons';
import { ui } from './bus';
import { useReducedMotion } from './Hosts';
import { Button, ButtonVariant, Pressy } from './kit';
import { F, R, useTheme } from './theme';

type S<T> = StyleProp<T>;

/** ONE white rounded card (radius 16, hairline, no shadow) holding rows separated by hairline dividers. */
export function Group({ children, style }: { children?: React.ReactNode; style?: S<ViewStyle> }) {
  const { c } = useTheme();
  const kids = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ backgroundColor: c.card, borderRadius: R.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line, overflow: 'hidden' }, style]}>
      {kids.map((k, i) => (
        <View key={(React.isValidElement(k) && k.key) || i} style={i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.line, marginLeft: 0 } : undefined}>{k}</View>
      ))}
    </View>
  );
}

/** Small grey label above a Group (13/500 #7A7A80). */
export function SectionLabel({ children, style }: { children?: React.ReactNode; style?: S<ViewStyle> }) {
  const { c } = useTheme();
  return <Text accessibilityRole="header" style={[{ fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: c.grey, marginTop: 24, marginBottom: 8, marginLeft: 4 }, style as any]}>{children}</Text>;
}

/** Group row: 56px, thin 22px line icon, 15/500 label, grey value, chevron. Old props (title/subtitle/right/divider) still work. */
export function Row({
  icon, label, title, sub, subtitle, value, right, chevron, onPress, destructive, divider, style,
}: {
  icon?: IconName | React.ReactNode;
  label?: string;
  /** legacy alias of label */
  title?: string;
  sub?: string;
  /** legacy alias of sub */
  subtitle?: string;
  value?: string;
  /** custom trailing node (replaces value + chevron) */
  right?: React.ReactNode;
  /** default: true when onPress is set */
  chevron?: boolean;
  onPress?: () => void;
  destructive?: boolean;
  /** legacy: bottom hairline (Group already draws dividers) */
  divider?: boolean;
  style?: S<ViewStyle>;
}) {
  const { c } = useTheme();
  const text = label ?? title ?? '';
  const subText = sub ?? subtitle;
  const col = destructive ? c.red : c.fg;
  const showChev = chevron ?? (!!onPress && !destructive && !right);
  const body = (
    <>
      {icon ? (
        <View style={{ width: 24, alignItems: 'center' }}>
          {typeof icon === 'string' ? <Icon name={icon as IconName} size={22} color={destructive ? c.red : c.fg} /> : icon}
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0, paddingVertical: 8 }}>
        <Text numberOfLines={2} style={{ fontFamily: F.medium, fontSize: 15, lineHeight: 21, color: col }}>{text}</Text>
        {subText ? <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: c.grey, marginTop: 1 }}>{subText}</Text> : null}
      </View>
      {right ?? (value ? <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 15, color: c.grey, maxWidth: '45%' }}>{value}</Text> : null)}
      {showChev ? <Icon name="chevron" size={18} color={c.grey} /> : null}
    </>
  );
  const st: S<ViewStyle> = [
    { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, minHeight: 56 },
    divider && { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: c.line },
    style,
  ];
  if (onPress) return <Pressy onPress={onPress} scaleTo={0.99} accessibilityLabel={text} style={st}>{body}</Pressy>;
  return <View style={st}>{body}</View>;
}

/** Large plain title + optional subtitle. Replaces violet heroes on tab screens. `right` holds small header icon buttons. */
export function ScreenTitle({ title, subtitle, right, style }: { title: string; subtitle?: string; right?: React.ReactNode; style?: S<ViewStyle> }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }, style]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text accessibilityRole="header" numberOfLines={1} style={{ fontFamily: F.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.8, color: c.fg }}>{title}</Text>
        {subtitle ? <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: c.grey, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/** Round 40px header icon button (plain, hairline) for ScreenTitle.right, e.g. add car. */
export function HeaderIconButton({ icon, label, onPress, badge }: { icon: IconName; label: string; onPress: () => void; badge?: number }) {
  const { c } = useTheme();
  return (
    <Pressy onPress={() => { ui.haptic(8); onPress(); }} accessibilityLabel={label} scaleTo={0.94}
      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={20} color={c.fg} />
      {badge ? <View style={{ position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.bold, fontSize: 10, color: '#fff' }}>{badge}</Text></View> : null}
    </Pressy>
  );
}

/** Sticky bottom action bar: white, hairline top, small summary on the left, big 52px brand Button. Place as last child of a screen (absolute bottom). */
export function StickyBar({
  summary, summaryLabel, label, onPress, disabled, loading, variant = 'primary', inline, style,
}: {
  /** bold value on the left, e.g. "₹114.45" */
  summary?: string;
  /** tiny grey line above summary, e.g. "To pay" */
  summaryLabel?: string;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  /** true: render in flow instead of absolute at the bottom */
  inline?: boolean;
  style?: S<ViewStyle>;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[
      { backgroundColor: c.card, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.line, paddingTop: 12, paddingHorizontal: 16, paddingBottom: 12 + insets.bottom, flexDirection: 'row', alignItems: 'center', gap: 16 },
      !inline && { position: 'absolute', left: 0, right: 0, bottom: 0 },
      style,
    ]}>
      {summary || summaryLabel ? (
        <View style={{ flexShrink: 1 }}>
          {summaryLabel ? <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 12, lineHeight: 16, color: c.grey }}>{summaryLabel}</Text> : null}
          {summary ? <Text numberOfLines={1} style={{ fontFamily: F.bold, fontSize: 18, lineHeight: 24, letterSpacing: -0.3, color: c.fg }}>{summary}</Text> : null}
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Button label={label} onPress={onPress} disabled={disabled} loading={loading} variant={variant} size="lg" />
      </View>
    </View>
  );
}

/** Bottom-sheet header: big 20/700 left title, optional small outlined action on the right. */
export function SheetHeader({ title, action, onAction, actionIcon, style }: { title: string; action?: string; onAction?: () => void; actionIcon?: IconName; style?: S<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 14 }, style]}>
      <Text accessibilityRole="header" style={{ flex: 1, fontFamily: F.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.5, color: c.fg }}>{title}</Text>
      {action ? (
        <Pressy onPress={onAction} accessibilityLabel={action} scaleTo={0.96}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
          {actionIcon ? <Icon name={actionIcon} size={14} color={c.fg} /> : null}
          <Text style={{ fontFamily: F.medium, fontSize: 13, color: c.fg }}>{action}</Text>
        </Pressy>
      ) : null}
    </View>
  );
}

/** Receipt: a Group-like card of ReceiptRows. Put a ReceiptRow total last. */
export function Receipt({ title, children, footer, style }: { title?: string; children?: React.ReactNode; footer?: React.ReactNode; style?: S<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[{ backgroundColor: c.card, borderRadius: R.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line, overflow: 'hidden' }, style]}>
      <View style={{ padding: 16, gap: 12 }}>
        {title ? <Text accessibilityRole="header" style={{ fontFamily: F.semi, fontSize: 16, lineHeight: 22, letterSpacing: -0.2, color: c.fg }}>{title}</Text> : null}
        {children}
      </View>
      {footer}
    </View>
  );
}

/** One receipt line. `hint` draws the dotted underline on the label (tap target for explanations). `strike` shows an old price. total = bold + hairline above. */
export function ReceiptRow({ label, value, strike, hint, onHint, total, tone, style }: {
  label: string; value: string; strike?: string; hint?: boolean; onHint?: () => void; total?: boolean; tone?: 'ok'; style?: S<ViewStyle>;
}) {
  const { c } = useTheme();
  const lab = (
    <Text style={[{ fontFamily: total ? F.bold : F.body, fontSize: total ? 16 : 14, lineHeight: 20, color: total ? c.fg : c.fg },
      hint && { textDecorationLine: 'underline', textDecorationStyle: 'dotted' as const, textDecorationColor: c.grey }]}>{label}</Text>
  );
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
      total && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.line, paddingTop: 12, marginTop: 4 }, style]}>
      <View style={{ flexShrink: 1 }}>{onHint ? <Pressable onPress={onHint} hitSlop={8} accessibilityRole="button">{lab}</Pressable> : lab}</View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        {strike ? <Text style={{ fontFamily: F.body, fontSize: 13, color: c.grey, textDecorationLine: 'line-through' }}>{strike}</Text> : null}
        <Text style={{ fontFamily: total ? F.bold : F.medium, fontSize: total ? 16 : 14, lineHeight: 20, color: tone === 'ok' ? c.ok : c.fg }}>{value}</Text>
      </View>
    </View>
  );
}

/* ------------------------------ Floating tab bar ------------------------------ */

export type FloatingTab = { key: string; label: string; icon: IconName; badge?: number; tone?: string };

/** White pill, soft shadow, 16 from edges + bottom. Selected tab = dark pill with white icon + label; others icon only (grey). No centre FAB. */
export function FloatingTabBar({ tabs, active, onSelect }: { tabs: FloatingTab[]; active: string; onSelect: (key: string) => void }) {
  const { c, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const rm = useReducedMotion();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom: 16 + insets.bottom, alignItems: 'center' }}>
      <View accessibilityRole="tablist" style={{
        flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6, borderRadius: 999, backgroundColor: c.tabBg, maxWidth: 480, width: '100%',
        borderWidth: dark ? StyleSheet.hairlineWidth : 0, borderColor: c.line,
        shadowColor: c.navShadow, shadowOpacity: dark ? 0.5 : 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 8,
      }}>
        {tabs.map((tb) => <FloatingTabCell key={tb.key} tb={tb} on={tb.key === active} rm={rm} onPress={() => { ui.haptic(6); onSelect(tb.key); }} />)}
      </View>
    </View>
  );
}

function FloatingTabCell({ tb, on, rm, onPress }: { tb: FloatingTab; on: boolean; rm: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const press = useRef(new Animated.Value(1)).current;
  const to = (v: number) => { if (!rm) Animated.timing(press, { toValue: v, duration: v < 1 ? 90 : 160, useNativeDriver: false }).start(); };
  return (
    <Pressable onPress={onPress} onPressIn={() => to(0.95)} onPressOut={() => to(1)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={tb.label}
      style={{ flex: on ? 1.7 : 1 }} hitSlop={{ top: 6, bottom: 6 }}>
      <Animated.View style={{ transform: [{ scale: press }], minHeight: 48, borderRadius: 999, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: on ? (tb.tone || c.navOn) : 'transparent' }}>
        <View>
          <Icon name={tb.icon} size={22} color={on ? (tb.tone ? '#FFFFFF' : c.navOnInk) : c.grey} active={on} />
          {tb.badge && !on ? <View style={{ position: 'absolute', top: -5, right: -8, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, backgroundColor: c.primary, borderWidth: 2, borderColor: c.tabBg, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.bold, fontSize: 9, color: '#fff' }}>{tb.badge}</Text></View> : null}
        </View>
        {on ? <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 13, color: tb.tone ? '#FFFFFF' : c.navOnInk }}>{tb.label}</Text> : null}
      </Animated.View>
    </Pressable>
  );
}
