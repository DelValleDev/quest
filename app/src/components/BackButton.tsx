import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useThemeStore } from '../store';
import { getTheme } from '../theme/colors';

interface BackButtonProps {
  onPress?: () => void;
  label?: string;
  style?: ViewStyle;
}

export const BackButton: React.FC<BackButtonProps> = ({ onPress, label, style }) => {
  const { mode } = useThemeStore();
  const theme = getTheme(mode);
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.goBack();
    }
  };

  const styles = StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    arrow: {
      fontSize: 24,
      color: theme.text,
      marginRight: 4,
    },
    label: {
      fontSize: 16,
      color: theme.text,
    },
  });

  return (
    <TouchableOpacity style={[styles.button, style]} onPress={handlePress}>
      <Text style={styles.arrow}>←</Text>
      {label && <Text style={styles.label}>{label}</Text>}
    </TouchableOpacity>
  );
};

export default BackButton;
