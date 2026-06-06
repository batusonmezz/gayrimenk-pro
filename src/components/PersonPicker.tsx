import { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '../storage/supabaseClient';

type PersonRow = {
  id: string;
  ad_soyad: string;
  tc_kimlik: string | null;
  telefon: string | null;
  adres: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (person: PersonRow) => void;
};

export default function PersonPicker({ visible, onClose, onSelect }: Props) {
  const [persons, setPersons] = useState<PersonRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('persons')
          .select('id, ad_soyad, tc_kimlik, telefon, adres')
          .order('ad_soyad');
        if (!cancelled) setPersons((data ?? []) as PersonRow[]);
      } catch {
        // yüklenemedi — boş liste göster
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [visible]);

  const q = query.toLowerCase();
  const filtered = q
    ? persons.filter(
        p =>
          p.ad_soyad.toLowerCase().includes(q) ||
          (p.tc_kimlik ?? '').includes(q)
      )
    : persons;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>Kayıtlı Kiracı Seç</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={s.searchRow}>
          <TextInput
            style={s.searchInput}
            placeholder="Ad veya TC ile ara..."
            placeholderTextColor="#aaa"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#1a2e1a" />
        ) : filtered.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>Henüz kayıtlı kişi yok</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.row}
                onPress={() => { onSelect(item); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={s.name}>{item.ad_soyad}</Text>
                {item.telefon ? <Text style={s.sub}>{item.telefon}</Text> : null}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={s.sep} />}
          />
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0' },
  header: { backgroundColor: '#1a2e1a', paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, fontSize: 16, fontWeight: '500', color: '#fff' },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  searchRow: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#e0e0e0' },
  searchInput: { backgroundColor: '#f5f5f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#1a1a1a' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 14, color: '#888' },
  row: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14 },
  name: { fontSize: 15, fontWeight: '500', color: '#1a1a1a' },
  sub: { fontSize: 12, color: '#888', marginTop: 2 },
  sep: { height: 0.5, backgroundColor: '#e0e0e0', marginHorizontal: 16 },
});
