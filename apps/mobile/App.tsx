import React from 'react';
import { Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { Loading } from './src/components/ui';
import { colors } from './src/theme';
import type { RootStackParamList, TabsParamList } from './src/navigation/types';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import QuestionsScreen from './src/screens/QuestionsScreen';
import NewQuestionScreen from './src/screens/NewQuestionScreen';
import QuestionDetailScreen from './src/screens/QuestionDetailScreen';
import ConsultScreen from './src/screens/ConsultScreen';
import ExpertDetailScreen from './src/screens/ExpertDetailScreen';
import KundliScreen from './src/screens/KundliScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import VideoCallScreen from './src/screens/VideoCallScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabsParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.border,
  },
};

const TAB_ICONS: Record<keyof TabsParamList, string> = {
  Home: '🏠',
  Questions: '💬',
  Consult: '📹',
  Profile: '👤',
};

function Tabs() {
  const { t } = useAuth();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerTitleStyle: { color: colors.text },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{TAB_ICONS[route.name]}</Text>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('home') }} />
      <Tab.Screen name="Questions" component={QuestionsScreen} options={{ title: t('askExperts') }} />
      <Tab.Screen name="Consult" component={ConsultScreen} options={{ title: t('consult') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t('profile') }} />
    </Tab.Navigator>
  );
}

function Root() {
  const { session, loading, t } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <AuthScreen />;
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="Kundli" component={KundliScreen} options={{ title: t('kundli') }} />
      <Stack.Screen name="NewQuestion" component={NewQuestionScreen} options={{ title: t('askQuestion') }} />
      <Stack.Screen name="QuestionDetail" component={QuestionDetailScreen} options={{ title: t('askExperts') }} />
      <Stack.Screen name="ExpertDetail" component={ExpertDetailScreen} options={{ title: t('bookConsult') }} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Payment' }} />
      <Stack.Screen name="VideoCall" component={VideoCallScreen} options={{ title: t('joinCall') }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="dark" />
        <Root />
      </NavigationContainer>
    </AuthProvider>
  );
}
