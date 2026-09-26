import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts } from '../theme/scanner';

interface AppHeaderProps {
  title: string;
  onLeftPress?: () => void;
  leftIcon?: string;
  rightIcon?: string;
  onRightPress?: () => void;
  /** Optional second right icon */
  rightIcon2?: string;
  onRightPress2?: () => void;
  /** Small live dot next to title */
  showLiveDot?: boolean;
}

export function AppHeader({
  title,
  onLeftPress,
  leftIcon,
  rightIcon,
  onRightPress,
  rightIcon2,
  onRightPress2,
  showLiveDot = false,
}: AppHeaderProps) {
  return (
    <View style={styles.header}>
      {/* Left */}
      {onLeftPress ? (
        <TouchableOpacity style={styles.iconBtn} onPress={onLeftPress} activeOpacity={0.7}>
          <Text style={styles.iconText}>{leftIcon ?? '←'}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.iconBtn} />
      )}

      {/* Title */}
      <View style={styles.titleRow}>
        {showLiveDot && <View style={styles.liveDot} />}
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* Right icons */}
      <View style={styles.rightCluster}>
        {rightIcon2 && onRightPress2 && (
          <TouchableOpacity style={styles.iconBtn} onPress={onRightPress2} activeOpacity={0.7}>
            <Text style={styles.iconText}>{rightIcon2}</Text>
          </TouchableOpacity>
        )}
        {rightIcon && onRightPress && (
          <TouchableOpacity style={styles.iconBtn} onPress={onRightPress} activeOpacity={0.7}>
            <Text style={styles.iconText}>{rightIcon}</Text>
          </TouchableOpacity>
        )}
        {!rightIcon && <View style={styles.iconBtn} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.onSurface,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 16,
    color: colors.onSurfaceVariant,
  },
});
