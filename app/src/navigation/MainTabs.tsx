import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeStore } from '../store';
import { getTheme } from '../theme/colors';
import { HomeScreen } from '../screens/main/HomeScreen';
import { JourneyHubScreen } from '../screens/main/JourneyHubScreen';
import { SocialHubScreen } from '../screens/main/SocialHubScreen';
import { QuestCoachScreen } from '../screens/main/QuestCoachScreen';
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
          paddingTop: 8,
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
        name="Journey"
        component={JourneyHubScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} icon="🗺️" label="Journey" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Social"
        component={SocialHubScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} icon="👥" label="Social" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Coach"
        component={QuestCoachScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} icon="🤖" label="Coach" color={color} />
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
          tabBarButton: () => null, // Hide from tab bar but keep in navigator
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
    fontSize: 22,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});
