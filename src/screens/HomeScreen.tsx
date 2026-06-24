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

const CONTRACT_TYPES = [
  { id: 'kira', title: 'Kira Sözleşmesi', desc: 'Konut ve işyeri kiralamalar', icon: '🏠', enabled: true },
  { id: 'satis', title: 'Satış Vaadi', desc: 'Gayrimenkul satış vaadi sözleşmesi', icon: '📋', enabled: false },
  { id: 'komisyon', title: 'Komisyon Sözleşmesi', desc: 'Aracılık ve komisyon anlaşmaları', icon: '🤝', enabled: false },
  { id: 'vekaletname', title: 'Vekaletname', desc: 'Temsil ve yetki belgeleri', icon: '📜', enabled: false },
];

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

export default function HomeScreen({ navigation }: any) {
  const [email, setEmailState] = useState<string | null>(null);
  const [role, setRoleState] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const isEmlakci = role === 'emlakci';
  const isMalSahibiVeyaEmlakci = role === 'emlakci' || role === 'mal_sahibi';

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

  // Pull-to-refresh + Tekrar Dene — kullanıcı ekrandayken tetiklenir, guard gerekmez
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
        <Text style={styles.title}>Sözleşmeler</Text>
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
        {/* Dashboard istatistikleri */}
        <View style={styles.dashSection}>
          {renderDashboard()}
        </View>

        {/* Menü kısayolları — 3b'de kaldırılacak */}
        <View style={styles.menuSection}>
          {isEmlakci && (
            <>
              <Text style={styles.sectionLabel}>SÖZLEŞME TÜRÜ SEÇ</Text>
              {CONTRACT_TYPES.filter(c => c.enabled !== false).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.card}
                  onPress={() => navigation.navigate('Form', { type: item.id, title: item.title })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cardIcon}>{item.icon}</Text>
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardDesc}>{item.desc}</Text>
                  </View>
                  <Text style={styles.cardArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
          <Text style={styles.sectionLabel}>ARAÇLAR</Text>
          <TouchableOpacity
            style={styles.researchBanner}
            onPress={() => navigation.navigate('Research')}
            activeOpacity={0.8}
          >
            <Text style={styles.researchIcon}>🔍</Text>
            <View style={styles.cardText}>
              <Text style={styles.researchTitle}>Hukuk Araştırmacı</Text>
              <Text style={styles.researchDesc}>Güncel mevzuat ve içtihat taraması</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>İsteğe Bağlı</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.card, { marginTop: 8 }]}
            onPress={() => navigation.navigate('Kayitlar')}
            activeOpacity={0.7}
          >
            <Text style={styles.cardIcon}>🗂️</Text>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Kayıtlı Sözleşmeler</Text>
              <Text style={styles.cardDesc}>Geçmiş sözleşmeleri görüntüle ve düzenle</Text>
            </View>
            <Text style={styles.cardArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Liste')}
            activeOpacity={0.7}
          >
            <Text style={styles.cardIcon}>📊</Text>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Sözleşme Listesi</Text>
              <Text style={styles.cardDesc}>Excel benzeri tablo görünümü</Text>
            </View>
            <Text style={styles.cardArrow}>›</Text>
          </TouchableOpacity>
          {isMalSahibiVeyaEmlakci && (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('MalSahipleri')}
              activeOpacity={0.7}
            >
              <Text style={styles.cardIcon}>🏘️</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Mal Sahipleri</Text>
                <Text style={styles.cardDesc}>Mülk bazlı takip ve rapor</Text>
              </View>
              <Text style={styles.cardArrow}>›</Text>
            </TouchableOpacity>
          )}
          {isEmlakci && (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Siteler')}
              activeOpacity={0.7}
            >
              <Text style={styles.cardIcon}>🏗️</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Siteler / Mülkler</Text>
                <Text style={styles.cardDesc}>Emlak portföyü ve site yönetimi</Text>
              </View>
              <Text style={styles.cardArrow}>›</Text>
            </TouchableOpacity>
          )}
          {isEmlakci && (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Kisiler')}
              activeOpacity={0.7}
            >
              <Text style={styles.cardIcon}>👥</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Kişiler</Text>
                <Text style={styles.cardDesc}>Kiracı ve mal sahibi kişi yönetimi</Text>
              </View>
              <Text style={styles.cardArrow}>›</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Mevcut stiller (değiştirilmedi)
  container:      { flex: 1, backgroundColor: '#f5f5f0', overflow: 'auto' as any },
  header:         { backgroundColor: '#1a2e1a', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  brand:          { color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 2, marginBottom: 4 },
  title:          { color: '#fff', fontSize: 24, fontWeight: '500' },
  sectionLabel:   { fontSize: 11, letterSpacing: 1.5, color: '#888', marginVertical: 12, fontWeight: '500' },
  card:           { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 0.5, borderColor: '#e0e0e0' },
  cardIcon:       { fontSize: 24, marginRight: 12 },
  cardText:       { flex: 1 },
  cardTitle:      { fontSize: 15, fontWeight: '500', color: '#1a1a1a', marginBottom: 2 },
  cardDesc:       { fontSize: 12, color: '#888' },
  cardArrow:      { fontSize: 22, color: '#ccc' },
  researchBanner: { backgroundColor: '#1a2e1a', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 0 },
  researchIcon:   { fontSize: 22, marginRight: 12 },
  researchTitle:  { fontSize: 14, fontWeight: '500', color: '#fff', marginBottom: 2 },
  researchDesc:   { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  badge:          { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  badgeText:      { color: '#9fe1cb', fontSize: 10 },
  headerTop:      { flexDirection: 'row', alignItems: 'center' },
  userInfo:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 4 },
  userEmail:      { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  roleBadge:      { backgroundColor: 'rgba(159,225,203,0.15)', borderWidth: 1, borderColor: 'rgba(159,225,203,0.35)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  roleBadgeText:  { color: '#9fe1cb', fontSize: 11 },

  // Dashboard
  dashSection:    { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  menuSection:    { paddingHorizontal: 16, paddingBottom: 8 },
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
