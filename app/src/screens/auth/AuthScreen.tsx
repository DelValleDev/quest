import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useThemeStore, useLanguageStore, useAuthStore } from '../../store';
import { getTheme } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { SocialAuth } from '../../lib/socialAuth';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  
  const { mode } = useThemeStore();
  const { language } = useLanguageStore();
  const { setSession } = useAuthStore();
  const theme = getTheme(mode);
  
  // Translation helper
  const t = (en: string, es: string) => language === 'es' ? es : en;

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert(t('Error', 'Error'), t('Please fill in all fields', 'Por favor completa todos los campos'));
      return;
    }

    if (password.length < 6) {
      Alert.alert(t('Error', 'Error'), t('Password must be at least 6 characters', 'La contraseña debe tener al menos 6 caracteres'));
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          if (error.message.includes('Email not confirmed')) {
            Alert.alert(
              t('🤖 Email Not Verified', '🤖 Email No Verificado'),
              t('Please check your inbox and verify your email before signing in.', 'Por favor revisa tu bandeja de entrada y verifica tu email antes de iniciar sesión.'),
              [{ text: t('OK', 'OK') }]
            );
            return;
          }
          throw error;
        }
        onAuthSuccess();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              app_name: 'Quest',
              created_at: new Date().toISOString(),
            }
          }
        });
        if (error) throw error;
        
        // Show verification modal
        setShowVerificationModal(true);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    console.log(`[AuthScreen] Starting ${provider} auth...`);
    setIsSocialLoading(provider);
    
    try {
      const result = provider === 'google' 
        ? await SocialAuth.signInWithGoogle()
        : await SocialAuth.signInWithApple();
      
      console.log('[AuthScreen] Auth result:', { success: result.success, hasUser: !!result.user, error: result.error });
      
      if (result.success && result.user) {
        console.log('[AuthScreen] Getting current session...');
        // Get the current session after successful auth
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[AuthScreen] Session retrieved:', !!session);
        if (session) {
          setSession(session);
          console.log('[AuthScreen] Session set in store');
        }
        console.log('[AuthScreen] Calling onAuthSuccess...');
        onAuthSuccess();
      } else if (result.error && !result.error.includes('cancelado')) {
        console.warn('[AuthScreen] Auth error:', result.error);
        Alert.alert('Error', result.error);
      } else {
        console.log('[AuthScreen] Auth cancelled or no error');
      }
    } catch (error: any) {
      console.error('[AuthScreen] Exception during auth:', error);
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      console.log('[AuthScreen] Clearing loading state');
      setIsSocialLoading(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>🤖</Text>
        <Text style={[styles.title, { color: theme.text }]}>
          {isLogin ? t('Welcome Back', 'Bienvenido de Nuevo') : t('Join the Quest', 'Únete a Quest')}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {isLogin
            ? t('Sign in to continue your journey', 'Inicia sesión para continuar tu viaje')
            : t('Create an account to start your transformation', 'Crea una cuenta para comenzar tu transformación')}
        </Text>
      </View>

      <View style={styles.form}>
        <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.inputLabel, { color: theme.textMuted }]}>{t('Email', 'Correo')}</Text>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder={t('your@email.com', 'tu@email.com')}
            placeholderTextColor={theme.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.inputLabel, { color: theme.textMuted }]}>{t('Password', 'Contraseña')}</Text>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="••••••••"
            placeholderTextColor={theme.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={handleAuth}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              {isLogin ? t('Sign In', 'Iniciar Sesión') : t('Create Account', 'Crear Cuenta')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Social Login Divider */}
        <View style={styles.dividerContainer}>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Text style={[styles.dividerText, { color: theme.textMuted }]}>
            {t('or continue with', 'o continúa con')}
          </Text>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
        </View>

        {/* Social Login Buttons */}
        <View style={styles.socialButtonsContainer}>
          <TouchableOpacity
            style={[styles.socialButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => handleSocialAuth('google')}
            disabled={isSocialLoading !== null}
          >
            {isSocialLoading === 'google' ? (
              <ActivityIndicator color={theme.text} size="small" />
            ) : (
              <>
                <Text style={styles.socialIcon}>🔵</Text>
                <Text style={[styles.socialButtonText, { color: theme.text }]}>Google</Text>
              </>
            )}
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => handleSocialAuth('apple')}
              disabled={isSocialLoading !== null}
            >
              {isSocialLoading === 'apple' ? (
                <ActivityIndicator color={theme.text} size="small" />
              ) : (
                <>
                  <Text style={styles.socialIcon}>🍎</Text>
                  <Text style={[styles.socialButtonText, { color: theme.text }]}>Apple</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setIsLogin(!isLogin)}
        >
          <Text style={[styles.switchText, { color: theme.textSecondary }]}>
            {isLogin ? t("Don't have an account? ", "¿No tienes cuenta? ") : t('Already have an account? ', '¿Ya tienes cuenta? ')}
            <Text style={{ color: theme.primary, fontWeight: '600' }}>
              {isLogin ? t('Sign Up', 'Regístrate') : t('Sign In', 'Inicia Sesión')}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Email Verification Modal */}
      <Modal
        visible={showVerificationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVerificationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={styles.modalEmoji}>📧</Text>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {t('Check Your Email!', '¡Revisa tu Correo!')}
            </Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>
              {t('We sent a verification link to', 'Enviamos un enlace de verificación a')}{'\n'}
              <Text style={{ color: theme.primary, fontWeight: '600' }}>{email}</Text>
            </Text>
            <Text style={[styles.modalHint, { color: theme.textMuted }]}>
              {t('Click the link in the email to verify your account, then come back and sign in.', 'Haz clic en el enlace del email para verificar tu cuenta, luego vuelve e inicia sesión.')}
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                setShowVerificationModal(false);
                setIsLogin(true);
                setPassword('');
              }}
            >
              <Text style={styles.modalButtonText}>{t('Got it!', '¡Entendido!')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    fontSize: 16,
    padding: 0,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  switchButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  switchText: {
    fontSize: 14,
  },
  // Social login styles
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  socialIcon: {
    fontSize: 20,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
  },
  modalEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  modalHint: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
