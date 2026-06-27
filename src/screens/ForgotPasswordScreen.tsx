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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../storage/supabaseClient';
import { useTheme } from '../theme';

type Props = { navigation: any };

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [hata, setHata] = useState('');
  const insets = useSafeAreaInsets();

  const handleGonder = async () => {
    if (!email.trim()) {
      setHata('E-posta adresi gerekli.');
      return;
    }
    setLoading(true);
    setHata('');
    try {
      await supabase.auth.resetPasswordForEmail(email.trim());
      // Her zaman başarılı kabul et — e-posta kayıtlı olup olmadığını ifşa etme
      navigation.navigate('ResetPassword', { email: email.trim() });
    } catch {
      setHata('Bir sorun oluştu, tekrar deneyin.');
    } finally {
      setLoading(false);
    }
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
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={20} color={colors.primaryAccent} />
          <Text style={styles.backText}>Giriş ekranı</Text>
        </TouchableOpacity>

        <View style={styles.logoArea}>
          <Text style={styles.brand}>GAYRİMENK PRO</Text>
          <Text style={styles.baslik}>Şifremi Unuttum</Text>
          <Text style={styles.aciklama}>
            E-posta adresinizi girin, sıfırlama kodunu gönderelim.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Text style={styles.label}>E-posta</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={v => { setEmail(v); if (hata) setHata(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="ornek@email.com"
              placeholderTextColor={colors.placeholder}
            />
          </View>
        </View>

        {hata ? <Text style={styles.feedback}>{hata}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleGonder}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Gönderiliyor...' : 'Kod Gönder'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
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
  baslik: {
    fontSize: 26,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  aciklama: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
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
  feedback: {
    fontSize: 13,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    backgroundColor: isDark ? colors.primaryAccent : colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
});
