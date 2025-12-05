import React from 'react';
import { Text, TextProps, TextStyle, StyleSheet } from 'react-native';
import { scaleFontSize, fonts } from '../lib/responsive';

interface ResponsiveTextProps extends TextProps {
  variant?: 'body' | 'small' | 'medium' | 'large' | 'h1' | 'h2' | 'h3' | 'hero';
  color?: string;
  bold?: boolean;
  center?: boolean;
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
  minimumFontScale?: number;
}

/**
 * ResponsiveText - A text component that automatically scales
 * based on device screen size and handles text truncation properly.
 * 
 * Usage:
 * <ResponsiveText variant="h1">Title</ResponsiveText>
 * <ResponsiveText variant="body" numberOfLines={2}>Long text...</ResponsiveText>
 * <ResponsiveText variant="large" adjustsFontSizeToFit>Auto-sizing text</ResponsiveText>
 */
export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  variant = 'body',
  color,
  bold,
  center,
  numberOfLines,
  adjustsFontSizeToFit = false,
  minimumFontScale = 0.7,
  style,
  children,
  ...props
}) => {
  const getFontSize = (): number => {
    switch (variant) {
      case 'small':
        return fonts.small;
      case 'body':
        return fonts.body;
      case 'medium':
        return fonts.medium;
      case 'large':
        return fonts.large;
      case 'h3':
        return fonts.h3;
      case 'h2':
        return fonts.h2;
      case 'h1':
        return fonts.h1;
      case 'hero':
        return fonts.hero;
      default:
        return fonts.body;
    }
  };

  const textStyle: TextStyle = {
    fontSize: getFontSize(),
    ...(color && { color }),
    ...(bold && { fontWeight: 'bold' }),
    ...(center && { textAlign: 'center' }),
  };

  return (
    <Text
      style={[textStyle, style]}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale}
      ellipsizeMode={numberOfLines ? 'tail' : undefined}
      {...props}
    >
      {children}
    </Text>
  );
};

/**
 * AutoSizeText - Text that automatically shrinks to fit its container
 * Useful for titles, names, or any text that might overflow
 */
export const AutoSizeText: React.FC<ResponsiveTextProps> = (props) => {
  return (
    <ResponsiveText
      adjustsFontSizeToFit
      numberOfLines={1}
      minimumFontScale={0.6}
      {...props}
    />
  );
};

export default ResponsiveText;
