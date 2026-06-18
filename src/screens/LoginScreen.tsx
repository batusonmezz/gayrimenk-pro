import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { signIn } from '../services/auth';
import { roleLabel } from '../utils/roleLabel';
import { colors } from '../theme';

const DESTEK_WHATSAPP = '905449444108'; // TODO: numara girilecek

type Props = { navigation: any; route: any };

export default function LoginScreen({ navigation, route }: Props) {
  const role: 'emlakci' | 'mal_sahibi' | 'kiraci' = route.params?.role ?? 'emlakci';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const insets = useSafeAreaInsets();

  const handleGiris = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Email ve şifre gerekli.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await signIn(email.trim(), password);
      if (!user.mustChangePassword) {
        navigation.replace('Home');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent('Gayrimenkul yönetim sistemine kayıt olmak istiyorum');
    Linking.openURL(`https://wa.me/${DESTEK_WHATSAPP}?text=${msg}`);
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[styles.container, { paddingBottom: insets.bottom }]}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate('Welcome')}
        >
          <Ionicons name="chevron-back" size={20} color={colors.primaryAccent} />
          <Text style={styles.backText}>Rol seçimi</Text>
        </TouchableOpacity>

        <View style={styles.logoArea}>
          <Text style={styles.brand}>GAYRİMENK PRO</Text>
          <Text style={styles.roleLabel}>{roleLabel(role)} girişi</Text>
          <Text style={styles.heading}>Hesabınıza giriş yapın</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="ornek@email.com"
              placeholderTextColor={colors.placeholder}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Şifre</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                placeholder="••••••"
                placeholderTextColor={colors.placeholder}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(v => !v)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleGiris}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </Text>
        </TouchableOpacity>

        {role === 'emlakci' ? (
          <TouchableOpacity style={styles.footerRow} onPress={handleWhatsApp}>
            <Text style={styles.footerText}>
              Hesabınız yok mu?{' '}
              <Text style={styles.footerLink}>bizimle iletişime geçin</Text>
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>
              Hesabınız yok mu? Yöneticinizden davet isteyin
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 24,
    gap: 4,
  },
  backText: {
    fontSize: 14,
    color: colors.primaryAccent,
    fontWeight: '500',
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brand: {
    fontSize: 11,
    letterSpacing: 2,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: 8,
  },
  roleLabel: {
    fontSize: 13,
    color: colors.primaryAccent,
    fontWeight: '500',
    marginBottom: 6,
  },
  heading: {
    fontSize: 26,
    fontWeight: '500',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 12,
  },
  fieldRow: {
    padding: 14,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.borderFaint,
    marginHorizontal: 14,
  },
  label: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 14,
    color: colors.text,
    backgroundColor: 'transparent',
    paddingVertical: 2,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeBtn: {
    paddingLeft: 8,
    paddingVertical: 2,
  },
  error: {
    color: colors.error,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  footerRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  footerText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  footerLink: {
    color: colors.primaryAccent,
    fontWeight: '500',
  },
});
