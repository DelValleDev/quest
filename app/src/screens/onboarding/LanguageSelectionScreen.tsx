import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useThemeStore, useLanguageStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { setLanguage } from '../../lib/i18n';

const { width } = Dimensions.get('window');

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
];

interface LanguageSelectionScreenProps {
  onLanguageSelected?: () => void;
}

export const LanguageSelectionScreen: React.FC<LanguageSelectionScreenProps> = ({
  onLanguageSelected,
}) => {
  const { mode } = useThemeStore();
  const { language: currentLanguage, setLanguage: setStoreLanguage } = useLanguageStore();
  const theme = getTheme(mode);
  const navigation = useNavigation();
  const [selectedLanguage, setSelectedLanguage] = React.useState<string | null>(currentLanguage);

  const handleSelectLanguage = async (code: string) => {
    setSelectedLanguage(code);
    
    // Set the locale
    setLanguage(code as 'en' | 'es');
    
    // Update store
    setStoreLanguage(code as 'en' | 'es');
    
    // Save to AsyncStorage for persistence
    await AsyncStorage.setItem('user_language', code);
    
    // Small delay for visual feedback
    setTimeout(() => {
      if (onLanguageSelected) {
        onLanguageSelected();
      } else {
        // If no callback, go back (accessed from settings)
        navigation.goBack();
      }
    }, 200);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Back button when accessed from settings */}
      {!onLanguageSelected && (
        <TouchableOpacity 
          style={{ position: 'absolute', top: 60, left: 20, zIndex: 10, padding: 8 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ fontSize: 24, color: theme.text }}>←</Text>
        </TouchableOpacity>
      )}

      {/* Logo/Icon */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoEmoji}>🌍</Text>
        <Text style={[styles.appName, { color: theme.primary }]}>QUEST</Text>
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: theme.text }]}>
          Choose Your Language
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Elige tu idioma
        </Text>
      </View>

      {/* Language Options */}
      <View style={styles.languagesContainer}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.languageButton,
              {
                backgroundColor: selectedLanguage === lang.code 
                  ? theme.primary 
                  : theme.card,
                borderColor: selectedLanguage === lang.code 
                  ? theme.primary 
                  : theme.border,
              },
            ]}
            onPress={() => handleSelectLanguage(lang.code)}
            activeOpacity={0.8}
          >
            <Text style={styles.flag}>{lang.flag}</Text>
            <View style={styles.languageTextContainer}>
              <Text
                style={[
                  styles.languageName,
                  {
                    color: selectedLanguage === lang.code 
                      ? '#FFFFFF' 
                      : theme.text,
                  },
                ]}
              >
                {lang.nativeName}
              </Text>
              <Text
                style={[
                  styles.languageSubname,
                  {
                    color: selectedLanguage === lang.code 
                      ? 'rgba(255,255,255,0.8)' 
                      : theme.textSecondary,
                  },
                ]}
              >
                {lang.name}
              </Text>
            </View>
            {selectedLanguage === lang.code && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Footer hint */}
      <Text style={[styles.hint, { color: theme.textSecondary }]}>
        You can change this later in Settings
        {'\n'}
        Puedes cambiarlo después en Ajustes
      </Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
  },
  languagesContainer: {
    width: '100%',
    gap: 16,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
  },
  flag: {
    fontSize: 40,
    marginRight: 16,
  },
  languageTextContainer: {
    flex: 1,
  },
  languageName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 2,
  },
  languageSubname: {
    fontSize: 14,
  },
  checkmark: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  hint: {
    textAlign: 'center',
    marginTop: 48,
    fontSize: 13,
    lineHeight: 20,
  },
});
