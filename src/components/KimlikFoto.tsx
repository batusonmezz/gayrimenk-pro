import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../storage/supabaseClient';
import { useTheme } from '../theme';

interface Props {
  label: string;
  onFotoSecildi: (on: string, arka: string) => void;
  initialOn?: string;
  initialArka?: string;
}

export default function KimlikFoto({ label, onFotoSecildi, initialOn, initialArka }: Props) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);

  const [on, setOn] = useState(initialOn ?? '');
  const [arka, setArka] = useState(initialArka ?? '');
  const [yukleniyor, setYukleniyor] = useState(false);

  // Ref'ler stale closure'u önler: async işlem biterken en güncel değerleri okur
  const onRef = useRef(initialOn ?? '');
  const arkaRef = useRef(initialArka ?? '');

  // edit modu / mal sahibi picker sonrası dışarıdan gelen değerleri al (asla boşla ezme)
  useEffect(() => {
    if (!initialOn) return;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}/.test(initialOn)) {
      (async () => {
        const { data: blob } = await supabase.storage.from('kimlik-belgeleri').download(initialOn);
        if (!blob) return;
        const b64 = await new Promise<string>((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res((reader.result as string).split(',')[1]);
          reader.onerror = rej;
          reader.readAsDataURL(blob);
        });
        onRef.current = b64; setOn(b64);
      })();
    } else {
      onRef.current = initialOn; setOn(initialOn);
    }
  }, [initialOn]);

  useEffect(() => {
    if (!initialArka) return;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}/.test(initialArka)) {
      (async () => {
        const { data: blob } = await supabase.storage.from('kimlik-belgeleri').download(initialArka);
        if (!blob) return;
        const b64 = await new Promise<string>((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res((reader.result as string).split(',')[1]);
          reader.onerror = rej;
          reader.readAsDataURL(blob);
        });
        arkaRef.current = b64; setArka(b64);
      })();
    } else {
      arkaRef.current = initialArka; setArka(initialArka);
    }
  }, [initialArka]);

  const secFoto = useCallback(async (taraf: 'on' | 'arka') => {
    setYukleniyor(true);
    try {
      const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!izin.granted) {
        Alert.alert('İzin gerekli', 'Fotoğraf seçmek için galeri izni gerekli.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true,
        exif: false,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
      });
      if (!result.canceled && result.assets[0].base64) {
        const base64 = result.assets[0].base64;
        if (taraf === 'on') {
          onRef.current = base64;
          setOn(base64);
          onFotoSecildi(base64, arkaRef.current);
        } else {
          arkaRef.current = base64;
          setArka(base64);
          onFotoSecildi(onRef.current, base64);
        }
      }
    } finally {
      setYukleniyor(false);
    }
  }, [onFotoSecildi]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.fotoBtn, yukleniyor && styles.fotoBtnDisabled]}
          onPress={() => secFoto('on')}
          disabled={yukleniyor}
        >
          {on ? (
            <Image source={{ uri: `data:image/jpeg;base64,${on}` }} style={styles.foto} />
          ) : (
            <Text style={styles.fotoBtnText}>{yukleniyor ? 'Yükleniyor...' : '📷 Ön Yüz'}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fotoBtn, yukleniyor && styles.fotoBtnDisabled]}
          onPress={() => secFoto('arka')}
          disabled={yukleniyor}
        >
          {arka ? (
            <Image source={{ uri: `data:image/jpeg;base64,${arka}` }} style={styles.foto} />
          ) : (
            <Text style={styles.fotoBtnText}>{yukleniyor ? 'Yükleniyor...' : '📷 Arka Yüz'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) => StyleSheet.create({
  container: { padding: 12, borderBottomWidth: 0.5, borderBottomColor: colors.borderLight },
  label: { fontSize: 11, color: colors.textMuted, fontWeight: '500', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  fotoBtn: { flex: 1, height: 80, backgroundColor: colors.background, borderRadius: 8, borderWidth: 0.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  fotoBtnDisabled: { opacity: 0.5 },
  fotoBtnText: { fontSize: 12, color: colors.textMuted },
  foto: { width: '100%', height: '100%', borderRadius: 8 },
});
