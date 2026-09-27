/**
 * Industrial Optical Scanner tokens — from
 * assets/stitch_day_colour_scanner_app/industrial_optical_scanner/DESIGN.md
 */
export const colors = {
  background: '#121316',
  surface: '#121316',
  surfaceContainer: '#1F1F23',
  surfaceContainerLow: '#1B1B1F',
  surfaceContainerHigh: '#292A2D',
  surfaceContainerLowest: '#0D0E11',
  elevated: '#1A1C20',
  overlay: '#22252A',
  border: '#2E323B',
  outline: '#86948A',
  outlineVariant: '#3C4A42',

  onSurface: '#E3E2E6',
  onSurfaceVariant: '#BBCABF',
  muted: '#9EA3AE',
  white: '#FFFFFF',

  primary: '#4EDEA3',
  primaryContainer: '#10B981',
  onPrimary: '#003824',
  primaryPressed: '#059669',

  tertiary: '#FFB95F',
  tertiaryContainer: '#E29100',
  warning: '#F59E0B',
  warningAction: '#D97706',
  error: '#EF4444',
  errorSoft: 'rgba(239, 68, 68, 0.15)',

  secondary: '#B4C5FF',
} as const;

/** HACCP rotation day colours (DESIGN.md). */
export const dayHex = {
  Monday: '#2563EB',
  Tuesday: '#EAB308',
  Wednesday: '#DC2626',
  Thursday: '#854D0E',
  Friday: '#16A34A',
  Saturday: '#EA580C',
  Sunday: '#1E293B',
} as const;

/**
 * classId → hex, matching Kotlin LABELS order:
 * 0 Black Sunday … 6 Yellow Tuesday
 */
export const CLASS_COLORS_BY_ID = [
  dayHex.Sunday, // 0 Black : Sunday
  dayHex.Monday, // 1 Blue : Monday
  dayHex.Thursday, // 2 Brown : Thursday
  dayHex.Friday, // 3 Green : Friday
  dayHex.Saturday, // 4 Orange : Saturday
  dayHex.Wednesday, // 5 Red : Wednesday
  dayHex.Tuesday, // 6 Yellow : Tuesday
] as const;

export const ROTATION_DAYS = [
  { day: 'MON', colour: 'Blue', hex: dayHex.Monday },
  { day: 'TUE', colour: 'Yellow', hex: dayHex.Tuesday },
  { day: 'WED', colour: 'Red', hex: dayHex.Wednesday },
  { day: 'THU', colour: 'Brown', hex: dayHex.Thursday },
  { day: 'FRI', colour: 'Green', hex: dayHex.Friday },
  { day: 'SAT', colour: 'Orange', hex: dayHex.Saturday },
  { day: 'SUN', colour: 'Black / Dark Slate', hex: dayHex.Sunday },
] as const;

export const fonts = {
  sans: 'Inter_400Regular',
  sansMd: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  mono: 'JetBrainsMono_500Medium',
  monoSemi: 'JetBrainsMono_600SemiBold',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

/** Bundled brand art (Metro require — not Metro-bundled .tflite). */
export const images = {
  logo: require('../../assets/logo.png'),
  gradient: require('../../assets/gradient.png'),
} as const;

/** UI verification threshold (stitch summary uses 85%). */
export const VERIFY_THRESHOLD = 0.85;
