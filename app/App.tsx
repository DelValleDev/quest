import React, { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore, useAuthStore } from './src/store';
import { supabase } from './src/lib/supabase';
import { NotificationService } from './src/lib/notifications';
import { setLanguage } from './src/lib/i18n';
import { 
  WelcomeScreen,
  LanguageSelectionScreen, 
  AuthScreen, 
  QuestCoachScreen,
  AssessmentScreen,
  AssessmentResultsScreen,
  AspirationsScreen,
  DuelsScreen,
  RaidsScreen,
  ClassSelectionScreen,
  LeaderboardScreen,
  AgendaScreen,
  InitialSetupScreen,
  ShopScreen,
  SocialScreen,
  AchievementsScreen,
  AchievementLogScreen,
  PremiumScreen,
  OnboardingTutorialScreen,
  MyPlanScreen,
  BuyCoinsScreen,
  SettingsScreen,
  RewardsScreen,
  WeeklyReviewScreen,
} from './src/screens';
import { LifePathsScreen } from './src/screens/main/LifePathsScreen';
import { LifePathDetailScreen } from './src/screens/main/LifePathDetailScreen';
import { ManagePillarsScreen } from './src/screens/main/ManagePillarsScreen';
import { GuildFeedScreen } from './src/screens/guilds/GuildFeedScreen';
import { GuildChatScreen } from './src/screens/guilds/GuildChatScreen';
import { RaidPenaltyProposalScreen } from './src/screens/main/RaidPenaltyProposalScreen';
import { RaidPenaltyVotingScreen } from './src/screens/main/RaidPenaltyVotingScreen';
import { MainTabs } from './src/navigation';
import * as Linking from 'expo-linking';

export type RootStackParamList = {
  LanguageSelection: undefined;
  Welcome: undefined;
  Auth: undefined;
  Main: undefined;
  InitialSetup: undefined;
  QuestCoach: undefined;
  Duels: undefined;
  Raids: undefined;
  Leaderboard: undefined;
  Agenda: undefined;
  LifePaths: undefined;
  LifePathDetail: { pathId: string };
  Shop: undefined;
  Social: undefined;
  Achievements: undefined;
  AchievementLog: undefined;
  Premium: undefined;
  MyPlan: undefined;
  BuyCoins: undefined;
  Settings: undefined;
  Rewards: undefined;
  WeeklyReview: undefined;
  OnboardingTutorial: undefined;
  ClassSelection: { onboarding?: boolean };
  ManagePillars: undefined;
  Assessment: { onboarding?: boolean };
  AssessmentResults: { scores: Record<string, number>; onboarding?: boolean };
  Aspirations: { onboarding?: boolean };
  GuildFeed: { guildId: string; guildName: string };
  GuildChat: { guildId: string; guildName: string };
  RaidPenaltyProposal: { raidId: string; loserId: string };
  RaidPenaltyVoting: { raidId: string };
  // Onboarding flow
  OnboardingAssessment: undefined;
  OnboardingClassSelection: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Configure how notifications are displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();
  const { mode } = useThemeStore();
  const { session, setSession, isLoading, setIsLoading, isOnboarded, setIsOnboarded } = useAuthStore();
  const [showLanguageSelection, setShowLanguageSelection] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [needsInitialSetup, setNeedsInitialSetup] = useState(false);
  const [checkingLanguage, setCheckingLanguage] = useState(true);

  // Check if language was already selected
  useEffect(() => {
    const checkLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('user_language');
        if (savedLanguage) {
          setLanguage(savedLanguage as 'en' | 'es');
          setShowLanguageSelection(false);
          setShowWelcome(true);
        }
      } catch (e) {
        console.warn('Error checking language:', e);
      } finally {
        setCheckingLanguage(false);
      }
    };
    checkLanguage();
  }, []);

  // Check if user has completed onboarding (assessment)
  const checkOnboardingStatus = async (userId: string) => {
    console.log('[App] checkOnboardingStatus called for userId:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('assessment_completed, user_class, initial_setup_completed')
        .eq('id', userId)
        .single();
      
      console.log('[App] Profile data:', { data, error: error?.message });
      
      if (error) throw error;
      
      // Check if initial setup (language, name, age) is done
      const setupDone = data?.initial_setup_completed === true;
      setNeedsInitialSetup(!setupDone);
      console.log('[App] Setup status:', { setupDone, needsInitialSetup: !setupDone });
      
      // User is onboarded if they completed assessment (class is auto-assigned)
      const isComplete = data?.assessment_completed === true;
      setIsOnboarded(isComplete);
      console.log('[App] Onboarding status:', { assessmentCompleted: isComplete, isOnboarded: isComplete });
    } catch (e) {
      console.error('[App] Error checking onboarding:', e);
      setNeedsInitialSetup(true);
      setIsOnboarded(false);
    } finally {
      console.log('[App] Setting checkingOnboarding to false');
      setCheckingOnboarding(false);
    }
  };

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      // Handle refresh token errors - clear invalid session
      if (error) {
        console.warn('Session error, signing out:', error.message);
        supabase.auth.signOut();
        setSession(null);
        setCheckingOnboarding(false);
        setIsLoading(false);
        return;
      }
      
      setSession(session);
      if (session?.user) {
        checkOnboardingStatus(session.user.id);
      } else {
        setCheckingOnboarding(false);
      }
      setIsLoading(false);
    }).catch((err) => {
      // Catch any errors including refresh token issues
      console.warn('Session check failed:', err);
      supabase.auth.signOut();
      setSession(null);
      setCheckingOnboarding(false);
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
        console.log('[App] onAuthStateChange fired:', { event: _event, hasSession: !!session, userId: session?.user?.id });
        setSession(session);
        if (session?.user) {
          console.log('[App] Checking onboarding status for user:', session.user.id);
          checkOnboardingStatus(session.user.id);
        } else {
          console.log('[App] No session, setting onboarded to false');
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

  // Initialize notifications when user is logged in
  useEffect(() => {
    if (!session?.user) return;

    const setupNotifications = async () => {
      try {
        // Register for push notifications
        const token = await NotificationService.registerForPushNotifications();
        if (token) {
          // Save token to database
          await supabase
            .from('profiles')
            .update({ push_token: token })
            .eq('id', session.user.id);
        }

        // Schedule daily reminder if not already scheduled
        await NotificationService.scheduleDailyReminder();
      } catch (error) {
        console.warn('Failed to setup notifications:', error);
      }
    };

    setupNotifications();

    // Listen for incoming notifications while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Listen for user interaction with notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Could navigate to specific screen based on notification data
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [session?.user?.id]);


  const handleLanguageSelected = () => {
    setShowLanguageSelection(false);
    setShowWelcome(true);
  };

  const handleGetStarted = () => {
    setShowWelcome(false);
  };

  const handleAuthSuccess = async () => {
    console.log('[App] handleAuthSuccess called');
    // Force check the session and onboarding status
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('[App] handleAuthSuccess - session check:', { hasSession: !!session, userId: session?.user?.id, error: error?.message });
      
      if (session?.user) {
        setSession(session);
        console.log('[App] handleAuthSuccess - calling checkOnboardingStatus');
        await checkOnboardingStatus(session.user.id);
      }
    } catch (e) {
      console.error('[App] handleAuthSuccess error:', e);
    }
  };

  const handleInitialSetupComplete = () => {
    setNeedsInitialSetup(false);
    setBackFromAssessment(false);
  };

  const [backFromAssessment, setBackFromAssessment] = useState(false);
  
  const handleBackToInitialSetup = () => {
    setNeedsInitialSetup(true);
    setBackFromAssessment(true);
  };

  // Loading state
  if (isLoading || checkingOnboarding || checkingLanguage) {
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
        {/* Step 1: Language selection (first time only) */}
        {showLanguageSelection && !session ? (
          <Stack.Screen name="LanguageSelection">
            {() => <LanguageSelectionScreen onLanguageSelected={handleLanguageSelected} />}
          </Stack.Screen>
        ) : showWelcome && !session ? (
          /* Step 2: Welcome slider explaining the app */
          <Stack.Screen name="Welcome">
            {() => <WelcomeScreen onGetStarted={handleGetStarted} />}
          </Stack.Screen>
        ) : !session ? (
          /* Step 3: Auth (login/signup) */
          <Stack.Screen name="Auth">
            {() => <AuthScreen onAuthSuccess={handleAuthSuccess} />}
          </Stack.Screen>
        ) : needsInitialSetup ? (
          /* Logged in but needs initial setup (language, name, age) */
          <Stack.Screen name="InitialSetup">
            {() => <InitialSetupScreen 
              onComplete={handleInitialSetupComplete} 
              initialStep={backFromAssessment ? 'survey_length' : undefined}
            />}
          </Stack.Screen>
        ) : !isOnboarded ? (
          /* Logged in, setup done, but not onboarded - FORCE assessment */
          /* Note: Class is auto-assigned by AI, no manual selection needed */
          <>
            <Stack.Screen 
              name="Assessment"
              options={{ gestureEnabled: false }}
            >
              {() => <AssessmentScreen onBackToSetup={handleBackToInitialSetup} />}
            </Stack.Screen>
            <Stack.Screen 
              name="AssessmentResults" 
              component={AssessmentResultsScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen 
              name="Aspirations" 
              component={AspirationsScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen 
              name="QuestCoach" 
              component={QuestCoachScreen}
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
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
              name="LifePaths" 
              component={LifePathsScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="LifePathDetail" 
              component={LifePathDetailScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="Shop" 
              component={ShopScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="Social" 
              component={SocialScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="GuildChat" 
              component={GuildChatScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="GuildFeed" 
              component={GuildFeedScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="RaidPenaltyProposal" 
              component={RaidPenaltyProposalScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="RaidPenaltyVoting" 
              component={RaidPenaltyVotingScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="Achievements" 
              component={AchievementsScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="ClassSelection" 
              component={ClassSelectionScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="ManagePillars" 
              component={ManagePillarsScreen}
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
            <Stack.Screen 
              name="Aspirations" 
              component={AspirationsScreen}
              options={{ presentation: 'fullScreenModal', animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="AchievementLog" 
              component={AchievementLogScreen}
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen 
              name="Premium" 
              component={PremiumScreen}
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen 
              name="MyPlan" 
              component={MyPlanScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="BuyCoins" 
              component={BuyCoinsScreen}
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="Rewards" 
              component={RewardsScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="WeeklyReview" 
              component={WeeklyReviewScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen 
              name="OnboardingTutorial" 
              component={OnboardingTutorialScreen}
              options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
            />
            <Stack.Screen 
              name="LanguageSelection" 
              component={LanguageSelectionScreen}
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
