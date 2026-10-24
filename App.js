import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, Text, ScrollView } from 'react-native';
import { NavigationContainer, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Home, Search, Heart, MessageSquare } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import './lib/i18n';
import { loadSavedLanguage } from './lib/i18n';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen'; 
import ForgotPasswordScreen from './screens/ForgotPasswordScreen'; 
import ResetPasswordScreen from './screens/ResetPasswordScreen'; 
import OnboardingScreen from './screens/OnboardingScreen';

import HomeScreen from './screens/HomeScreen';
import ComposeScreen from './screens/ComposeScreen';
import MessagesScreen from './screens/MessagesScreen';
import ChatScreen from './screens/ChatScreen';
import DatingScreen from './screens/DatingScreen';
import ProfileScreen from './screens/ProfileScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import SearchScreen from './screens/SearchScreen';
import TopicsScreen from './screens/TopicsScreen';
import DiscoverScreen from './screens/DiscoverScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import DatingProfileScreen from './screens/DatingProfileScreen';
import SavedPostsScreen from './screens/SavedPostsScreen';
import SettingsScreen from './screens/SettingsScreen';
import AdminReportsScreen from './screens/AdminReportsScreen';
import AdminVerificationsScreen from './screens/AdminVerificationsScreen';
import ModerationLogScreen from './screens/ModerationLogScreen';
import AdminAppealsScreen from './screens/AdminAppealsScreen';
import BlockedUsersScreen from './screens/BlockedUsersScreen';
import MyReportsScreen from './screens/MyReportsScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import PostDetailScreen from './screens/PostDetailScreen';
import DatingMatchesScreen from './screens/DatingMatchesScreen';
import EditPostScreen from './screens/EditPostScreen';
import DeleteAccountScreen from './screens/DeleteAccountScreen';
import ExportDataScreen from './screens/ExportDataScreen';
import ConnectionsScreen from './screens/ConnectionsScreen';
import NotificationSettingsScreen from './screens/NotificationSettingsScreen';
import PrivacySettingsScreen from './screens/PrivacySettingsScreen';
import TopicDetailScreen from './screens/TopicDetailScreen';
import VerificationRequestScreen from './screens/VerificationRequestScreen';
import ActiveSessionsScreen from './screens/ActiveSessionsScreen';
import FeedPreferencesScreen from './screens/FeedPreferencesScreen';
import CreateGroupScreen from './screens/CreateGroupScreen';
import GroupDetailsScreen from './screens/GroupDetailsScreen';
import CreateTopicScreen from './screens/CreateTopicScreen';
import AppealScreen from './screens/AppealScreen';

import TwoFactorSetupScreen from './screens/TwoFactorSetupScreen';
import TwoFactorVerifyScreen from './screens/TwoFactorVerifyScreen';

import { setAuthToken, setUnauthorizedHandler } from './lib/api';
import { AppProvider, useAppContext } from './lib/AppContext';
import { useTheme } from './lib/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Error Boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("App Crashed:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: 'red', fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>App Crashed</Text>
          <ScrollView style={{ maxHeight: 400 }}>
            <Text style={{ color: 'red' }}>{this.state.error?.toString()}</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

function MainTabs({ onLogout }) {
  const { unreadMessages } = useAppContext();
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Tab.Navigator screenOptions={({ route }) => ({ 
      headerShown: false,
      tabBarActiveTintColor: theme.primary,
      tabBarInactiveTintColor: theme.tabBarInactive,
      tabBarStyle: { 
        backgroundColor: theme.tabBar,
        borderTopColor: theme.border,
        paddingTop: 5,
      }
    })}>
      <Tab.Screen name="FeedTab" options={{ title: t('feed'), tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}>
        {(props) => <HomeScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="SearchTab" component={SearchScreen} options={{ title: t('search'), tabBarIcon: ({ color, size }) => <Search color={color} size={size} /> }} />
      <Tab.Screen name="DatingTab" component={DatingScreen} options={{ title: t('dating'), tabBarIcon: ({ color, size }) => <Heart color={color} size={size} /> }} />
      <Tab.Screen name="MessagesTab" component={MessagesScreen} options={{ title: t('messages'), tabBarBadge: unreadMessages > 0 ? unreadMessages : null, tabBarBadgeStyle: { backgroundColor: theme.primary, fontSize: 10 }, tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} /> }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(true);
  const theme = useTheme();

  const handleLogout = async () => {
    setIsLoggedIn(false);
    setAuthToken(null);
    try {
      await SecureStore.deleteItemAsync('qarota_token');
    } catch (error) {
      console.error('Could not clear the saved session:', error);
    }
  };

  useEffect(() => {
    setUnauthorizedHandler(() => {
      handleLogout();
    });
  }, []);

  useEffect(() => {
    // 1. Load language in the background. DO NOT block the UI with 'await'.
    loadSavedLanguage().catch(e => console.log("Language load error:", e));

    // 2. Handle token and onboarding without hanging
    (async () => {
      try {
        const onboarded = await AsyncStorage.getItem('@qarota_onboarded');
        setHasOnboarded(onboarded === 'true');

        const token = await SecureStore.getItemAsync('qarota_token');
        if (token) {
          setAuthToken(token);
          setIsLoggedIn(true); 
        }
      } catch (e) {
        console.log('Startup error:', e);
      } finally {
        // 3. This will ALWAYS run now
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    return <View style={[styles.loading, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
  }

  const navTheme = {
    ...NavigationDefaultTheme,
    colors: {
      ...NavigationDefaultTheme.colors,
      background: theme.background,
      card: theme.header,
      text: theme.text,
      border: theme.border,
      primary: theme.primary,
    }
  };

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppProvider key={isLoggedIn ? 'authenticated' : 'anonymous'}>
          <NavigationContainer theme={navTheme}>
            <Stack.Navigator 
              key={isLoggedIn ? 'loggedIn' : 'loggedOut'}
              screenOptions={{ 
                headerStyle: { backgroundColor: theme.header },
                headerTintColor: '#fff',
                headerTitleStyle: { color: theme.headerText, fontWeight: '800' }
              }}
            >
              {!hasOnboarded ? (
                <Stack.Screen name="Onboarding" options={{ headerShown: false }}>
                  {(props) => <OnboardingScreen {...props} onFinish={() => setHasOnboarded(true)} />}
                </Stack.Screen>
              ) : isLoggedIn ? (
                <React.Fragment>
                  <Stack.Screen name="Main" options={{ headerShown: false }}>
                    {(props) => <MainTabs {...props} onLogout={handleLogout} />}
                  </Stack.Screen>
                  <Stack.Screen name="Compose" options={{ presentation: 'modal', title: 'New Post' }}>
                    {(props) => <ComposeScreen {...props} onClose={() => props.navigation.goBack()} onPosted={() => { props.navigation.goBack(); }} />}
                  </Stack.Screen>
                  <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false, presentation: 'modal' }} />
                  <Stack.Screen name="DatingProfile" component={DatingProfileScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="Chat" component={ChatScreen} />
                  <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: 'Create group' }} />
                  <Stack.Screen name="GroupDetails" component={GroupDetailsScreen} />
                  <Stack.Screen name="Profile">
                    {(props) => <ProfileScreen {...props} onLogout={handleLogout} />}
                  </Stack.Screen>
                  <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="Topics" component={TopicsScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="CreateTopic" component={CreateTopicScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="Discover" component={DiscoverScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="SavedPosts" component={SavedPostsScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="MyReports" component={MyReportsScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ExportData" component={ExportDataScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="DeleteAccount">
                    {(props) => <DeleteAccountScreen {...props} onLogout={handleLogout} />}
                  </Stack.Screen>
                  <Stack.Screen name="EditPost" component={EditPostScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="Connections" component={ConnectionsScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="DatingMatches" component={DatingMatchesScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="TopicDetail" component={TopicDetailScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="VerificationRequest" component={VerificationRequestScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ActiveSessions" component={ActiveSessionsScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="FeedPreferences" component={FeedPreferencesScreen} options={{ headerShown: false }} />
                  
                  <Stack.Screen name="TwoFactorSetup" options={{ headerShown: false }}>
                    {(props) => <TwoFactorSetupScreen {...props} onLogout={handleLogout} />}
                  </Stack.Screen>
                  
                  <Stack.Screen name="AdminAppeals" component={AdminAppealsScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="AdminReports" component={AdminReportsScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="AdminVerifications" component={AdminVerificationsScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ModerationLog" component={ModerationLogScreen} options={{ headerShown: false }} />
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <Stack.Screen name="Login" options={{ headerShown: false }}>
                    {(props) => <LoginScreen {...props} onLogin={() => setIsLoggedIn(true)} />}
                  </Stack.Screen>
                  <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ headerShown: false }} />
                  
                  <Stack.Screen name="TwoFactorVerify" options={{ headerShown: false }}>
                    {(props) => <TwoFactorVerifyScreen {...props} onLogin={() => setIsLoggedIn(true)} />}
                  </Stack.Screen>
                  <Stack.Screen name="Appeal" options={{ headerShown: false }}>
                    {(props) => <AppealScreen {...props} onLogin={() => setIsLoggedIn(true)} />}
                  </Stack.Screen>
                </React.Fragment>
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </AppProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});