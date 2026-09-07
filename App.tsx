import 'react-native-gesture-handler';
import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, Image, Text, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, ThemeProvider, useTheme } from './src/theme';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './src/storage/supabaseClient';
import * as auth from './src/services/auth';
import { setOrganizationId, setRole, setMustChangePassword, getRole, getAvatarUrl, subscribeAvatar } from './src/services/authState';
import ForcePasswordChangeScreen from './src/screens/ForcePasswordChangeScreen';
import HomeScreen from './src/screens/HomeScreen';
import FormScreen from './src/screens/FormScreen';
import PreviewScreen from './src/screens/PreviewScreen';
import ResearchScreen from './src/screens/ResearchScreen';
import MalSahibiScreen from './src/screens/MalSahibiScreen';
import ListeScreen from './src/screens/ListeScreen';
import OdemeTakipScreen from './src/screens/OdemeTakipScreen';
import SitelerScreen from './src/screens/SitelerScreen';
import SozlesmelerHub from './src/screens/SozlesmelerHub';
import KisilerHub from './src/screens/KisilerHub';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import ProfilScreen from './src/screens/ProfilScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const EmptyScreen = () => null;

function ProfilTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const [avatarPath, setAvatarPath] = useState<string | null>(getAvatarUrl());
  const [cacheBust, setCacheBust] = useState(Date.now());
  useEffect(() => {
    const unsub = subscribeAvatar((v) => {
      setAvatarPath(v);
      setCacheBust(Date.now());
    });
    return unsub;
  }, []);
  const avatarPublicUrl = avatarPath
    ? supabase.storage.from('avatars').getPublicUrl(avatarPath).data.publicUrl
    : null;
  return avatarPublicUrl ? (
    <Image
      source={{ uri: `${avatarPublicUrl}?t=${cacheBust}` }}
      style={{
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: focused ? 2 : 0,
        borderColor: color,
      }}
    />
  ) : (
    <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={24} color={color} />
  );
}

function MainTabs() {
  const { colors } = useTheme();
  const [role, setRoleState] = useState(getRole());
  useEffect(() => {
    if (!role) {
      auth.getCurrentUser().then(u => setRoleState(u?.role ?? null)).catch(() => {});
    }
  }, []);
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
          overflow: 'visible',
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
        component={SozlesmelerHub}
        options={{
          headerShown: false,
          tabBarLabel: 'Sözleşmeler',
          tabBarIcon: ({ color, focused }) =>
            <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={24} color={color} />,
        }}
      />
      {role === 'emlakci' && (
        <Tab.Screen
          name="YeniSozlesme"
          component={EmptyScreen}
          options={{
            tabBarLabel: () => null,
            tabBarIcon: () => (
              <View style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: colors.primaryAccent,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
                elevation: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.20,
                shadowRadius: 3,
              }}>
                <Ionicons name="add" size={28} color="#fff" />
              </View>
            ),
          }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate('Form', {
                type: 'kira',
                title: 'Kira Sözleşmesi',
              });
            },
          })}
        />
      )}
      {role === 'emlakci' && (
        <Tab.Screen
          name="Kisiler"
          component={KisilerHub}
          options={{
            headerShown: false,
            tabBarIcon: ({ color, focused }) =>
              <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />,
          }}
        />
      )}
      <Tab.Screen
        name="Profil"
        component={ProfilScreen}
        options={{
          tabBarIcon: ({ color, focused }) => <ProfilTabIcon color={color} focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const screenOptions = {
  headerShown: false,
  cardStyle: { flex: 1, overflow: 'auto' as any },
};

const withTimeout = <T,>(p: Promise<T>, ms = 8000): Promise<T> =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

function AppInner() {
  const { colors, isDark } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePasswordState] = useState<boolean | null>(null);
  const [authHatasi, setAuthHatasi] = useState(false);
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState(false);

  const kullaniciBilgisiYukle = useCallback(async () => {
    setAuthHatasi(false);
    try {
      const user = await withTimeout(auth.getCurrentUser());
      setOrganizationId(user?.organizationId ?? null);
      setRole(user?.role ?? null);
      setMustChangePasswordState(user?.mustChangePassword ?? false);
    } catch {
      console.warn('[App] getCurrentUser hatasi - kapi kapali tutuluyor');
      setAuthHatasi(true); // mustChangePassword null KALIR
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const { data: { session } } = await withTimeout(supabase.auth.getSession());
        if (!mounted) return;
        setSession(session);
        if (session) {
          await kullaniciBilgisiYukle();
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
      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session) {
        setMustChangePasswordState(null); // parlamayı önleyen satır
        await kullaniciBilgisiYukle();
      } else if (event === 'SIGNED_OUT') {
        setPasswordRecoveryMode(false);
        setOrganizationId(null);
        setMustChangePasswordState(null); // false DEĞİL, null
        setMustChangePassword(false);
        setAuthHatasi(false);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [kullaniciBilgisiYukle]);

  const bilgiBekleniyor = !!session && !passwordRecoveryMode && mustChangePassword === null;

  if (loading || bilgiBekleniyor) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 24 }}>
          {authHatasi ? (
            <>
              <Text style={{ color: colors.text, fontSize: 15, textAlign: 'center', marginBottom: 16 }}>
                Hesap bilgileriniz alinamadi. Baglantinizi kontrol edip tekrar deneyin.
              </Text>
              <TouchableOpacity
                onPress={kullaniciBilgisiYukle}
                style={{ backgroundColor: isDark ? colors.primaryAccent : colors.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28, marginBottom: 12 }}
              >
                <Text style={{ color: colors.textOnPrimary, fontSize: 15, fontWeight: '500' }}>Tekrar Dene</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => supabase.auth.signOut()}>
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Cikis Yap</Text>
              </TouchableOpacity>
            </>
          ) : (
            <ActivityIndicator size="large" color={isDark ? colors.primaryAccent : colors.primary} />
          )}
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
            ) : mustChangePassword === true ? (
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

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
