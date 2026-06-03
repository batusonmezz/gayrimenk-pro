import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { signOut, getCurrentUser } from '../services/auth';
import { getRole, getEmail } from '../services/authState';

const CONTRACT_TYPES = [
  { id: 'kira', title: 'Kira Sözleşmesi', desc: 'Konut ve işyeri kiralamalar', icon: '🏠', enabled: true },
  { id: 'satis', title: 'Satış Vaadi', desc: 'Gayrimenkul satış vaadi sözleşmesi', icon: '📋', enabled: false },
  { id: 'komisyon', title: 'Komisyon Sözleşmesi', desc: 'Aracılık ve komisyon anlaşmaları', icon: '🤝', enabled: false },
  { id: 'vekaletname', title: 'Vekaletname', desc: 'Temsil ve yetki belgeleri', icon: '📜', enabled: false },
];

function roleTurkce(role: string | null): string {
  if (role === 'mal_sahibi') return 'Mal Sahibi';
  if (role === 'kiraci') return 'Kiracı';
  return 'Emlakçı';
}

export default function HomeScreen({ navigation }: any) {
  const [email, setEmailState] = useState<string | null>(null);
  const [role, setRoleState] = useState<string | null>(null);
  const isEmlakci = role === 'emlakci';
  const isMalSahibiVeyaEmlakci = role === 'emlakci' || role === 'mal_sahibi';

  useEffect(() => {
    const cachedEmail = getEmail();
    const cachedRole = getRole();
    if (cachedEmail) {
      setEmailState(cachedEmail);
      setRoleState(cachedRole);
    } else {
      // App restart: INITIAL_SESSION handler henüz tamamlanmamış olabilir
      getCurrentUser().then(u => {
        setEmailState(u?.user.email ?? null);
        setRoleState(u?.role ?? null);
      });
    }
  }, []);

  const handleCikis = async () => {
    try {
      await signOut();
    } catch {
      // App.tsx listener yine de Login'e atar
    }
  };

  return (
    <View style={[styles.container, {height: '100%' as any, flex: 1}]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.brand}>GAYRİMENK PRO</Text>
          <TouchableOpacity onPress={handleCikis} style={styles.cikisBtn}>
            <Text style={styles.cikisText}>Çıkış</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userEmail}>{email ?? ''}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{roleTurkce(role)}</Text>
          </View>
        </View>
        <Text style={styles.title}>Sözleşmeler</Text>
      </View>
      <ScrollView style={{flex: 1, padding: 16}} contentContainerStyle={{paddingBottom: 80}} scrollEnabled={true} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0', overflow: 'auto' as any },
  header: { backgroundColor: '#1a2e1a', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  brand: { color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 2, marginBottom: 4 },
  title: { color: '#fff', fontSize: 24, fontWeight: '500' },
  content: { flex: 1, padding: 16 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.5, color: '#888', marginVertical: 12, fontWeight: '500' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 0.5, borderColor: '#e0e0e0' },
  cardIcon: { fontSize: 24, marginRight: 12 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '500', color: '#1a1a1a', marginBottom: 2 },
  cardDesc: { fontSize: 12, color: '#888' },
  cardArrow: { fontSize: 22, color: '#ccc' },
  researchBanner: { backgroundColor: '#1a2e1a', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 0 },
  researchIcon: { fontSize: 22, marginRight: 12 },
  researchTitle: { fontSize: 14, fontWeight: '500', color: '#fff', marginBottom: 2 },
  researchDesc: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  badge: { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  badgeText: { color: '#9fe1cb', fontSize: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cikisBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  cikisText: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  userInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 4 },
  userEmail: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  roleBadge: { backgroundColor: 'rgba(159,225,203,0.15)', borderWidth: 1, borderColor: 'rgba(159,225,203,0.35)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  roleBadgeText: { color: '#9fe1cb', fontSize: 11 },
});
