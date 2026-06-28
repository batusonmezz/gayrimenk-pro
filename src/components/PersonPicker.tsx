import { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '../storage/supabaseClient';
import { useTheme } from '../theme';

type PersonRow = {
  id: string;
  ad_soyad: string;
  tc_kimlik: string | null;
  telefon: string | null;
  adres: string | null;
  odeme_bilgisi?: string | null;
  kimlik_foto_url?: string | null;
  kimlik_foto_arka_url?: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (person: PersonRow) => void;
};

export default function PersonPicker({ visible, onClose, onSelect }: Props) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);

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
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Kayıtlı Kişi Seç</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Ad veya TC ile ara..."
            placeholderTextColor={colors.placeholder}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={isDark ? colors.primaryAccent : colors.primary} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Henüz kayıtlı kişi yok</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.row}
                onPress={async () => {
                  // Seçim anında foto + banka bilgisini ayrı sorguyla çek (liste MB'larca base64 yüklemesin)
                  try {
                    const { data: extra } = await supabase
                      .from('persons')
                      .select('odeme_bilgisi, kimlik_foto_url, kimlik_foto_arka_url')
                      .eq('id', item.id)
                      .single();
                    const resolved = { ...(extra ?? {}) };
                    const isPath = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}/.test(s);
                    const dlBase64 = async (path: string): Promise<string | null> => {
                      const { data: blob } = await supabase.storage.from('kimlik-belgeleri').download(path);
                      if (!blob) return null;
                      return new Promise((res, rej) => {
                        const reader = new FileReader();
                        reader.onload = () => res((reader.result as string).split(',')[1]);
                        reader.onerror = rej;
                        reader.readAsDataURL(blob);
                      });
                    };
                    if (resolved.kimlik_foto_url && isPath(resolved.kimlik_foto_url)) {
                      resolved.kimlik_foto_url = await dlBase64(resolved.kimlik_foto_url) ?? resolved.kimlik_foto_url;
                    }
                    if (resolved.kimlik_foto_arka_url && isPath(resolved.kimlik_foto_arka_url)) {
                      resolved.kimlik_foto_arka_url = await dlBase64(resolved.kimlik_foto_arka_url) ?? resolved.kimlik_foto_arka_url;
                    }
                    onSelect({ ...item, ...resolved });
                  } catch {
                    onSelect(item);
                  }
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.name}>{item.ad_soyad}</Text>
                {item.telefon ? <Text style={styles.sub}>{item.telefon}</Text> : null}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
          />
        )}
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: isDark ? colors.primaryAccent : colors.primary, paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, fontSize: 16, fontWeight: '500', color: colors.textOnPrimary },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  searchRow: { backgroundColor: colors.surface, padding: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  searchInput: { backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: colors.text },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 14, color: colors.textMuted },
  row: { backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 14 },
  name: { fontSize: 15, fontWeight: '500', color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  sep: { height: 0.5, backgroundColor: colors.border, marginHorizontal: 16 },
});
