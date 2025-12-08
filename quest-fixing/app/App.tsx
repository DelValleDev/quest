import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useThemeStore, useAuthStore } from './src/store';
import { supabase } from './src/lib/supabase';
import { WelcomeScreen, AuthScreen, HomeScreen } from './src/screens';

const Stack = createNativeStackNavigator();

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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
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
          <Stack.Screen name="Home" component={HomeScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
