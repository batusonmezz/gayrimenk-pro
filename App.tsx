import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createStackNavigator } from '@react-navigation/stack';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './src/storage/supabaseClient';
import * as auth from './src/services/auth';
import { setOrganizationId, setRole } from './src/services/authState';
import HomeScreen from './src/screens/HomeScreen';
import FormScreen from './src/screens/FormScreen';
import PreviewScreen from './src/screens/PreviewScreen';
import ResearchScreen from './src/screens/ResearchScreen';
import KayitlarScreen from './src/screens/KayitlarScreen';
import MalSahibiScreen from './src/screens/MalSahibiScreen';
import ListeScreen from './src/screens/ListeScreen';
import OdemeTakipScreen from './src/screens/OdemeTakipScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';

const Stack = createStackNavigator();

const screenOptions = {
  headerShown: false,
  cardStyle: { flex: 1, overflow: 'auto' as any },
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (event === 'INITIAL_SESSION' && session) {
        const user = await auth.getCurrentUser();
        setOrganizationId(user?.organizationId ?? null);
        setRole(user?.role ?? null);
      } else if (event === 'SIGNED_OUT') {
        setOrganizationId(null);
      }
    });

    return () => subscription.unsubscribe();
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
            {session ? (
              <>
                <Stack.Screen name="Home"         component={HomeScreen} />
                <Stack.Screen name="Form"         component={FormScreen} />
                <Stack.Screen name="Preview"      component={PreviewScreen} />
                <Stack.Screen name="Research"     component={ResearchScreen} />
                <Stack.Screen name="Kayitlar"     component={KayitlarScreen} />
                <Stack.Screen name="MalSahipleri" component={MalSahibiScreen} />
                <Stack.Screen name="Liste"        component={ListeScreen} />
                <Stack.Screen name="OdemeTakip"  component={OdemeTakipScreen} />
              </>
            ) : (
              <>
                <Stack.Screen name="Login"  component={LoginScreen} />
                <Stack.Screen name="Signup" component={SignupScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </SafeAreaProvider>
  );
}
