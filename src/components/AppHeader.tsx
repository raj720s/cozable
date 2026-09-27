import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppIcon, type AppIconName } from './AppIcon';
import { colors, fonts } from '../theme/scanner';

interface AppHeaderProps {
  title: string;
  onLeftPress?: () => void;
  leftIcon?: AppIconName;
  rightIcon?: AppIconName;
  onRightPress?: () => void;
  rightIcon2?: AppIconName;
  onRightPress2?: () => void;
  showLiveDot?: boolean;
}

export function AppHeader({
  title,
  onLeftPress,
  leftIcon = 'arrow-left',
  rightIcon,
  onRightPress,
  rightIcon2,
  onRightPress2,
  showLiveDot = false,
}: AppHeaderProps) {
  return (
    <View style={styles.header}>
      {onLeftPress ? (
        <TouchableOpacity style={styles.iconBtn} onPress={onLeftPress} activeOpacity={0.7}>
          <AppIcon name={leftIcon} size={20} color={colors.white} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconBtn} />
      )}

      <View style={styles.titleRow}>
        {showLiveDot && <View style={styles.liveDot} />}
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.rightCluster}>
        {rightIcon2 && onRightPress2 ? (
          <TouchableOpacity style={styles.iconBtn} onPress={onRightPress2} activeOpacity={0.7}>
            <AppIcon name={rightIcon2} size={20} color={colors.white} />
          </TouchableOpacity>
        ) : null}
        {rightIcon && onRightPress ? (
          <TouchableOpacity style={styles.iconBtn} onPress={onRightPress} activeOpacity={0.7}>
            <AppIcon name={rightIcon} size={20} color={colors.white} />
          </TouchableOpacity>
        ) : !rightIcon ? (
          <View style={styles.iconBtn} />
        ) : null}
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
    color: colors.white,
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
});
