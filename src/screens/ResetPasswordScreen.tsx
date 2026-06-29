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

type Props = { navigation: any; route: any };

function mapOtpError(msg: string): string {
  if (msg.includes('expired')) return 'Kodun süresi dolmuş. "Tekrar gönder"e tıklayın.';
  if (msg.toLowerCase().includes('invalid')) return 'Kod hatalı. Tekrar deneyin.';
  return 'Kod doğrulanamadı. Tekrar deneyin.';
}

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const email: string = route.params?.email ?? '';
  const [kod, setKod] = useState('');
  const [yeniSifre, setYeniSifre] = useState('');
  const [showSifre, setShowSifre] = useState(false);
  const [sifre2, setSifre2] = useState('');
  const [showSifre2, setShowSifre2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hata, setHata] = useState('');
  const [yeniden, setYeniden] = useState(false);
  const [basarili, setBasarili] = useState(false);
  const insets = useSafeAreaInsets();

  const handleSifirla = async () => {
    if (kod.length !== 6) { setHata('6 haneli kodu girin.'); return; }
    if (yeniSifre.length < 8) { setHata('Şifre en az 8 karakter olmalı.'); return; }
    if (yeniSifre !== sifre2) { setHata('Şifreler eşleşmiyor.'); return; }
    setLoading(true);
    setHata('');
    try {
      const { error: otpErr } = await supabase.auth.verifyOtp({
        email, token: kod, type: 'recovery',
      });
      if (otpErr) throw new Error(mapOtpError(otpErr.message));

      const { error: updateErr } = await supabase.auth.updateUser({ password: yeniSifre });
      if (updateErr) throw new Error(updateErr.message);

      await supabase.auth.signOut();
      setBasarili(true);
      setTimeout(() => {
        navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
      }, 1800);
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTekrarGonder = async () => {
    await supabase.auth.resetPasswordForEmail(email);
    setYeniden(true);
    setTimeout(() => setYeniden(false), 30000);
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[styles.container, { paddingBottom: insets.bottom }]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
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
          <Text style={styles.backText}>Geri</Text>
        </TouchableOpacity>

        <View style={styles.logoArea}>
          <Text style={styles.brand}>GAYRİMENK PRO</Text>
          <Text style={styles.baslik}>Şifre Sıfırlama</Text>
          <Text style={styles.aciklama}>
            E-postanıza gelen 6 haneli kodu ve yeni şifrenizi girin.
          </Text>
        </View>

        {basarili ? (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>
              ✓ Şifren güncellendi! Yeni şifrenle giriş yapabilirsin.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.infoBanner}>
              <Text style={styles.infoText}>
                Kayıtlıysa kodu e-posta adresinize gönderdik.
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Sıfırlama Kodu</Text>
                <TextInput
                  style={styles.input}
                  value={kod}
                  onChangeText={v => { setKod(v); if (hata) setHata(''); }}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="6 haneli kod"
                  placeholderTextColor={colors.placeholder}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Yeni Şifre</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={yeniSifre}
                    onChangeText={v => { setYeniSifre(v); if (hata) setHata(''); }}
                    secureTextEntry={!showSifre}
                    autoCapitalize="none"
                    placeholder="En az 8 karakter"
                    placeholderTextColor={colors.placeholder}
                  />
                  <TouchableOpacity
                    onPress={() => setShowSifre(v => !v)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showSifre ? 'eye-off-outline' : 'eye-outline'}
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
                    secureTextEntry={!showSifre2}
                    autoCapitalize="none"
                    placeholder="Şifreyi tekrar girin"
                    placeholderTextColor={colors.placeholder}
                  />
                  <TouchableOpacity
                    onPress={() => setShowSifre2(v => !v)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showSifre2 ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {(() => {
              if (hata) return <Text style={[styles.feedback, { color: colors.error }]}>{hata}</Text>;
              if (yeniSifre.length > 0 && yeniSifre.length < 8)
                return <Text style={[styles.feedback, { color: colors.textMuted }]}>En az 8 karakter</Text>;
              if (sifre2.length > 0 && yeniSifre !== sifre2)
                return <Text style={[styles.feedback, { color: colors.error }]}>Şifreler eşleşmiyor</Text>;
              return null;
            })()}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSifirla}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Sıfırlanıyor...' : 'Şifreyi Sıfırla'}
              </Text>
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>
                Kodu almadınız?{' '}
                <Text
                  style={[styles.footerLink, yeniden && { color: colors.textMuted }]}
                  onPress={yeniden ? undefined : handleTekrarGonder}
                >
                  {yeniden ? 'Gönderildi' : 'Tekrar gönder'}
                </Text>
              </Text>
            </View>
          </>
        )}
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
  infoBanner: {
    backgroundColor: colors.accentSurface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    color: colors.primaryAccent,
    textAlign: 'center',
    lineHeight: 18,
  },
  successBanner: {
    backgroundColor: colors.successSurface,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  successText: {
    fontSize: 16,
    color: colors.success,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
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
  feedback: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    backgroundColor: isDark ? colors.primaryAccent : colors.primary,
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
    fontSize: 13,
    color: colors.textMuted,
  },
  footerLink: {
    color: colors.primaryAccent,
    fontWeight: '500',
  },
});
