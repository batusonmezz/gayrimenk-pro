import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from './src/theme';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './src/storage/supabaseClient';
import * as auth from './src/services/auth';
import { setOrganizationId, setRole, setMustChangePassword, getRole } from './src/services/authState';
import ForcePasswordChangeScreen from './src/screens/ForcePasswordChangeScreen';
import HomeScreen from './src/screens/HomeScreen';
import FormScreen from './src/screens/FormScreen';
import PreviewScreen from './src/screens/PreviewScreen';
import ResearchScreen from './src/screens/ResearchScreen';
import KayitlarScreen from './src/screens/KayitlarScreen';
import MalSahibiScreen from './src/screens/MalSahibiScreen';
import ListeScreen from './src/screens/ListeScreen';
import OdemeTakipScreen from './src/screens/OdemeTakipScreen';
import SitelerScreen from './src/screens/SitelerScreen';
import KisilerScreen from './src/screens/KisilerScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import ProfilScreen from './src/screens/ProfilScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const role = getRole();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primaryAccent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0.5,
          borderTopColor: colors.borderFaint,
          elevation: 0,
        },
      }}
    >
      <Tab.Screen
        name="AnaSayfa"
        component={HomeScreen}
        options={{ tabBarIcon: ({ color, focused }) =>
          <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} /> }}
      />
      <Tab.Screen
        name="Kayitlar"
        component={KayitlarScreen}
        options={{ tabBarIcon: ({ color, focused }) =>
          <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={24} color={color} /> }}
      />
      {role === 'emlakci' && (
        <Tab.Screen
          name="Kisiler"
          component={KisilerScreen}
          options={{ tabBarIcon: ({ color, focused }) =>
            <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} /> }}
        />
      )}
      <Tab.Screen
        name="Profil"
        component={ProfilScreen}
        options={{ tabBarIcon: ({ color, focused }) =>
          <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={24} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

const screenOptions = {
  headerShown: false,
  cardStyle: { flex: 1, overflow: 'auto' as any },
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePasswordState] = useState(false);
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState(false);

  useEffect(() => {
    let mounted = true;

    const withTimeout = <T,>(p: Promise<T>, ms = 8000): Promise<T> =>
      Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

    const bootstrap = async () => {
      try {
        const { data: { session } } = await withTimeout(supabase.auth.getSession());
        if (!mounted) return;
        setSession(session);
        if (session) {
          try {
            const user = await withTimeout(auth.getCurrentUser());
            if (!mounted) return;
            setOrganizationId(user?.organizationId ?? null);
            setRole(user?.role ?? null);
            setMustChangePasswordState(user?.mustChangePassword ?? false);
          } catch {
            console.warn('[App] bootstrap getCurrentUser hatasi - oturum korunuyor');
          }
        }
      } catch {
        if (!mounted) return;
        setSession(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryMode(true);
        if (mounted) setLoading(false);
        return;
      }
      try {
        if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session) {
          const user = await withTimeout(auth.getCurrentUser());
          if (!mounted) return;
          setOrganizationId(user?.organizationId ?? null);
          setRole(user?.role ?? null);
          setMustChangePasswordState(user?.mustChangePassword ?? false);
        } else if (event === 'SIGNED_OUT') {
          setPasswordRecoveryMode(false);
          setOrganizationId(null);
          setMustChangePasswordState(false);
          setMustChangePassword(false);
        }
      } catch {
        console.warn('[App] onAuthStateChange getCurrentUser hatası');
      } finally {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f0' }}>
          <ActivityIndicator size="large" color="#1a2e1a" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, height: '100vh' as any, overflow: 'auto' as any }}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={screenOptions}>
            {(!session || passwordRecoveryMode) ? (
              <>
                <Stack.Screen name="Welcome"        component={WelcomeScreen} />
                <Stack.Screen name="Login"          component={LoginScreen} />
                <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                <Stack.Screen name="ResetPassword"  component={ResetPasswordScreen} />
              </>
            ) : mustChangePassword ? (
              <Stack.Screen name="ForcePasswordChange" component={ForcePasswordChangeScreen} />
            ) : (
              <>
                <Stack.Screen name="MainTabs"     component={MainTabs} />
                <Stack.Screen name="Form"         component={FormScreen} />
                <Stack.Screen name="Preview"      component={PreviewScreen} />
                <Stack.Screen name="Research"     component={ResearchScreen} />
                <Stack.Screen name="MalSahipleri" component={MalSahibiScreen} />
                <Stack.Screen name="Liste"        component={ListeScreen} />
                <Stack.Screen name="OdemeTakip"   component={OdemeTakipScreen} />
                <Stack.Screen name="Siteler"      component={SitelerScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </SafeAreaProvider>
  );
}
