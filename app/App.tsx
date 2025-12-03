import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useThemeStore, useAuthStore } from './src/store';
import { supabase } from './src/lib/supabase';
import { 
  WelcomeScreen, 
  AuthScreen, 
  QuestCoachScreen,
  AssessmentScreen,
  AssessmentResultsScreen,
} from './src/screens';
import { MainTabs } from './src/navigation';
import * as Linking from 'expo-linking';

export type RootStackParamList = {
  Welcome: undefined;
  Auth: undefined;
  Main: undefined;
  QuestCoach: undefined;
  Assessment: undefined;
  AssessmentResults: { scores: Record<string, number> };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const { mode } = useThemeStore();
  const { session, setSession, isLoading, setIsLoading } = useAuthStore();
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Deep link handler: parse tokens from URL hash and set Supabase session
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      try {
        // URL may contain tokens in the hash (#access_token=...&refresh_token=...)
        const parts = url.split('#');
        const hash = parts[1] ?? '';
        if (!hash) return;
        const params = Object.fromEntries(new URLSearchParams(hash));
        const access_token = params['access_token'];
        const refresh_token = params['refresh_token'];
        if (access_token && refresh_token) {
          // Set session in supabase client
          // supabase.auth.setSession exists in v2
          await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          // update store
          const { data } = await supabase.auth.getSession();
          setSession(data.session);
        }
      } catch (e) {
        console.warn('Deep link handling error', e);
      }
    };

    // handle cold start
    Linking.getInitialURL().then(handleUrl);
    // handle when app is already open
    const urlSub = Linking.addEventListener('url', (event: { url: string }) => handleUrl(event.url));

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      urlSub.remove();
      subscription.unsubscribe();
    };
  }, []);

  // Handle navigation after welcome
  const handleGetStarted = () => {
    setShowWelcome(false);
  };

  // Handle auth success
  const handleAuthSuccess = () => {
    // Navigation will be handled automatically when session changes
  };

  return (
    <NavigationContainer>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {showWelcome && !session ? (
          <Stack.Screen name="Welcome">
            {() => <WelcomeScreen onGetStarted={handleGetStarted} />}
          </Stack.Screen>
        ) : !session ? (
          <Stack.Screen name="Auth">
            {() => <AuthScreen onAuthSuccess={handleAuthSuccess} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen 
              name="QuestCoach" 
              component={QuestCoachScreen}
              options={{ 
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen 
              name="Assessment" 
              component={AssessmentScreen}
              options={{ 
                presentation: 'fullScreenModal',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen 
              name="AssessmentResults" 
              component={AssessmentResultsScreen}
              options={{ 
                presentation: 'fullScreenModal',
                animation: 'fade',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
