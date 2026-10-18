import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { Link, type Href } from 'expo-router';
import { useApp } from '@/lib/store';
import { FONTS, RADIUS } from '@/lib/theme';

export type IconName = React.ComponentProps<typeof Feather>['name'];

export function Icon({ name, size = 24, color }: { name: IconName; size?: number; color?: string }) {
  const { palette } = useApp();
  return <Feather name={name} size={size} color={color ?? palette.ink} />;
}

type TxtProps = TextProps & { size?: number; bold?: boolean; display?: boolean; soft?: boolean; color?: string; center?: boolean };

export function Txt({ size = 17, bold, display, soft, color, center, style, ...rest }: TxtProps) {
  const { palette } = useApp();
  const fontFamily = display ? FONTS.display : bold ? FONTS.bodyBold : FONTS.body;
  return (
    <Text
      {...rest}
      style={[{ fontFamily, fontSize: size, lineHeight: Math.round(size * (display ? 1.2 : 1.4)), color: color ?? (soft ? palette.inkSoft : palette.ink), textAlign: center ? 'center' : undefined }, style]}
    />
  );
}

export function Screen({ children, padded = true, style, scroll }: { children: React.ReactNode; padded?: boolean; style?: StyleProp<ViewStyle>; scroll?: boolean }) {
  const { palette } = useApp();
  const inner = <View style={[{ flex: 1, padding: padded ? 16 : 0, gap: 12 }, style]}>{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.ground }} edges={['top', 'bottom', 'left', 'right']}>
      {scroll ? <ScrollView contentContainerStyle={{ flexGrow: 1 }}>{inner}</ScrollView> : inner}
    </SafeAreaView>
  );
}

type BtnKind = 'primary' | 'ghost' | 'soft' | 'danger' | 'plain';

interface BtnProps extends Omit<PressableProps, 'style' | 'children'> {
  label?: string;
  icon?: IconName;
  kind?: BtnKind;
  size?: 'md' | 'lg' | 'xl';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  vertical?: boolean;
  selected?: boolean;
  children?: React.ReactNode;
}

export function Btn({ label, icon, kind = 'ghost', size = 'md', style, textStyle, vertical, selected, children, accessibilityLabel, ...rest }: BtnProps) {
  const { palette } = useApp();
  const h = size === 'xl' ? 76 : size === 'lg' ? 60 : 48;
  const fs = size === 'xl' ? 21 : size === 'lg' ? 19 : 16;
  const bg = kind === 'primary' ? palette.accent : kind === 'soft' ? palette.accentSoft : kind === 'plain' ? 'transparent' : palette.surface;
  const fg = kind === 'primary' ? palette.onAccent : kind === 'danger' ? palette.danger : palette.ink;
  const border = kind === 'primary' || kind === 'plain' ? 'transparent' : kind === 'danger' ? palette.danger : selected ? palette.accent : palette.lineStrong;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={selected !== undefined ? { selected } : undefined}
      {...rest}
      style={({ pressed }) => [
        {
          minHeight: h, paddingHorizontal: label ? 18 : 0, minWidth: h, borderRadius: kind === 'primary' || kind === 'ghost' ? RADIUS.control : RADIUS.control,
          backgroundColor: selected && kind !== 'primary' ? palette.accentSoft : bg, borderWidth: selected ? 3 : 2, borderColor: border,
          flexDirection: vertical ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: vertical ? 4 : 8,
          opacity: rest.disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {icon ? <Feather name={icon} size={vertical ? 30 : fs + 6} color={fg} /> : null}
      {label ? <Text style={[{ fontFamily: FONTS.bodyBold, fontSize: fs, color: fg }, textStyle]}>{label}</Text> : null}
      {children}
    </Pressable>
  );
}

export function LinkBtn({ href, ...props }: BtnProps & { href: Href }) {
  return (
    <Link href={href} asChild>
      <Btn {...props} />
    </Link>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { palette } = useApp();
  return <View style={[{ backgroundColor: palette.surface, borderColor: palette.line, borderWidth: 1, borderRadius: RADIUS.card, padding: 16, gap: 10 }, style]}>{children}</View>;
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const { palette } = useApp();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      hitSlop={8}
      style={{ width: 58, height: 34, borderRadius: 17, backgroundColor: value ? palette.success : '#B4C1BE', padding: 4, alignItems: value ? 'flex-end' : 'flex-start', justifyContent: 'center' }}
    >
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF' }} />
    </Pressable>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  const { palette } = useApp();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', backgroundColor: palette.surfaceAlt, borderRadius: 12, padding: 3, gap: 3, flexWrap: 'wrap' }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(o.value)}
            style={{ minHeight: 40, paddingHorizontal: 12, borderRadius: 9, backgroundColor: on ? palette.surface : 'transparent', alignItems: 'center', justifyContent: 'center', borderWidth: on ? 1 : 0, borderColor: palette.line }}
          >
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 15, color: palette.ink }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Row({ children, style, gap = 10 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function TopBar({ title, back, right }: { title: string; back?: Href; right?: React.ReactNode }) {
  return (
    <Row style={{ minHeight: 56 }} gap={12}>
      {back ? <LinkBtn href={back} icon="chevron-left" label="Back" /> : null}
      <Txt display size={24} style={{ flex: 1 }} accessibilityRole="header">{title}</Txt>
      {right}
    </Row>
  );
}

export const s = StyleSheet.create({
  fill: { flex: 1 },
});
