import { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../storage/supabaseClient';

type Payment = {
  id: string;
  tip: string;
  donem: string | null;
  tutar_kurus: number | null;
  vade_tarihi: string | null;
  durum: string;
};

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function parseYerelTarih(str: string): Date {
  const parts = str.split('-');
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}

function formatDonem(donem: string): string {
  const parts = donem.split('-');
  return `${AYLAR[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
}

function formatTarih(tarih: string): string {
  const parts = tarih.split('-');
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function formatTL(kurus: number): string {
  const tl = Math.floor(kurus / 100);
  const krs = (kurus % 100).toString().padStart(2, '0');
  return `${tl.toLocaleString('tr-TR')},${krs} ₺`;
}

function hesaplaDepozitoDurum(durum: string): { label: string; renk: string } {
  if (durum === 'odendi')     return { label: 'Onaylandı',  renk: '#27ae60' };
  if (durum === 'reddedildi') return { label: 'Reddedildi', renk: '#7f8c8d' };
  return { label: 'Bekliyor', renk: '#f39c12' };
}

function hesaplaEtiket(p: Payment, bugun: Date): { label: string; renk: string } {
  if (p.durum === 'odendi') return { label: 'Ödendi', renk: '#27ae60' };
  if (p.durum === 'reddedildi') return { label: 'Reddedildi', renk: '#7f8c8d' };
  const vade = parseYerelTarih(p.vade_tarihi!);
  return vade < bugun ? { label: 'Gecikti', renk: '#e74c3c' } : { label: 'Bekliyor', renk: '#f39c12' };
}

export default function OdemeTakipScreen({ navigation, route }: any) {
  const { contractId, baslik } = route.params as { contractId: string; baslik: string };
  const [odemeler, setOdemeler] = useState<Payment[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const bugun = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const depozito = useMemo(
    () => odemeler.find(p => p.tip === 'depozito') ?? null,
    [odemeler]
  );
  const kiralar = useMemo(
    () => odemeler.filter(p => p.tip === 'kira'),
    [odemeler]
  );

  useFocusEffect(useCallback(() => {
    setYukleniyor(true);
    setHata(null);
    supabase
      .from('payments')
      .select('id, tip, donem, tutar_kurus, vade_tarihi, durum')
      .eq('contract_id', contractId)
      .order('donem', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          setHata('Ödemeler yüklenemedi.');
        } else {
          setOdemeler((data ?? []) as Payment[]);
        }
      })
      .finally(() => setYukleniyor(false));
  }, [contractId]));

  const ozet = useMemo(() => {
    let odendiSay = 0, bekliyorSay = 0, geciktiSay = 0;
    let odendiKurus = 0, toplamKurus = 0;

    for (const p of kiralar) {
      toplamKurus += p.tutar_kurus!;
      if (p.durum === 'odendi') {
        odendiSay++;
        odendiKurus += p.tutar_kurus!;
      } else if (p.durum === 'beklemede') {
        const vade = parseYerelTarih(p.vade_tarihi!);
        if (vade < bugun) {
          geciktiSay++;
        } else {
          bekliyorSay++;
        }
      }
      // reddedildi: toplamKurus'a dahil, rozet kümeleri dışında
    }

    return {
      odendiSay,
      bekliyorSay,
      geciktiSay,
      tahsilKurus: odendiKurus,
      kalanKurus: toplamKurus - odendiKurus,
    };
  }, [kiralar, bugun]);

  const renderItem = ({ item }: { item: Payment }) => {
    const { label, renk } = hesaplaEtiket(item, bugun);
    return (
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <Text style={styles.rowDonem}>{formatDonem(item.donem!)}</Text>
          <Text style={styles.rowVade}>Vade: {formatTarih(item.vade_tarihi!)}</Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={[styles.rowEtiket, { color: renk }]}>{label}</Text>
          <Text style={styles.rowTutar}>{formatTL(item.tutar_kurus!)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Ödeme Takibi</Text>
          {baslik ? <Text style={styles.headerSub} numberOfLines={1}>{baslik}</Text> : null}
        </View>
      </View>

      {yukleniyor ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f6e56" />
        </View>
      ) : hata ? (
        <View style={styles.center}>
          <Text style={styles.hataText}>{hata}</Text>
        </View>
      ) : odemeler.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.bosText}>Henüz ödeme planı yok</Text>
        </View>
      ) : (
        <>
          <View style={styles.ozetCard}>
            <View style={styles.ozetRow}>
              <View style={styles.ozetItem}>
                <Text style={styles.ozetLabel}>TAHSİL EDİLEN</Text>
                <Text style={[styles.ozetTutar, { color: '#27ae60' }]}>{formatTL(ozet.tahsilKurus)}</Text>
              </View>
              <View style={styles.ozetDivider} />
              <View style={styles.ozetItem}>
                <Text style={styles.ozetLabel}>KALAN</Text>
                <Text style={[styles.ozetTutar, { color: ozet.kalanKurus > 0 ? '#e74c3c' : '#27ae60' }]}>
                  {formatTL(ozet.kalanKurus)}
                </Text>
              </View>
            </View>
            <View style={styles.ozetSep} />
            <View style={styles.ozetBadgeRow}>
              <View style={[styles.badge, { backgroundColor: '#e8f8f0' }]}>
                <Text style={[styles.badgeNum, { color: '#27ae60' }]}>{ozet.odendiSay}</Text>
                <Text style={[styles.badgeLabel, { color: '#27ae60' }]}>Ödendi</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: '#fef9e7' }]}>
                <Text style={[styles.badgeNum, { color: '#f39c12' }]}>{ozet.bekliyorSay}</Text>
                <Text style={[styles.badgeLabel, { color: '#f39c12' }]}>Bekliyor</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: '#fdf0f0' }]}>
                <Text style={[styles.badgeNum, { color: '#e74c3c' }]}>{ozet.geciktiSay}</Text>
                <Text style={[styles.badgeLabel, { color: '#e74c3c' }]}>Gecikti</Text>
              </View>
            </View>
          </View>

          <FlatList
            data={kiralar}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            ListHeaderComponent={() => {
              if (!depozito) return null;
              const { label, renk } = hesaplaDepozitoDurum(depozito.durum);
              return (
                <View style={styles.depozitRow}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.depozitLabel}>Depozito</Text>
                    <Text style={styles.depozitAlt}>Detay sözleşmede</Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={[styles.rowEtiket, { color: renk }]}>{label}</Text>
                  </View>
                </View>
              );
            }}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={true}
            style={{ flex: 1 }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0' },
  header: { backgroundColor: '#1a2e1a', paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, color: '#fff', lineHeight: 32 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '500', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hataText: { fontSize: 14, color: '#e74c3c' },
  bosText: { fontSize: 14, color: '#888' },
  ozetCard: { backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: '#e0e0e0' },
  ozetRow: { flexDirection: 'row', alignItems: 'center' },
  ozetItem: { flex: 1, alignItems: 'center', gap: 4 },
  ozetLabel: { fontSize: 10, color: '#aaa', fontWeight: '600', letterSpacing: 0.5 },
  ozetTutar: { fontSize: 16, fontWeight: '700' },
  ozetDivider: { width: 1, height: 40, backgroundColor: '#f0f0f0' },
  ozetSep: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 10 },
  ozetBadgeRow: { flexDirection: 'row', gap: 6 },
  badge: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  badgeNum: { fontSize: 20, fontWeight: '700' },
  badgeLabel: { fontSize: 10, fontWeight: '600', marginTop: 1, letterSpacing: 0.3 },
  list: { paddingHorizontal: 12, paddingBottom: 24 },
  row: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 6, flexDirection: 'row', alignItems: 'center', borderWidth: 0.5, borderColor: '#e8e8e8' },
  rowLeft: { flex: 1, gap: 4 },
  rowDonem: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  rowVade: { fontSize: 11, color: '#aaa' },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  rowEtiket: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  rowTutar: { fontSize: 14, fontWeight: '500', color: '#333' },
  depozitRow: { backgroundColor: '#eef4ff', borderRadius: 10, padding: 12, marginBottom: 6, flexDirection: 'row', alignItems: 'center', borderWidth: 0.5, borderColor: '#b3cdf5' },
  depozitLabel: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  depozitAlt: { fontSize: 11, color: '#aaa' },
});
