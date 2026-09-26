import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme/scanner';

type BadgeVariant = 'new' | 'synced' | 'at-risk' | 'optimal' | 'haccp' | 'normal' | 'use-first';

interface StatusBadgeProps {
  variant: BadgeVariant;
  label?: string;
}

const BADGE_CONFIG: Record<
  BadgeVariant,
  { bg: string; border: string; text: string; dot?: string }
> = {
  new: {
    bg: 'rgba(78, 222, 163, 0.12)',
    border: colors.primary,
    text: colors.primary,
  },
  synced: {
    bg: 'rgba(78, 222, 163, 0.08)',
    border: colors.primary,
    text: colors.primary,
  },
  'at-risk': {
    bg: colors.errorSoft,
    border: colors.error,
    text: colors.error,
  },
  optimal: {
    bg: 'rgba(78, 222, 163, 0.12)',
    border: colors.primary,
    text: colors.primary,
  },
  haccp: {
    bg: 'rgba(78, 222, 163, 0.1)',
    border: colors.primary,
    text: colors.primary,
  },
  normal: {
    bg: colors.surfaceContainerHigh,
    border: colors.border,
    text: colors.muted,
  },
  'use-first': {
    bg: 'rgba(239, 68, 68, 0.15)',
    border: colors.error,
    text: colors.error,
  },
};

export function StatusBadge({ variant, label }: StatusBadgeProps) {
  const cfg = BADGE_CONFIG[variant];
  const displayLabel = label ?? variant.replace('-', ' ').toUpperCase();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
        },
      ]}
    >
      <Text style={[styles.text, { color: cfg.text }]}>{displayLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
