import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Linking,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import Constants from 'expo-constants';
import { signOut, getCurrentUser } from '../services/auth';
import { getRole, getEmail, getAvatarUrl, setAvatarUrl } from '../services/authState';
import { roleLabel } from '../utils/roleLabel';
import { useTheme } from '../theme';
import { supabase } from '../storage/supabaseClient';

const DESTEK_WHATSAPP = '905449444108';

export default function ProfilScreen() {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const [email, setEmailState] = useState<string | null>(getEmail);
  const [role, setRoleState] = useState<string | null>(getRole);
  const [silModalAcik, setSilModalAcik] = useState(false);
  const [silLoading, setSilLoading] = useState(false);
  const [onayGirdisi, setOnayGirdisi] = useState('');
  const [avatarPath, setAvatarPath] = useState<string | null>(getAvatarUrl());
  const [cacheBust, setCacheBust] = useState(Date.now());
  const [uploading, setUploading] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!email || !role) {
      getCurrentUser().then(u => {
        setEmailState(u?.user.email ?? null);
        setRoleState(u?.role ?? null);
      });
    }
  }, []);

  const handleCikis = async () => {
    try { await signOut(); } catch { /* App.tsx listener yönlendiriyor */ }
  };

  const handleDestek = () => {
    const msg = encodeURIComponent('Gayrimenkul yönetim sistemi hakkında destek almak istiyorum');
    Linking.openURL(`https://wa.me/${DESTEK_WHATSAPP}?text=${msg}`);
  };

  const handleAvatarPress = async () => {
    const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!izin.granted) {
      Alert.alert('İzin gerekli', 'Galeri izni gerekli.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    const b64 = result.assets[0].base64;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı.');
      const ext = b64.startsWith('iVBORw0K') ? 'png' : 'jpg';
      const contentType = b64.startsWith('iVBORw0K') ? 'image/png' : 'image/jpeg';
      const path = `${user.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, decode(b64), { contentType, upsert: true });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase
        .from('users')
        .update({ avatar_url: path })
        .eq('id', user.id);
      if (dbErr) throw dbErr;
      setAvatarPath(path);
      setAvatarUrl(path);
      setCacheBust(Date.now());
    } catch (e: any) {
      console.error('[avatar] upload hata:', e);
      Alert.alert('Hata', 'Fotoğraf yüklenemedi.');
    } finally {
      setUploading(false);
    }
  };

  const handleHesapSil = async () => {
    setSilLoading(true);
    try {
      const body = role === 'emlakci' ? { confirmation: 'SIL' } : { confirm: true };
      const { data, error } = await supabase.functions.invoke('delete-account', { body });
      if (error || !data?.deleted) throw new Error(error?.message ?? 'Hesap silinemedi. Tekrar deneyin.');
      setSilModalAcik(false);
      try { await handleCikis(); } catch {}
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    } finally {
      setSilLoading(false);
    }
  };

  // Türkçe İ toleransı — backend'e daima ASCII 'SIL' gider
  const onayGecerli = onayGirdisi.trim().replace(/İ/g, 'I').toUpperCase() === 'SIL';

  const versiyon = Constants.expoConfig?.version ?? '—';
  const isOwner = role === 'emlakci';
  const avatarPublicUrl = avatarPath
    ? supabase.storage.from('avatars').getPublicUrl(avatarPath).data.publicUrl
    : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={handleAvatarPress} disabled={uploading} activeOpacity={0.7}
          style={{ position: 'relative' }}>
          {avatarPublicUrl ? (
            <Image
              source={{ uri: `${avatarPublicUrl}?t=${cacheBust}` }}
              style={{ width: 72, height: 72, borderRadius: 36 }}
            />
          ) : (
            <Ionicons name="person-circle" size={72} color={colors.primaryAccent} />
          )}
          {uploading && (
            <ActivityIndicator
              style={{ position: 'absolute', top: 26, left: 26 }}
              color={colors.primaryAccent}
            />
          )}
        </TouchableOpacity>
        <Text style={styles.emailText}>{email ?? ''}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{roleLabel(role)}</Text>
        </View>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        <Text style={styles.sectionLabel}>HESAP</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.row} onPress={handleDestek} activeOpacity={0.7}>
            <Ionicons name="logo-whatsapp" size={20} color={colors.primaryAccent} style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Destek / İletişim</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <View style={styles.row}>
            <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Hakkında</Text>
            <Text style={styles.rowValue}>v{versiyon}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>AYARLAR</Text>
        <View style={styles.settingsCard}>
          <View style={styles.row}>
            <Ionicons name="moon-outline" size={20} color={colors.textFaint} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, styles.dimmed]}>Gece Modu</Text>
            <View style={styles.soonBadge}><Text style={styles.soonText}>Yakında</Text></View>
          </View>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.row} onPress={handleAvatarPress} activeOpacity={0.7}>
            <Ionicons name="camera-outline" size={20} color={colors.primaryAccent} style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Profil Fotoğrafı</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <View style={styles.row}>
            <Ionicons name="document-text-outline" size={20} color={colors.textFaint} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, styles.dimmed]}>Gizlilik / KVKK</Text>
            <View style={styles.soonBadge}><Text style={styles.soonText}>Yakında</Text></View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>DİĞER</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => setSilModalAcik(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { color: colors.error }]}>Hesabımı Sil</Text>
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.row} onPress={handleCikis} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { color: colors.error }]}>Çıkış Yap</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Hesap Silme Onay Modali */}
      <Modal
        visible={silModalAcik}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!silLoading) { setSilModalAcik(false); setOnayGirdisi(''); } }}
      >
        <View style={styles.overlay}>
          <View style={styles.modalKart}>
            <Text style={styles.modalBaslik}>
              {isOwner ? 'Organizasyonu Kalıcı Sil' : 'Hesabı Sil'}
            </Text>

            {isOwner ? (
              <>
                <Text style={styles.modalMetin}>
                  Tüm organizasyonunuz kalıcı olarak silinecek:
                </Text>
                <Text style={styles.modalListeItem}>• Tüm sözleşmeler ve ödemeler</Text>
                <Text style={styles.modalListeItem}>• Tüm kiracı ve mal sahibi kayıtları</Text>
                <Text style={styles.modalListeItem}>• Tüm belgeler ve fotoğraflar</Text>
                <Text style={[styles.modalMetin, { marginTop: 12, fontWeight: '600', color: colors.error }]}>
                  Bu işlem GERİ ALINAMAZ.
                </Text>
                <TextInput
                  style={styles.onayInput}
                  value={onayGirdisi}
                  onChangeText={setOnayGirdisi}
                  placeholder="Onaylamak için SİL yazın"
                  placeholderTextColor={colors.placeholder}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </>
            ) : (
              <Text style={styles.modalMetin}>
                Hesabınız silinecek ve bir daha giriş yapamayacaksınız.
                Bu işlem geri alınamaz.
              </Text>
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtnVazgec, silLoading && styles.modalBtnDisabled]}
                onPress={() => { if (!silLoading) { setSilModalAcik(false); setOnayGirdisi(''); } }}
                disabled={silLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.modalBtnVazgecText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtnSil,
                  (silLoading || (isOwner && !onayGecerli)) && styles.modalBtnDisabled,
                ]}
                onPress={handleHesapSil}
                disabled={silLoading || (isOwner && !onayGecerli)}
                activeOpacity={0.7}
              >
                {silLoading ? (
                  <ActivityIndicator size="small" color={colors.textOnPrimary} />
                ) : (
                  <Text style={styles.modalBtnSilText}>
                    {isOwner ? 'Kalıcı Olarak Sil' : 'Hesabımı Sil'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderFaint,
  },
  emailText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 6,
  },
  roleBadge: {
    backgroundColor: colors.accentSurface,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  roleBadgeText: {
    fontSize: 12,
    color: colors.primaryAccent,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.textMuted,
    fontWeight: '500',
    marginTop: 24,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  settingsCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.border,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowIcon: {
    marginRight: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  rowValue: {
    fontSize: 14,
    color: colors.textMuted,
  },
  rowDivider: {
    height: 0.5,
    backgroundColor: colors.borderFaint,
    marginHorizontal: 16,
  },
  dimmed: {
    color: colors.textFaint,
  },
  soonBadge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  soonText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalKart: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 24,
    width: '100%',
  },
  modalBaslik: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  modalMetin: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  modalListeItem: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
    marginBottom: 2,
  },
  onayInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginTop: 16,
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 2,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalBtnVazgec: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  modalBtnVazgecText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  modalBtnSil: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  modalBtnSilText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textOnPrimary,
  },
  modalBtnDisabled: {
    opacity: 0.4,
  },
});
