import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '../store';
import { getTheme } from '../theme/colors';
import { HomeScreen } from '../screens/main/HomeScreen';
import { ChallengesScreen } from '../screens/main/ChallengesScreen';
import { DailyQuestsScreen } from '../screens/main/DailyQuestsScreen';
import { AchievementsScreen } from '../screens/main/AchievementsScreen';
import { ShopScreen } from '../screens/main/ShopScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';

const Tab = createBottomTabNavigator();

interface TabIconProps {
  focused: boolean;
  icon: string;
  label: string;
  color: string;
}

const TabIcon: React.FC<TabIconProps> = ({ focused, icon, label, color }) => (
  <View style={styles.tabItem}>
    <Text style={[styles.tabIcon, { opacity: focused ? 1 : 0.6 }]}>{icon}</Text>
    <Text style={[styles.tabLabel, { color, opacity: focused ? 1 : 0.6 }]}>
      {label}
    </Text>
  </View>
);

export const MainTabs: React.FC = () => {
  const { mode } = useThemeStore();
  const theme = getTheme(mode);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 85,
          paddingTop: 10,
          paddingBottom: 25,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} icon="🏠" label="Home" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Daily"
        component={DailyQuestsScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} icon="📋" label="Daily" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Challenges"
        component={ChallengesScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} icon="⚔️" label="Quests" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Achievements"
        component={AchievementsScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} icon="🏆" label="Badges" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Shop"
        component={ShopScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} icon="🛒" label="Shop" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} icon="👤" label="Profile" color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
});
