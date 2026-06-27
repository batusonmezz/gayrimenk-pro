import React, { useState } from 'react';
import {
  Alert,
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

export default function ForcePasswordChangeScreen() {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const [yeniSifre, setYeniSifre] = useState('');
  const [sifre2, setSifre2] = useState('');
  const [loading, setLoading] = useState(false);
  const [hata, setHata] = useState('');
  const [goster1, setGoster1] = useState(false);
  const [goster2, setGoster2] = useState(false);
  const insets = useSafeAreaInsets();

  const handleKaydet = async () => {
    if (yeniSifre.length < 8) {
      setHata('Şifre en az 8 karakter olmalı.');
      return;
    }
    if (yeniSifre !== sifre2) {
      setHata('Şifreler eşleşmiyor.');
      return;
    }
    setLoading(true);
    setHata('');
    try {
      const { error: rpcErr } = await supabase.rpc('clear_must_change_password');
      if (rpcErr) throw new Error('Şifre sıfırlanamadı. Lütfen tekrar deneyin.');

      const { error: authErr } = await supabase.auth.updateUser({ password: yeniSifre });
      if (authErr) throw new Error(authErr.message);
      setLoading(false);
      Alert.alert('Şifre güncellendi', 'Lütfen yeni şifrenizle giriş yapın.', [
        { text: 'Tamam', onPress: () => { supabase.auth.signOut(); } },
      ]);
    } catch (e: any) {
      setHata(e.message);
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
        <View style={styles.logoArea}>
          <Text style={styles.brand}>GAYRİMENK PRO</Text>
          <Text style={styles.baslik}>Şifrenizi Değiştirin</Text>
          <Text style={styles.aciklama}>
            Hesabınız için yeni bir şifre belirlemeniz gerekmektedir.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Yeni Şifre</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={yeniSifre}
                onChangeText={v => { setYeniSifre(v); if (hata) setHata(''); }}
                secureTextEntry={!goster1}
                autoCapitalize="none"
                placeholder="En az 8 karakter"
                placeholderTextColor={colors.placeholder}
              />
              <TouchableOpacity
                onPress={() => setGoster1(v => !v)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={goster1 ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Şifre Tekrar</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={sifre2}
                onChangeText={v => { setSifre2(v); if (hata) setHata(''); }}
                secureTextEntry={!goster2}
                autoCapitalize="none"
                placeholder="Şifreyi tekrar girin"
                placeholderTextColor={colors.placeholder}
              />
              <TouchableOpacity
                onPress={() => setGoster2(v => !v)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={goster2 ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {(() => {
          if (hata)
            return <Text style={[styles.feedback, { color: colors.error }]}>{hata}</Text>;
          if (yeniSifre.length > 0 && yeniSifre.length < 8)
            return <Text style={[styles.feedback, { color: colors.textMuted }]}>En az 8 karakter</Text>;
          if (sifre2.length > 0 && yeniSifre !== sifre2)
            return <Text style={[styles.feedback, { color: colors.error }]}>Şifreler eşleşmiyor</Text>;
          if (yeniSifre.length >= 8 && sifre2.length > 0 && yeniSifre === sifre2)
            return <Text style={[styles.feedback, { color: colors.success }]}>✓ Şifreler uygun</Text>;
          return null;
        })()}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleKaydet}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Kaydediliyor...' : 'Şifreyi Kaydet'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
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
  feedback: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeBtn: {
    paddingLeft: 8,
    paddingVertical: 2,
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
