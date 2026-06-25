import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser } from '../services/auth';
import { getRole, getEmail } from '../services/authState';
import { roleLabel } from '../utils/roleLabel';
import { supabase } from '../storage/supabaseClient';
import { colors } from '../theme';

const KISA_AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const tl = (k: number | null) =>
  `${Math.round((k || 0) / 100).toLocaleString('tr-TR')} ₺`;

const formatVade = (tarih: string) => {
  const parts = tarih.split('-');
  return `${parseInt(parts[2])} ${KISA_AYLAR[parseInt(parts[1]) - 1]}`;
};

function StatKart({ icon, iconColor, rakam, etiket, bgColor }: {
  icon: string;
  iconColor?: string;
  rakam: string;
  etiket: string;
  bgColor?: string;
}) {
  return (
    <View style={[
      styles.statKart,
      bgColor ? { backgroundColor: bgColor, borderColor: bgColor } : undefined,
    ]}>
      <Ionicons
        name={icon as any}
        size={18}
        color={iconColor ?? colors.textMuted}
        style={styles.statIkon}
      />
      <Text style={[styles.statRakam, iconColor ? { color: iconColor } : undefined]}>
        {rakam}
      </Text>
      <Text style={styles.statEtiket}>{etiket}</Text>
    </View>
  );
}

function YaklasanList({ yaklasan }: { yaklasan: any[] | null }) {
  return (
    <View style={styles.yaklasanBolum}>
      <Text style={styles.sectionLabel}>YAKLASAN ÖDEMELER (7 GÜN)</Text>
      {yaklasan && yaklasan.length > 0 ? (
        yaklasan.map((p: any) => (
          <View key={p.payment_id} style={styles.yaklasanSatir}>
            <View style={{ flex: 1 }}>
              <Text style={styles.yaklasanAd}>{p.kiraci_ad}</Text>
              <Text style={styles.yaklasanVade}>
                {p.vade_tarihi ? formatVade(p.vade_tarihi) : '—'}
              </Text>
            </View>
            <Text style={styles.yaklasanTutar}>{tl(p.tutar_kurus)}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.boshMetin}>Önümüzdeki 7 günde ödeme yok</Text>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const [email, setEmailState] = useState<string | null>(null);
  const [role, setRoleState] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const cachedEmail = getEmail();
    const cachedRole = getRole();
    if (cachedEmail) {
      setEmailState(cachedEmail);
      setRoleState(cachedRole);
    } else {
      getCurrentUser().then(u => {
        setEmailState(u?.user.email ?? null);
        setRoleState(u?.role ?? null);
      });
    }
  }, []);

  // Tab focus'ta otomatik yenileme — active guard ile unmount/blur sonrası setState engellenir
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setStatsLoading(true);
      setStats(null);
      setStatsError(null);
      (async () => {
        try {
          const { data, error } = await supabase.rpc('get_dashboard_stats');
          if (!active) return;
          if (error) throw error;
          setStats(data);
        } catch (e: any) {
          if (active) setStatsError(e.message ?? 'İstatistikler yüklenemedi.');
        } finally {
          if (active) setStatsLoading(false);
        }
      })();
      return () => { active = false; };
    }, [])
  );

  // Pull-to-refresh + Tekrar Dene
  const handleRefresh = async () => {
    setRefreshing(true);
    setStatsError(null);
    try {
      const { data, error } = await supabase.rpc('get_dashboard_stats');
      if (error) throw error;
      setStats(data);
    } catch (e: any) {
      setStatsError(e.message ?? 'İstatistikler yüklenemedi.');
    } finally {
      setRefreshing(false);
    }
  };

  const renderDashboard = () => {
    if (statsLoading) {
      return (
        <View style={styles.yukleniyorBox}>
          <ActivityIndicator size="large" color={colors.primaryAccent} />
        </View>
      );
    }
    if (statsError) {
      return (
        <View style={styles.hataBox}>
          <Text style={styles.hataMesaji}>{statsError}</Text>
          <TouchableOpacity style={styles.tekrarBtn} onPress={handleRefresh} activeOpacity={0.7}>
            <Text style={styles.tekrarBtnText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (!stats) return null;

    if (stats.role === 'emlakci') {
      return (
        <>
          <View style={styles.kartSatir}>
            <StatKart
              icon="cash-outline"
              iconColor={colors.success}
              rakam={tl(stats.bu_ay_tahsil)}
              etiket="Bu Ay Tahsil"
              bgColor={colors.successSurface}
            />
            <StatKart
              icon="time-outline"
              rakam={tl(stats.bu_ay_bekleyen)}
              etiket="Bu Ay Bekleyen"
            />
          </View>
          <View style={styles.kartSatir}>
            <StatKart
              icon="document-attach-outline"
              rakam={String(stats.onay_bekleyen_adet)}
              etiket="Onay Bekleyen"
            />
            <StatKart
              icon="document-text-outline"
              rakam={String(stats.toplam_sozlesme)}
              etiket="Toplam Sözleşme"
            />
          </View>
          <View style={styles.kartSatir}>
            <StatKart
              icon="alert-circle"
              iconColor={colors.error}
              rakam={`${tl(stats.geciken_tutar)} · ${stats.geciken_adet} adet`}
              etiket="Geciken Ödemeler"
              bgColor={colors.errorSurface}
            />
          </View>
          <YaklasanList yaklasan={stats.yaklasan} />
        </>
      );
    }

    if (stats.role === 'mal_sahibi') {
      return (
        <>
          <View style={styles.kartSatir}>
            <StatKart
              icon="cash-outline"
              rakam={tl(stats.bu_ay_alacagi)}
              etiket="Bu Ay Alacağı"
            />
            <StatKart
              icon="checkmark-circle"
              iconColor={colors.success}
              rakam={tl(stats.bu_ay_tahsil)}
              etiket="Bu Ay Tahsil"
              bgColor={colors.successSurface}
            />
          </View>
          <View style={styles.kartSatir}>
            <StatKart
              icon="document-attach-outline"
              rakam={String(stats.onay_bekleyen_adet)}
              etiket="Onay Bekleyen"
            />
          </View>
          <View style={styles.kartSatir}>
            <StatKart
              icon="alert-circle"
              iconColor={colors.error}
              rakam={`${tl(stats.geciken_tutar)} · ${stats.geciken_adet} adet`}
              etiket="Geciken Ödemeler"
              bgColor={colors.errorSurface}
            />
          </View>
          <YaklasanList yaklasan={stats.yaklasan} />
        </>
      );
    }

    if (stats.role === 'kiraci') {
      return (
        <>
          <View style={styles.kartSatir}>
            <View style={[styles.statKart, { paddingVertical: 20 }]}>
              <Ionicons
                name="calendar-outline"
                size={24}
                color={colors.primaryAccent}
                style={styles.statIkon}
              />
              {stats.sonraki_odeme ? (
                <>
                  <Text style={[styles.statRakam, { fontSize: 26, color: colors.primaryAccent }]}>
                    {tl(stats.sonraki_odeme.tutar_kurus)}
                  </Text>
                  <Text style={styles.statEtiket}>
                    Sonraki Ödeme — {formatVade(stats.sonraki_odeme.vade_tarihi)}
                  </Text>
                </>
              ) : (
                <Text style={styles.statEtiket}>Yaklaşan ödeme yok</Text>
              )}
            </View>
          </View>
          <View style={styles.kartSatir}>
            <StatKart
              icon="cash-outline"
              iconColor={colors.success}
              rakam={tl(stats.yillik_odenen)}
              etiket="Toplam Ödenen"
              bgColor={colors.successSurface}
            />
            <StatKart
              icon="time-outline"
              rakam={tl(stats.yillik_kalan)}
              etiket="Kalan"
            />
          </View>
          {stats.geciken_adet > 0 && (
            <View style={styles.kartSatir}>
              <StatKart
                icon="alert-circle"
                iconColor={colors.error}
                rakam={`${tl(stats.geciken_tutar)} · ${stats.geciken_adet} adet`}
                etiket="Geciken Ödemeler"
                bgColor={colors.errorSurface}
              />
            </View>
          )}
          {stats.onay_bekleyen_adet > 0 && (
            <View style={styles.kartSatir}>
              <StatKart
                icon="document-attach-outline"
                rakam={String(stats.onay_bekleyen_adet)}
                etiket="Onay Bekleyen Dekont"
              />
            </View>
          )}
        </>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, { height: '100%' as any, flex: 1 }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.brand}>GAYRİMENK PRO</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userEmail}>{email ?? ''}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{roleLabel(role)}</Text>
          </View>
        </View>
        <Text style={styles.title}>Ana Sayfa</Text>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 80 }}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.dashSection}>
          {renderDashboard()}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f5f5f0', overflow: 'auto' as any },
  header:         { backgroundColor: '#1a2e1a', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  brand:          { color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 2, marginBottom: 4 },
  title:          { color: '#fff', fontSize: 24, fontWeight: '500' },
  sectionLabel:   { fontSize: 11, letterSpacing: 1.5, color: '#888', marginVertical: 12, fontWeight: '500' },
  headerTop:      { flexDirection: 'row', alignItems: 'center' },
  userInfo:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 4 },
  userEmail:      { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  roleBadge:      { backgroundColor: 'rgba(159,225,203,0.15)', borderWidth: 1, borderColor: 'rgba(159,225,203,0.35)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  roleBadgeText:  { color: '#9fe1cb', fontSize: 11 },

  // Dashboard
  dashSection:    { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  kartSatir:      { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statKart:       { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: colors.border },
  statIkon:       { marginBottom: 6 },
  statRakam:      { fontSize: 22, fontWeight: '600', color: colors.text, marginBottom: 2 },
  statEtiket:     { fontSize: 11, color: colors.textMuted },

  // Yaklaşan ödemeler
  yaklasanBolum:  { marginTop: 4 },
  yaklasanSatir:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.borderFaint },
  yaklasanAd:     { fontSize: 14, fontWeight: '500', color: colors.text },
  yaklasanVade:   { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  yaklasanTutar:  { fontSize: 15, fontWeight: '600', color: colors.text },

  // Loading / hata
  yukleniyorBox:  { paddingVertical: 32, alignItems: 'center' },
  hataBox:        { paddingVertical: 24, alignItems: 'center', paddingHorizontal: 16 },
  hataMesaji:     { fontSize: 14, color: colors.error, textAlign: 'center', marginBottom: 12 },
  tekrarBtn:      { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  tekrarBtnText:  { color: colors.textOnPrimary, fontSize: 14, fontWeight: '500' },
  boshMetin:      { fontSize: 13, color: colors.textFaint, textAlign: 'center', paddingVertical: 16 },
});
