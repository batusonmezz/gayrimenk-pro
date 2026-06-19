import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { signOut, getCurrentUser } from '../services/auth';
import { getRole, getEmail } from '../services/authState';
import { roleLabel } from '../utils/roleLabel';
import { colors } from '../theme';

const DESTEK_WHATSAPP = '905449444108';

export default function ProfilScreen() {
  const [email, setEmailState] = useState<string | null>(getEmail);
  const [role, setRoleState] = useState<string | null>(getRole);
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

  const versiyon = Constants.expoConfig?.version ?? '—';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.profileHeader}>
        <Ionicons name="person-circle" size={72} color={colors.primaryAccent} />
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
          <View style={styles.row}>
            <Ionicons name="camera-outline" size={20} color={colors.textFaint} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, styles.dimmed]}>Profil Fotoğrafı</Text>
            <View style={styles.soonBadge}><Text style={styles.soonText}>Yakında</Text></View>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.row}>
            <Ionicons name="document-text-outline" size={20} color={colors.textFaint} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, styles.dimmed]}>Gizlilik / KVKK</Text>
            <View style={styles.soonBadge}><Text style={styles.soonText}>Yakında</Text></View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>DİĞER</Text>
        <View style={styles.settingsCard}>
          <View style={styles.row}>
            <Ionicons name="trash-outline" size={20} color={colors.textFaint} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, styles.dimmed]}>Hesabımı Sil</Text>
            <View style={styles.soonBadge}><Text style={styles.soonText}>Yakında</Text></View>
          </View>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.row} onPress={handleCikis} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { color: colors.error }]}>Çıkış Yap</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
