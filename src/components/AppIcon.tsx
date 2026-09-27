import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { colors } from '../theme/scanner';

export type AppIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  name: AppIconName;
  size?: number;
  color?: string;
  style?: ComponentProps<typeof MaterialCommunityIcons>['style'];
};

/** Thin wrapper around @expo/vector-icons (MaterialCommunityIcons). */
export function AppIcon({
  name,
  size = 22,
  color = colors.onSurface,
  style,
}: Props) {
  return <MaterialCommunityIcons name={name} size={size} color={color} style={style} />;
}
