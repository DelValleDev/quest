import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useThemeStore, useAuthStore } from './src/store';
import { supabase } from './src/lib/supabase';
import { 
  WelcomeScreen, 
  AuthScreen, 
  QuestCoachScreen,
  AssessmentScreen,
  AssessmentResultsScreen,
  DuelsScreen,
  RaidsScreen,
  ClassSelectionScreen,
  LeaderboardScreen,
  AgendaScreen,
} from './src/screens';
import { MainTabs } from './src/navigation';
import * as Linking from 'expo-linking';

export type RootStackParamList = {
  Welcome: undefined;
  Auth: undefined;
  Main: undefined;
  QuestCoach: undefined;
  Duels: undefined;
  Raids: undefined;
  Leaderboard: undefined;
  Agenda: undefined;
  ClassSelection: { onboarding?: boolean };
  Assessment: { onboarding?: boolean };
  AssessmentResults: { scores: Record<string, number>; onboarding?: boolean };
  // Onboarding flow
  OnboardingAssessment: undefined;
  OnboardingClassSelection: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const { mode } = useThemeStore();
  const { session, setSession, isLoading, setIsLoading, isOnboarded, setIsOnboarded } = useAuthStore();
  const [showWelcome, setShowWelcome] = useState(true);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // Check if user has completed onboarding (assessment)
  const checkOnboardingStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('assessment_completed, user_class')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      // User is onboarded if they completed assessment AND selected class
      const isComplete = data?.assessment_completed === true && data?.user_class !== null;
      setIsOnboarded(isComplete);
    } catch (e) {
      console.error('Error checking onboarding:', e);
      setIsOnboarded(false);
    } finally {
      setCheckingOnboarding(false);
    }
  };

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        checkOnboardingStatus(session.user.id);
      } else {
        setCheckingOnboarding(false);
      }
      setIsLoading(false);
    });

    // Deep link handler: parse tokens from URL hash and set Supabase session
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      try {
        const parts = url.split('#');
        const hash = parts[1] ?? '';
        if (!hash) return;
        const params = Object.fromEntries(new URLSearchParams(hash));
        const access_token = params['access_token'];
        const refresh_token = params['refresh_token'];
        if (access_token && refresh_token) {
          await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          const { data } = await supabase.auth.getSession();
          setSession(data.session);
          if (data.session?.user) {
            checkOnboardingStatus(data.session.user.id);
          }
        }
      } catch (e) {
        console.warn('Deep link handling error', e);
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const urlSub = Linking.addEventListener('url', (event: { url: string }) => handleUrl(event.url));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) {
          checkOnboardingStatus(session.user.id);
        } else {
          setIsOnboarded(false);
          setCheckingOnboarding(false);
        }
      }
    );

    return () => {
      urlSub.remove();
      subscription.unsubscribe();
    };
  }, []);

  const handleGetStarted = () => {
    setShowWelcome(false);
  };

  const handleAuthSuccess = () => {
    // Will check onboarding status automatically
  };

  // Loading state
  if (isLoading || checkingOnboarding) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Not logged in */}
        {showWelcome && !session ? (
          <Stack.Screen name="Welcome">
            {() => <WelcomeScreen onGetStarted={handleGetStarted} />}
          </Stack.Screen>
        ) : !session ? (
          <Stack.Screen name="Auth">
            {() => <AuthScreen onAuthSuccess={handleAuthSuccess} />}
          </Stack.Screen>
        ) : !isOnboarded ? (
          /* Logged in but not onboarded - FORCE assessment */
          <>
            <Stack.Screen 
              name="Assessment" 
              component={AssessmentScreen}
              initialParams={{ onboarding: true }}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen 
              name="AssessmentResults" 
              component={AssessmentResultsScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen 
              name="ClassSelection" 
              component={ClassSelectionScreen}
              initialParams={{ onboarding: true }}
              options={{ gestureEnabled: false }}
            />
          </>
        ) : (
          /* Fully onboarded - main app */
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen 
              name="QuestCoach" 
              component={QuestCoachScreen}
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen 
              name="Duels" 
              component={DuelsScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="Raids" 
              component={RaidsScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="Leaderboard" 
              component={LeaderboardScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="Agenda" 
              component={AgendaScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="ClassSelection" 
              component={ClassSelectionScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="Assessment" 
              component={AssessmentScreen}
              options={{ presentation: 'fullScreenModal', animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="AssessmentResults" 
              component={AssessmentResultsScreen}
              options={{ presentation: 'fullScreenModal', animation: 'fade' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
